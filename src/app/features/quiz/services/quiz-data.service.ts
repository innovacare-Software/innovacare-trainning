import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { QuizQuestion } from '../models/question.model';

export interface QuizModuleCopy {
  kicker: string;
  title: string;
  subtitle: string;
  featureCards: Array<{ value: string; label: string }>;
  footerNote: string;
}

@Injectable({ providedIn: 'root' })
export class QuizDataService {
  private readonly http = inject(HttpClient);

  loadQuestions(moduleId: string): Observable<QuizQuestion[]> {
    const normalizedModuleId = String(moduleId || '').trim().toLowerCase();
    const fileName = `${normalizedModuleId || 'shock'}-questions.json`;
    return this.http.get<unknown>(`/assets/data/${fileName}`).pipe(
      map((payload) => this.validateQuestions(payload, normalizedModuleId || 'shock'))
    );
  }

  getModuleCopy(moduleId: string, questionCount: number): QuizModuleCopy {
    const normalizedModuleId = String(moduleId || '').trim().toLowerCase();
    if (normalizedModuleId === 'shock') {
      return {
        kicker: 'InnovaCareReview · NCLEX Practice',
        title: 'Shock — 25-Question Review',
        subtitle:
          'Hypovolemic. Cardiogenic. Obstructive. Distributive. Master the patterns that show up on the NCLEX, DOH, and DHA exams.',
        featureCards: [
          { value: String(questionCount || 25), label: 'Questions' },
          { value: '~30 min', label: 'Average completion' },
          { value: 'Tutorial', label: 'Mode · explanation per item' },
          { value: 'All 4', label: 'Shock types covered' },
        ],
        footerNote:
          'Each question reveals the correct answer with a detailed rationale and clinical reference after you submit. Use Previous / Next to review at any time.',
      };
    }

    const humanized = normalizedModuleId
      .split('-')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

    return {
      kicker: 'InnovaCareReview · NCLEX Practice',
      title: `${humanized || 'NCLEX'} — ${questionCount || 0}-Question Review`,
      subtitle: 'Timed tutorial-mode review with answer reveal, rationale, and focused clinical explanations after each submission.',
      featureCards: [
        { value: String(questionCount || 0), label: 'Questions' },
        { value: '~30 min', label: 'Average completion' },
        { value: 'Tutorial', label: 'Mode · explanation per item' },
        { value: 'Adaptive UX', label: 'Archer-style review flow' },
      ],
      footerNote: 'Review each rationale, mark tricky items for later, and revisit completed questions with the same state preserved.',
    };
  }

  private validateQuestions(payload: unknown, moduleId: string): QuizQuestion[] {
    if (!Array.isArray(payload)) {
      throw new Error(`Quiz data for ${moduleId} is invalid: expected an array of questions.`);
    }

    return payload.map((entry, index) => this.validateQuestion(entry, index, moduleId));
  }

  private validateQuestion(entry: unknown, index: number, moduleId: string): QuizQuestion {
    const record = (entry || {}) as Record<string, unknown>;
    const requiredStringFields: Array<keyof QuizQuestion> = [
      'qnum',
      'stem',
      'subject',
      'lesson',
      'needArea',
      'needTopic',
      'qType',
      'rationale',
      'distractors',
      'additional',
    ];

    for (const field of requiredStringFields) {
      if (typeof record[field] !== 'string' || !String(record[field]).trim()) {
        throw new Error(`Quiz data for ${moduleId} is invalid at index ${index}: field ${field} is required.`);
      }
    }

    if (!Array.isArray(record['options']) || record['options'].length !== 4 || record['options'].some((option) => typeof option !== 'string' || !String(option).trim())) {
      throw new Error(`Quiz data for ${moduleId} is invalid at index ${index}: each question must include exactly 4 option strings.`);
    }

    const correct = Number(record['correct']);
    if (!Number.isInteger(correct) || correct < 0 || correct > 3) {
      throw new Error(`Quiz data for ${moduleId} is invalid at index ${index}: correct must be an integer from 0 to 3.`);
    }

    const difficulty = String(record['difficulty'] || '').trim();
    if (difficulty !== 'Easy' && difficulty !== 'Medium' && difficulty !== 'Hard') {
      throw new Error(`Quiz data for ${moduleId} is invalid at index ${index}: difficulty must be Easy, Medium, or Hard.`);
    }

    const id = Number(record['id']);
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error(`Quiz data for ${moduleId} is invalid at index ${index}: id must be a positive integer.`);
    }

    return {
      id,
      qnum: String(record['qnum']).trim(),
      stem: String(record['stem']).trim(),
      options: (record['options'] as string[]).map((option) => String(option).trim()),
      correct,
      difficulty,
      subject: String(record['subject']).trim(),
      lesson: String(record['lesson']).trim(),
      needArea: String(record['needArea']).trim(),
      needTopic: String(record['needTopic']).trim(),
      qType: String(record['qType']).trim(),
      rationale: String(record['rationale']).trim(),
      distractors: String(record['distractors']).trim(),
      additional: String(record['additional']).trim(),
    };
  }
}
