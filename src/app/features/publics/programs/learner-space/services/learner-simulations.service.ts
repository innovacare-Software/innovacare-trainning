import { Injectable, inject, Injector, runInInjectionContext } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import {
  Firestore, addDoc, collection, collectionData, doc, docData, orderBy, query, serverTimestamp, where,
} from '@angular/fire/firestore';
import { map, Observable, of, switchMap } from 'rxjs';
import { ProgramDifficulty, ProgramSimulation, SimulationChoice, SimulationQuestion, SimulationQuestionMode, SimulationType, UserSimulationAttempt } from '../../program.models';

@Injectable({ providedIn: 'root' })
export class LearnerSimulationsService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(Auth);
  private readonly injector = inject(Injector);

  private inContext<T>(factory: () => T): T {
    return runInInjectionContext(this.injector, factory);
  }

  getSimulations(programId: string): Observable<ProgramSimulation[]> {
    if (!programId) return of([]);
    const ref = collection(this.firestore, `programs/${programId}/simulations`);
    const q = query(ref, where('active', '==', true), orderBy('title', 'asc'));
    return this.inContext(() => collectionData(q, { idField: 'id' }) as Observable<ProgramSimulation[]>).pipe(
      map((items) => items.map((item) => this.normalizeSimulation(item as unknown)))
    );
  }

  getSimulation(programId: string, simulationId: string): Observable<ProgramSimulation | undefined> {
    if (!programId || !simulationId) return of(undefined);
    const ref = doc(this.firestore, `programs/${programId}/simulations/${simulationId}`);
    return this.inContext(() => docData(ref, { idField: 'id' }) as Observable<ProgramSimulation | undefined>).pipe(
      map((item) => (item ? this.normalizeSimulation(item as unknown) : undefined))
    );
  }

  getMyAttempts(programId: string): Observable<UserSimulationAttempt[]> {
    return this.inContext(() => authState(this.auth)).pipe(
      switchMap((user) => {
        if (!user?.uid || !programId) return of([]);
        const ref = collection(this.firestore, `users/${user.uid}/simulationAttempts`);
        const q = query(ref, where('programId', '==', programId));
        return this.inContext(() => collectionData(q, { idField: 'id' }) as Observable<UserSimulationAttempt[]>);
      })
    );
  }

  async submitAttempt(attempt: Omit<UserSimulationAttempt, 'id'>): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) return;
    const ref = collection(this.firestore, `users/${user.uid}/simulationAttempts`);
    await addDoc(ref, { ...attempt, completedAt: serverTimestamp() });
  }

  private normalizeSimulation(item: unknown): ProgramSimulation {
    const data = this.asRecord(item);
    const questions = Array.isArray(data['questions'])
      ? data['questions'].map((question, index) => this.normalizeQuestion(this.asRecord(question), index))
      : [];

    return {
      ...(data as Partial<ProgramSimulation>),
      type: this.normalizeType(data['type'], data['simulationType']),
      difficulty: this.normalizeDifficulty(data['difficulty']),
      questions,
      questionCount: questions.length > 0 ? questions.length : Number(data['questionCount'] || 0),
    } as ProgramSimulation;
  }

  private normalizeQuestion(question: Record<string, unknown>, index: number): SimulationQuestion {
    const choices = Array.isArray(question['choices'])
      ? (question['choices'] as Array<Record<string, unknown>>).map((choice, choiceIndex) => this.normalizeChoice(choice, choiceIndex))
      : [];

    return {
      id: String(question['id'] || `q${index + 1}`),
      prompt: String(question['prompt'] || `Question ${index + 1}`),
      mode: question['mode'] === SimulationQuestionMode.MULTI ? SimulationQuestionMode.MULTI : SimulationQuestionMode.SINGLE,
      choices,
    };
  }

  private normalizeChoice(choice: Record<string, unknown>, index: number): SimulationChoice {
    return {
      id: String(choice['id'] || `c${index + 1}`),
      text: String(choice['text'] || `Choice ${index + 1}`),
      correct: choice['correct'] === true,
    };
  }

  private normalizeType(typeValue: unknown, legacyTypeValue: unknown): SimulationType {
    const value = String(typeValue || legacyTypeValue || '').toUpperCase();
    switch (value) {
      case 'CBT':
      case 'COMPUTER_TEST':
        return SimulationType.COMPUTER_TEST;
      case 'READINESS_SIMULATION':
      case 'READINESS_EXAM':
        return SimulationType.READINESS_EXAM;
      case 'TIMED_SIMULATION':
      case 'TIMED_MOCK':
      default:
        return SimulationType.TIMED_MOCK;
    }
  }

  private normalizeDifficulty(value: unknown): ProgramDifficulty {
    switch (String(value || '').toUpperCase()) {
      case 'EASY':
        return ProgramDifficulty.EASY;
      case 'HARD':
        return ProgramDifficulty.HARD;
      case 'MEDIUM':
      default:
        return ProgramDifficulty.MEDIUM;
    }
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  }
}
