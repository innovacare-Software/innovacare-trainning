/**
 * LearnerAssistantService
 *
 * Persistence + backend orchestration for the learner-area AI assistant.
 *
 * - One session per (user, contextKey). contextKey is derived from the
 *   current route context so opening the assistant on the same course
 *   resumes the same conversation.
 * - Messages live at /users/{uid}/assistantSessions/{sessionId}/messages.
 * - Generation is delegated to the `learnerAssistantChat` callable, which
 *   enforces auth + per-user daily token quota.
 *
 * SECURITY:
 *  - All Firestore writes are owner-scoped (uid).
 *  - The OpenAI key never leaves the backend.
 *  - The service never sends Firestore data the user does not own.
 */
import { Injectable, Injector, inject, runInInjectionContext, signal } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  FieldValue,
  Firestore,
  addDoc,
  collection,
  collectionData,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Observable, of } from 'rxjs';

export type AssistantDomain =
  | 'general'
  | 'nclex'
  | 'it'
  | 'language'
  | 'woundcare'
  | 'compliance';

export interface AssistantContext {
  domain?: AssistantDomain;
  programId?: string;
  programTitle?: string;
  courseId?: string;
  courseTitle?: string;
  lessonTitle?: string;
  locale?: 'en' | 'fr' | 'es';
  userName?: string;
}

export interface AssistantMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: any;
  model?: string;
  tokensIn?: number;
  tokensOut?: number;
}

export interface AssistantSession {
  id: string;
  contextKey: string;
  domain: AssistantDomain;
  title: string;
  createdAt?: any;
  updatedAt?: any;
  messageCount?: number;
}

interface LearnerAssistantChatResult {
  reply: string;
  model: string;
  latencyMs: number;
  tokensIn: number;
  tokensOut: number;
  estimatedCostUsd: number;
}

const MAX_HISTORY_FOR_PROVIDER = 20;

@Injectable({ providedIn: 'root' })
export class LearnerAssistantService {
  private auth = inject(Auth);
  private fs = inject(Firestore);
  private functions = inject(Functions);
  private injector = inject(Injector);

  /** Reactive flag toggled while the backend is producing a reply. */
  readonly sending = signal(false);
  readonly lastError = signal<string | null>(null);

  private inContext<T>(factory: () => T): T {
    return runInInjectionContext(this.injector, factory);
  }

  private requireUid(): string {
    const uid = this.auth.currentUser?.uid;
    if (!uid) throw new Error('Sign in required to use the assistant.');
    return uid;
  }

  /**
   * Compute the assistant entitlement for the current user from their
   * enrollments. Returns the list of allowed domains (always includes
   * "general" if any enrollment exists), or `null` if no active enrollment.
   * The same logic runs on the backend; this is just used to drive the UI.
   */
  async getEntitlement(): Promise<{ hasAccess: boolean; allowedDomains: AssistantDomain[] }> {
    const uid = this.requireUid();

    // 1) Legacy course enrollments under the user document.
    const enrCol = collection(this.fs, `users/${uid}/enrollments`);
    const enrSnap = await this.inContext(() => getDocs(enrCol));
    const courseIds = enrSnap.docs
      .map((d) => String(d.get('courseId') || d.id))
      .filter(Boolean)
      .slice(0, 30);

    // 2) Program enrollments from the top-level collection.
    const ACTIVE_STATUSES = ['approved', 'confirmed', 'active', 'completed'];
    const progQ = query(
      collection(this.fs, 'programEnrollments'),
      where('userId', '==', uid),
      where('status', 'in', ACTIVE_STATUSES),
    );
    const progSnap = await this.inContext(() => getDocs(progQ));
    const programIds = progSnap.docs
      .map((d) => String(d.get('programId') || ''))
      .filter(Boolean)
      .slice(0, 30);

    if (!courseIds.length && !programIds.length) {
      return { hasAccess: false, allowedDomains: [] };
    }

    const allowed = new Set<AssistantDomain>(['general']);

    // Pre-seed from program enrollment doc fields (no extra reads).
    for (const d of progSnap.docs) {
      const data: any = d.data() || {};
      const haystack = [
        String(data.programTitle || ''),
        String(data.category || ''),
      ].join(' ').toLowerCase();
      for (const dom of LearnerAssistantService.inferDomainsFromText(haystack)) allowed.add(dom);
    }

    await Promise.all([
      ...courseIds.map(async (cid) => {
        try {
          const c = await this.inContext(() => getDoc(doc(this.fs, `courses/${cid}`)));
          if (!c.exists()) return;
          const data: any = c.data() || {};
          const haystack = [
            String(data.title || ''),
            String(data.subtitle || ''),
            String(data.category || ''),
            ...(Array.isArray(data.tags) ? data.tags : []).map((t: any) => String(t)),
          ].join(' ').toLowerCase();
          for (const dom of LearnerAssistantService.inferDomainsFromText(haystack)) allowed.add(dom);
        } catch { /* ignore */ }
      }),
      ...programIds.map(async (pid) => {
        try {
          const p = await this.inContext(() => getDoc(doc(this.fs, `programs/${pid}`)));
          if (!p.exists()) return;
          const data: any = p.data() || {};
          const haystack = [
            String(data.title || ''),
            String(data.subtitle || ''),
            String(data.category || ''),
            ...(Array.isArray(data.tags) ? data.tags : []).map((t: any) => String(t)),
          ].join(' ').toLowerCase();
          for (const dom of LearnerAssistantService.inferDomainsFromText(haystack)) allowed.add(dom);
        } catch { /* ignore */ }
      }),
    ]);

    return { hasAccess: true, allowedDomains: Array.from(allowed) };
  }

