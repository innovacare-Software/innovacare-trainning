import { Injectable, inject, Injector, runInInjectionContext } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import {
  Firestore, addDoc, collection, collectionData, doc, docData, orderBy, query, serverTimestamp, where,
} from '@angular/fire/firestore';
import { map, Observable, of, switchMap } from 'rxjs';
import { CaseStudyQuestion, CaseStudyScoringMode, ProgramCaseStudy, UserCaseStudyAttempt } from '../../program.models';

@Injectable({ providedIn: 'root' })
export class LearnerCaseStudiesService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(Auth);
  private readonly injector = inject(Injector);

  private inContext<T>(factory: () => T): T {
    return runInInjectionContext(this.injector, factory);
  }

  getCaseStudies(programId: string): Observable<ProgramCaseStudy[]> {
    if (!programId) return of([]);
    const ref = collection(this.firestore, `programs/${programId}/caseStudies`);
    const q = query(ref, where('active', '==', true), orderBy('title', 'asc'));
    return this.inContext(() => collectionData(q, { idField: 'id' }) as Observable<ProgramCaseStudy[]>).pipe(
      map((items) => items.map((item) => this.normalizeCaseStudy(item as unknown)))
    );
  }

  getCaseStudy(programId: string, caseStudyId: string): Observable<ProgramCaseStudy | undefined> {
    if (!programId || !caseStudyId) return of(undefined);
    const ref = doc(this.firestore, `programs/${programId}/caseStudies/${caseStudyId}`);
    return this.inContext(() => docData(ref, { idField: 'id' }) as Observable<ProgramCaseStudy | undefined>).pipe(
      map((item) => (item ? this.normalizeCaseStudy(item as unknown) : undefined))
    );
  }

  getMyAttempts(programId: string): Observable<UserCaseStudyAttempt[]> {
    return this.inContext(() => authState(this.auth)).pipe(
      switchMap((user) => {
        if (!user?.uid || !programId) return of([]);
        const ref = collection(this.firestore, `users/${user.uid}/caseStudyAttempts`);
        const q = query(ref, where('programId', '==', programId));
        return this.inContext(() => collectionData(q, { idField: 'id' }) as Observable<UserCaseStudyAttempt[]>);
      })
    );
  }

  async submitAttempt(attempt: Omit<UserCaseStudyAttempt, 'id'>): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) return;
    const ref = collection(this.firestore, `users/${user.uid}/caseStudyAttempts`);
    await addDoc(ref, { ...attempt, completedAt: serverTimestamp() });
  }

  private normalizeCaseStudy(item: unknown): ProgramCaseStudy {
    const data = this.asRecord(item);
    const prompts = Array.isArray(data['prompts']) ? data['prompts'] : [];
    const questions = Array.isArray(data['questions']) && data['questions'].length
      ? data['questions'].map((question, index) => this.normalizeQuestion(this.asRecord(question), index))
      : prompts.map((prompt, index) => this.toCaseStudyQuestion(String(prompt || ''), index));

    return {
      ...(data as Partial<ProgramCaseStudy>),
      scenario: String(data['scenario'] ?? ''),
      scoringMode: this.normalizeScoringMode(data['scoringMode']),
      prompts: prompts.length ? prompts.map((prompt) => String(prompt || '')) : questions.map((question) => question.prompt),
      questions,
    } as ProgramCaseStudy;
  }

  private toCaseStudyQuestion(prompt: string, index: number): CaseStudyQuestion {
    return {
      id: `q${index + 1}`,
      prompt,
      expectedKeywords: [],
      maxScore: 1,
    };
  }

  private normalizeQuestion(question: Record<string, unknown>, index: number): CaseStudyQuestion {
    const expectedKeywords = Array.isArray(question['expectedKeywords'])
      ? question['expectedKeywords'].map((keyword) => String(keyword || '').trim()).filter(Boolean)
      : [];

    return {
      id: `q${index + 1}`,
      prompt: String(question['prompt'] || `Question ${index + 1}`),
      expectedKeywords,
      maxScore: Math.max(Number(question['maxScore'] || 1), 1),
    };
  }

  private normalizeScoringMode(value: unknown): CaseStudyScoringMode {
    switch (String(value || '').toUpperCase()) {
      case 'AUTO':
        return CaseStudyScoringMode.AUTO;
      case 'HYBRID':
        return CaseStudyScoringMode.HYBRID;
      case 'MANUAL':
      default:
        return CaseStudyScoringMode.MANUAL;
    }
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  }
}
