import { Injectable, inject, Injector, runInInjectionContext } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import {
  Firestore, addDoc, collection, collectionData, doc, docData, orderBy, query, serverTimestamp, where,
} from '@angular/fire/firestore';
import { map, Observable, of, switchMap } from 'rxjs';
import { AssessmentChoice, AssessmentQuestion, AssessmentType, ProgramAssessment, SimulationQuestionMode, UserAssessmentAttempt } from '../../program.models';

@Injectable({ providedIn: 'root' })
export class LearnerAssessmentsService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(Auth);
  private readonly injector = inject(Injector);

  private inContext<T>(factory: () => T): T {
    return runInInjectionContext(this.injector, factory);
  }

  getAssessments(programId: string): Observable<ProgramAssessment[]> {
    if (!programId) return of([]);
    const ref = collection(this.firestore, `programs/${programId}/assessments`);
    const q = query(ref, where('active', '==', true), orderBy('moduleId', 'asc'));
    return this.inContext(() => collectionData(q, { idField: 'id' }) as Observable<ProgramAssessment[]>).pipe(
      map((items) => items.map((item) => this.normalizeAssessment(item as unknown)))
    );
  }

  getAssessment(programId: string, assessmentId: string): Observable<ProgramAssessment | undefined> {
    if (!programId || !assessmentId) return of(undefined);
    const ref = doc(this.firestore, `programs/${programId}/assessments/${assessmentId}`);
    return this.inContext(() => docData(ref, { idField: 'id' }) as Observable<ProgramAssessment | undefined>).pipe(
      map((item) => (item ? this.normalizeAssessment(item as unknown) : undefined))
    );
  }

  getMyAttempts(programId: string): Observable<UserAssessmentAttempt[]> {
    return this.inContext(() => authState(this.auth)).pipe(
      switchMap((user) => {
        if (!user?.uid || !programId) return of([]);
        const ref = collection(this.firestore, `users/${user.uid}/assessmentAttempts`);
        const q = query(ref, where('programId', '==', programId));
        return this.inContext(() => collectionData(q, { idField: 'id' }) as Observable<UserAssessmentAttempt[]>);
      })
    );
  }

  async submitAttempt(attempt: Omit<UserAssessmentAttempt, 'id'>): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) return;
    const ref = collection(this.firestore, `users/${user.uid}/assessmentAttempts`);
    await addDoc(ref, { ...attempt, completedAt: serverTimestamp() });
  }

  private normalizeAssessment(item: unknown): ProgramAssessment {
    const data = this.asRecord(item);
    const questions = Array.isArray(data['questions']) && data['questions'].length
      ? data['questions'].map((question, index) => this.normalizeQuestion(this.asRecord(question), index))
      : this.generateQuestions(Number(data['questionCount'] || 0));

    return {
      ...(data as Partial<ProgramAssessment>),
      type: this.normalizeType(data['type'], data['assessmentType']),
      assessmentType: this.normalizeType(data['assessmentType'], data['type']),
      questionCount: questions.length,
      questions,
    } as ProgramAssessment;
  }

  private generateQuestions(questionCount: number): AssessmentQuestion[] {
    return Array.from({ length: Math.max(questionCount, 0) }, (_, index) => ({
      id: `q${index + 1}`,
      prompt: `Question ${index + 1}`,
      mode: SimulationQuestionMode.SINGLE,
      choices: [],
    }));
  }

  private normalizeQuestion(question: Record<string, unknown>, index: number): AssessmentQuestion {
    const choices = Array.isArray(question['choices'])
      ? question['choices'].map((choice, choiceIndex) => this.normalizeChoice(this.asRecord(choice), choiceIndex))
      : [];

    return {
      id: String(question['id'] || `q${index + 1}`),
      prompt: String(question['prompt'] || `Question ${index + 1}`),
      mode: question['mode'] === SimulationQuestionMode.MULTI ? SimulationQuestionMode.MULTI : SimulationQuestionMode.SINGLE,
      choices,
    };
  }

  private normalizeChoice(choice: Record<string, unknown>, index: number): AssessmentChoice {
    return {
      id: String(choice['id'] || `c${index + 1}`),
      text: String(choice['text'] || `Choice ${index + 1}`),
      correct: choice['correct'] === true,
    };
  }

  private normalizeType(primary: unknown, secondary: unknown): AssessmentType {
    const value = String(primary || secondary || '').toUpperCase();
    switch (value) {
      case 'MOCK_EXAM':
        return AssessmentType.MOCK_EXAM;
      case 'READINESS_TEST':
        return AssessmentType.READINESS_TEST;
      case 'QUIZ':
      default:
        return AssessmentType.QUIZ;
    }
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  }
}