  /** Mirror of the backend domain inference (kept in sync manually). */
  private static inferDomainsFromText(text: string): AssistantDomain[] {
    const out = new Set<AssistantDomain>();
    if (/\b(nclex|rn\b|lpn\b|nursing|nurse|pharmacology|med-surg|maternal|pediatric|nursing_prep|canada_nclex|dha|doh|prometric|haad)\b/.test(text)) out.add('nclex');
    if (/\b(devops|docker|kubernetes|linux|aws|azure|cloud|programming|software|github|ci\/cd|sre)\b/.test(text)) out.add('it');
    if (/\b(ielts|oet|tef|toefl|english|fran[cç]ais|spanish|espa[nñ]ol|language|langue)\b/.test(text)) out.add('language');
    if (/\b(wound|dressing|ulcer|pressure injury|debridement|ostomy)/.test(text)) out.add('woundcare');
    if (/\b(hipaa|osha|gdpr|compliance|policy|polic(y|ies)|regulation|audit)\b/.test(text)) out.add('compliance');
    return Array.from(out);
  }

  /** Stable id derived from context so the same place resumes the same chat. */
  contextKey(ctx: AssistantContext): string {
    const parts = [
      ctx.domain ?? 'general',
      ctx.courseId ? `c:${ctx.courseId}` : '',
      ctx.programId && !ctx.courseId ? `p:${ctx.programId}` : '',
    ].filter(Boolean);
    return parts.join('|') || 'general';
  }

  private sessionsCol(uid: string) {
    return collection(this.fs, `users/${uid}/assistantSessions`);
  }

  private messagesCol(uid: string, sessionId: string) {
    return collection(this.fs, `users/${uid}/assistantSessions/${sessionId}/messages`);
  }

  /** Find or create the session for a given context (deterministic id). */
  async ensureSession(ctx: AssistantContext): Promise<AssistantSession> {
    const uid = this.requireUid();
    const key = this.contextKey(ctx);
    // deterministic id: hash-like but readable & stable
    const sessionId = `s_${key}`.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
    const ref = doc(this.fs, `users/${uid}/assistantSessions/${sessionId}`);
    const snap = await this.inContext(() => getDoc(ref));
    if (snap.exists()) {
      return { id: sessionId, ...(snap.data() as Omit<AssistantSession, 'id'>) };
    }
    const title = this.deriveTitle(ctx);
    const data = {
      contextKey: key,
      domain: (ctx.domain ?? 'general') as AssistantDomain,
      title,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      messageCount: 0,
    };
    await this.inContext(() => setDoc(ref, data, { merge: true }));
    return { id: sessionId, ...data } as AssistantSession;
  }

