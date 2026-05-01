import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
} from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import {
  ProgramContentCaseStudy,
  CreateCaseStudyPayload,
  CaseStudyQuestionInput,
  CaseStudyScoringMode,
} from '../models/content-builder.models';

@Injectable({ providedIn: 'root' })
export class ProgramCaseStudiesAdminService {
  private db = inject(Firestore);

  private col(programId: string) {
    return collection(this.db, `programs/${programId}/caseStudies`);
  }

  getCaseStudies(programId: string): Observable<ProgramContentCaseStudy[]> {
    return collectionData(
      query(this.col(programId), orderBy('order', 'asc')),
      { idField: 'id' }
    ).pipe(
      map((items) => items.map((item) => this.normalizeCaseStudy(item as ProgramContentCaseStudy)))
    );
  }

  getCaseStudyById(programId: string, caseStudyId: string): Observable<ProgramContentCaseStudy | null> {
    return (
      docData(doc(this.db, `programs/${programId}/caseStudies/${caseStudyId}`), { idField: 'id' }) as Observable<ProgramContentCaseStudy>
    ).pipe(map((c) => (c ? this.normalizeCaseStudy(c) : null)));
  }

  async createCaseStudy(programId: string, payload: CreateCaseStudyPayload): Promise<string> {
    const ref = await addDoc(this.col(programId), {
      ...payload,
      programId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  }

  async updateCaseStudy(
    programId: string,
    caseStudyId: string,
    payload: Partial<CreateCaseStudyPayload>
  ): Promise<void> {
    await updateDoc(doc(this.db, `programs/${programId}/caseStudies/${caseStudyId}`), {
      ...payload,
      updatedAt: serverTimestamp(),
    });
  }

  async deleteCaseStudy(programId: string, caseStudyId: string): Promise<void> {
    await deleteDoc(doc(this.db, `programs/${programId}/caseStudies/${caseStudyId}`));
  }

  private normalizeCaseStudy(caseStudy: ProgramContentCaseStudy): ProgramContentCaseStudy {
    const prompts = Array.isArray(caseStudy.prompts)
      ? caseStudy.prompts.map((prompt) => String(prompt || ''))
      : [];

    const questions = Array.isArray(caseStudy.questions) && caseStudy.questions.length
      ? caseStudy.questions.map((question, index) => this.normalizeQuestion(question, index))
      : prompts.map((prompt, index) => this.toQuestionFromPrompt(prompt, index));

    return {
      ...caseStudy,
      scenario: typeof caseStudy.scenario === 'string' ? caseStudy.scenario : '',
      prompts: prompts.length ? prompts : questions.map((question) => question.prompt),
      questions,
      scoringMode: this.normalizeScoringMode(caseStudy.scoringMode),
    };
  }

  private normalizeQuestion(question: Partial<CaseStudyQuestionInput> | null | undefined, index: number): CaseStudyQuestionInput {
    const expectedKeywords = Array.isArray(question?.expectedKeywords)
      ? question.expectedKeywords.map((keyword) => String(keyword || '').trim()).filter(Boolean)
      : [];

    return {
      id: String(question?.id || `q${index + 1}`),
      prompt: String(question?.prompt || `Question ${index + 1}`),
      expectedKeywords,
      maxScore: Math.max(Number(question?.maxScore || 1), 1),
    };
  }

  private toQuestionFromPrompt(prompt: string, index: number): CaseStudyQuestionInput {
    return {
      id: `q${index + 1}`,
      prompt,
      expectedKeywords: [],
      maxScore: 1,
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
}
