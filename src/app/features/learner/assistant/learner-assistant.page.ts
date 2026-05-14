import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';
import {
  AssistantContext,
  AssistantDomain,
  AssistantMessage,
  LearnerAssistantService,
} from './learner-assistant.service';

const DOMAIN_LABEL: Record<AssistantDomain, string> = {
  general: 'General assistant',
  nclex: 'NCLEX coach',
  it: 'IT / DevOps tutor',
  language: 'Language tutor',
  woundcare: 'Wound care educator',
  compliance: 'Compliance assistant',
};

const DOMAIN_HINTS: Record<AssistantDomain, string[]> = {
  general: [
    'Suggest a study plan for this week',
    'Summarize my last completed course',
    'How do I track my certifications?',
  ],
  nclex: [
    'Give me a 5-question NCLEX-style quiz on pharmacology',
    'Explain the steps to prioritize patients (ABC + Maslow)',
    'Difference between rapid and regular insulin?',
  ],
  it: [
    'Explain Docker volumes vs bind mounts',
    'Write a basic GitHub Actions workflow for Node.js',
    'Common Linux file permissions in 60 seconds',
  ],
  language: [
    'Practice IELTS Speaking Part 2 with me',
    'Correct this sentence: "She go to school yesterday"',
    'Give me 10 useful B2 phrases for job interviews',
  ],
  woundcare: [
    'Explain stages of pressure injuries',
    'When do you choose hydrocolloid vs alginate dressings?',
    'Educational scenario: post-op surgical site care',
  ],
  compliance: [
    'Summarize HIPAA minimum necessary rule',
    'OSHA bloodborne pathogen exposure steps',
    'Quick checklist before a HIPAA audit',
  ],
};

@Component({
  selector: 'app-learner-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './learner-assistant.page.html',
  styleUrl: './learner-assistant.page.css',
})
export class LearnerAssistantPage implements AfterViewChecked {
  private route = inject(ActivatedRoute);
  protected svc = inject(LearnerAssistantService);

  @ViewChild('scrollEnd') private scrollEnd?: ElementRef<HTMLDivElement>;

  /** Domain selected by the learner from the chip row. */
  private domainOverride = signal<AssistantDomain | null>(null);

  /** Context derived from query params (?domain=&courseTitle=&programTitle=&locale=). */
  private rawContext = toSignal(
    this.route.queryParamMap,
    { requireSync: true },
  );

  readonly context = computed<AssistantContext>(() => {
    const qp = this.rawContext();
    const fromQuery = (qp.get('domain') ?? '') as AssistantDomain | '';
    const allowed: AssistantDomain[] =
      ['general', 'nclex', 'it', 'language', 'woundcare', 'compliance'];
    let domain: AssistantDomain =
      this.domainOverride()
      ?? (allowed.includes(fromQuery as AssistantDomain) ? (fromQuery as AssistantDomain) : 'general');

    // Clamp to entitlement once loaded.
    const ent = this.entitlement();
    if (ent && ent.hasAccess && !ent.allowedDomains.includes(domain)) {
      domain = ent.allowedDomains.includes('general')
        ? 'general'
        : (ent.allowedDomains[0] ?? 'general');
    }

    const localeRaw = (qp.get('locale') ?? 'en') as 'en' | 'fr' | 'es';
    const locale: 'en' | 'fr' | 'es' =
      ['en', 'fr', 'es'].includes(localeRaw) ? localeRaw : 'en';
    return {
      domain,
      programId: qp.get('programId') || undefined,
      programTitle: qp.get('programTitle') || undefined,
      courseId: qp.get('courseId') || undefined,
      courseTitle: qp.get('courseTitle') || undefined,
      lessonTitle: qp.get('lessonTitle') || undefined,
      locale,
    };
  });

  readonly session = signal<{ id: string; title: string } | null>(null);

  /** Messages stream is rebuilt every time the active session changes. */
  readonly messages = toSignal<AssistantMessage[], AssistantMessage[]>(
    toObservable(this.session).pipe(
      switchMap((s) => (s ? this.svc.watchMessages(s.id) : of([] as AssistantMessage[]))),
    ),
    { initialValue: [] as AssistantMessage[] },
  );