  /** Live messages stream for a session. */
  watchMessages(sessionId: string): Observable<AssistantMessage[]> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return of([]);
    const q = query(
      this.messagesCol(uid, sessionId),
      orderBy('createdAt', 'asc'),
      limit(200),
    );
    return this.inContext(
      () => collectionData(q, { idField: 'id' }) as Observable<AssistantMessage[]>,
    );
  }

  /** List all sessions for the current user (most recent first). */
  watchSessions(): Observable<AssistantSession[]> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return of([] as AssistantSession[]);
    const q = query(
      this.sessionsCol(uid),
      orderBy('updatedAt', 'desc'),
      limit(50),
    );
    return this.inContext(
      () => collectionData(q, { idField: 'id' }) as Observable<AssistantSession[]>,
    );
  }

  /**
   * Send a user message: persist it, call the backend with recent history,
   * persist the assistant reply, and return both.
   */
  async sendMessage(args: {
    sessionId: string;
    text: string;
    context: AssistantContext;
    history: AssistantMessage[];
  }): Promise<{ user: AssistantMessage; assistant: AssistantMessage }> {
    const uid = this.requireUid();
    const text = args.text.trim();
    if (!text) throw new Error('Message is empty.');
    if (text.length > 4000) throw new Error('Message too long (max 4000 chars).');

    this.sending.set(true);
    this.lastError.set(null);

    try {
      // 1. persist user message
      const userMsg: AssistantMessage = {
        role: 'user',
        content: text,
        createdAt: serverTimestamp(),
      };
      const userRef = await this.inContext(
        () => addDoc(this.messagesCol(uid, args.sessionId), userMsg),
      );

      // 2. build provider history (cap to last N)
      const recent = args.history.slice(-MAX_HISTORY_FOR_PROVIDER);
      const providerMessages = [
        ...recent.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: text },
      ];

      // 3. call backend
      const callable = this.inContext(
        () => httpsCallable<
          { messages: { role: 'user' | 'assistant'; content: string }[]; context: AssistantContext },
          LearnerAssistantChatResult
        >(this.functions, 'learnerAssistantChat'),
      );

      const result = await callable({
        messages: providerMessages,
        context: args.context,
      });
      const data = result.data;
      if (!data?.reply) throw new Error('Empty response from assistant.');

      // 4. persist assistant message
      const assistantMsg: AssistantMessage = {
        role: 'assistant',
        content: data.reply,
        createdAt: serverTimestamp(),
        model: data.model,
        tokensIn: data.tokensIn,
        tokensOut: data.tokensOut,
      };
      const aRef = await this.inContext(
        () => addDoc(this.messagesCol(uid, args.sessionId), assistantMsg),
      );

      // 5. bump session metadata
      const sessionRef = doc(this.fs, `users/${uid}/assistantSessions/${args.sessionId}`);
      await this.inContext(() => setDoc(sessionRef, {
        updatedAt: serverTimestamp(),
        lastReplyAt: serverTimestamp(),
      }, { merge: true }));

      // 6. reflect AI activity in programProgress (fire-and-forget, non-blocking)
      if (args.context.programId) {
        this.recordAiActivityInProgress(uid, args.context.programId).catch(() => { /* ignore */ });
      }

      return {
        user: { ...userMsg, id: userRef.id },
        assistant: { ...assistantMsg, id: aRef.id },
      };
    } catch (e: any) {
      const msg = this.normalizeError(e);
      this.lastError.set(msg);
      throw new Error(msg);
    } finally {
      this.sending.set(false);
    }
  }

  /**
   * Writes AI activity into the existing programProgress document using
   * atomic increments so it integrates naturally with all existing metrics.
   * Adds ~2 study minutes per AI exchange and bumps the activity timestamp.
   */
  private async recordAiActivityInProgress(uid: string, programId: string): Promise<void> {
    const ref = doc(this.fs, `users/${uid}/programProgress/${programId}`);
    await this.inContext(() => setDoc(ref, {
      aiMessagesCount: increment(1) as unknown as number,
      totalStudyMinutes: increment(2) as unknown as number,
      aiLastUsedAt: serverTimestamp(),
      lastActivityAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    } as any, { merge: true }));
  }

  private normalizeError(err: any): string {
    const code = String(err?.code || '');
    const message = String(err?.message || '');
    if (code === 'functions/resource-exhausted' || /quota|rate/i.test(message)) {
      return 'You have reached the daily AI limit. Try again later.';
    }
    if (code === 'functions/unauthenticated') return 'Please sign in again.';
    if (code === 'functions/permission-denied') return 'AI provider authentication failed.';
    if (code === 'functions/failed-precondition') return 'Assistant is not configured. Contact support.';
    return message || 'The assistant is unavailable right now.';
  }

  private deriveTitle(ctx: AssistantContext): string {
    if (ctx.courseTitle) return ctx.courseTitle;
    if (ctx.programTitle) return ctx.programTitle;
    switch (ctx.domain) {
      case 'nclex': return 'NCLEX coach';
      case 'it': return 'IT / DevOps tutor';
      case 'language': return 'Language tutor';
      case 'woundcare': return 'Wound care educator';
      case 'compliance': return 'Compliance assistant';
      default: return 'Innovacare assistant';
    }
  }
}