  /** (Re)resolve the session whenever context (route or chip) changes. */
  private sessionEffect = effect(async () => {
    const ctx = this.context();
    const ent = this.entitlement();
    // Wait for entitlement to load and require access before opening a session.
    if (!ent || !ent.hasAccess) return;
    try {
      const s = await this.svc.ensureSession(ctx);
      const current = this.session();
      if (!current || current.id !== s.id) {
        this.session.set({ id: s.id, title: s.title });
      }
    } catch {
      /* surfaced via lastError */
    }
  }, { allowSignalWrites: true });

  draft = '';
  readonly suggestions = computed(() => DOMAIN_HINTS[this.context().domain ?? 'general']);
  readonly domainLabel = computed(() => DOMAIN_LABEL[this.context().domain ?? 'general']);

  private static readonly DOMAIN_ICONS: Record<AssistantDomain, string> = {
    general:    '✦',
    nclex:      '🏥',
    it:         '💻',
    language:   '🌐',
    woundcare:  '🩹',
    compliance: '📋',
  };

  domainIcon(id: AssistantDomain): string {
    return LearnerAssistantPage.DOMAIN_ICONS[id] ?? '✦';
  }

  /** Entitlement loaded once on init. null = loading, [] = no access. */
  readonly entitlement = signal<{ hasAccess: boolean; allowedDomains: AssistantDomain[] } | null>(null);

  private allDomains: { id: AssistantDomain; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'nclex', label: 'NCLEX' },
    { id: 'it', label: 'IT / DevOps' },
    { id: 'language', label: 'Language' },
    { id: 'woundcare', label: 'Wound care' },
    { id: 'compliance', label: 'Compliance' },
  ];

  /** Domains shown as chips: only those the learner is enrolled in. */
  readonly availableDomains = computed(() => {
    const ent = this.entitlement();
    if (!ent || !ent.hasAccess) return [];
    return this.allDomains.filter((d) => ent.allowedDomains.includes(d.id));
  });

  constructor() {
    // Load entitlement once.
    void this.svc.getEntitlement()
      .then((e) => this.entitlement.set(e))
      .catch(() => this.entitlement.set({ hasAccess: false, allowedDomains: [] }));
  }

  pickDomain(d: AssistantDomain): void {
    // Defensive: ignore picks for domains the user isn't entitled to.
    const ent = this.entitlement();
    if (ent && !ent.allowedDomains.includes(d)) return;
    this.domainOverride.set(d);
  }

  useSuggestion(text: string): void {
    this.draft = text;
  }

  async send(): Promise<void> {
    const text = this.draft.trim();
    const session = this.session();
    if (!text || !session || this.svc.sending()) return;
    const history = this.messages();
    this.draft = '';
    try {
      await this.svc.sendMessage({
        sessionId: session.id,
        text,
        context: this.context(),
        history,
      });
    } catch {
      // restore draft so the learner can retry without retyping
      this.draft = text;
    }
  }

  onKey(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void this.send();
    }
  }

  /** Plain-markdown → safe HTML (very small renderer: bold, code, line breaks). */
  renderMarkdown(text: string): string {
    const escape = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    let out = escape(text);
    // fenced code blocks
    out = out.replace(/```([\s\S]*?)```/g, (_m, code) =>
      `<pre><code>${code.replace(/^\n/, '')}</code></pre>`);
    // inline code
    out = out.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    // bold
    out = out.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    // bullets
    out = out.replace(/^\s*[-*]\s+(.+)$/gm, '<li>$1</li>');
    out = out.replace(/(<li>[\s\S]*?<\/li>)(?!\s*<li>)/g, '<ul>$1</ul>');
    // line breaks (not inside <pre>)
    out = out.replace(/\n/g, '<br>');
    return out;
  }

  trackByMessage(_i: number, m: AssistantMessage): string {
    return m.id ?? `${_i}`;
  }

  ngAfterViewChecked(): void {
    // auto-scroll to latest message
    const el = this.scrollEnd?.nativeElement;
    if (el) el.scrollIntoView();
  }
}
