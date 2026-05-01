import { inject, Injectable } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { AuthService } from '../../../../../core/auth';
import { Firestore, collection, collectionData, query, where } from '@angular/fire/firestore';
import { Observable, from, map, of, shareReplay, switchMap, throwError } from 'rxjs';

export type LearnerExamQuestionStatus =
  | 'unanswered'
  | 'answered'
  | 'flagged'
  | 'flagged_and_answered'
  | 'visited_unanswered';

export type LearnerExamNavigationMode = 'free_navigation' | 'forward_only' | 'strict_no_backtrack';
export type LearnerExamDeliveryMode =
  | 'strict_nclex_mode'
  | 'practice_mode'
  | 'review_mode'
  | 'flaggable_mock_mode';

export interface LearnerExamPrepPolicy {
  deliveryMode: LearnerExamDeliveryMode;
  navigationMode: LearnerExamNavigationMode;
  reviewAllowed: boolean;
  reviewDisabled: boolean;
  allowQuestionFlagging: boolean;
  allowBackNavigation: boolean;
  strictNoBacktrack: boolean;
  forwardOnly: boolean;
  oneQuestionAtATime: boolean;
  lockQuestionOnConfirm: boolean;
  requiresAnswerConfirmation: boolean;
  showQuestionPalette: boolean;
  allowPauseScreen: boolean;
  requireAllQuestionsAnswered: boolean;
  autoSubmitOnTimeout: boolean;
  scoreVisibleAfterSubmit: boolean;
  warningThresholdsSeconds: number[];
}

export interface LearnerExamPrepAssessmentSummary {
  id: string;
  title: string;
  description: string;
  instructions: string;
  assessmentMode: string;
  durationMinutes: number;
  passingScorePercent: number;
  drawCount: number;
  caseStudyCount: number;
  reviewMode: string;
  maxAttempts: number;
  allowRetake: boolean;
  requireAllQuestionsAnswered: boolean;
  autoSubmitOnTimeout: boolean;
  showScoreImmediately: boolean;
  programTitle: string;
  moduleTitle?: string;
  courseGroupTitle?: string;
  policy: LearnerExamPrepPolicy;
  isCustom?: boolean;
  visibilityScope?: string;
}

export interface CreateCustomExamPrepAssessmentPayload {
  title?: string;
  programSpaceId?: string;
  questionCount: number;
  durationMinutes: number;
  difficulty: 'mixed' | 'easy' | 'medium' | 'hard';
  deliveryPreset: 'timed' | 'tutorial' | 'cat_style';
  questionFamily: 'mixed' | 'classic' | 'ngn';
  questionUsageFilter: 'all' | 'unused' | 'incorrect' | 'marked' | 'omitted' | 'correct_on_reattempt';
  courseGroupTitle?: string;
  moduleTitle?: string;
}

export interface CreateCustomExamPrepAssessmentResponse {
  assessmentId: string;
  assessment: LearnerExamPrepAssessmentSummary;
}

export interface CustomExamPrepAvailabilityPayload {
  programSpaceId?: string;
  difficulty: 'mixed' | 'easy' | 'medium' | 'hard';
  questionFamily: 'mixed' | 'classic' | 'ngn';
  questionUsageFilter: 'all' | 'unused' | 'incorrect' | 'marked' | 'omitted' | 'correct_on_reattempt';
  courseGroupTitle?: string;
  moduleTitle?: string;
}

export interface CustomExamPrepAvailabilityOption {
  title: string;
  count: number;
}

export interface CustomExamPrepAvailabilityResponse {
  availableQuestionCount: number;
  totalEligibleQuestionCount: number;
  availableCourseGroups: CustomExamPrepAvailabilityOption[];
  availableModules: CustomExamPrepAvailabilityOption[];
}

export interface LearnerExamPrepChoice {
  id: string;
  label: string;
  text: string;
  rationale?: string;
}

export interface LearnerExamInteractionPart {
  id: string;
  label: string;
  prompt: string;
  selectionMode: 'single' | 'multiple';
  minSelections: number;
  maxSelections: number;
  optionIds: string[];
}

export interface LearnerExamBowTieInteraction {
  kind: 'bow_tie';
  instructions?: string | null;
  parts: LearnerExamInteractionPart[];
}

export interface LearnerExamClozeInteraction {
  kind: 'cloze_drop_down';
  instructions?: string | null;
  segments: Array<{
    id: string;
    label: string;
    placeholder: string;
    optionIds: string[];
    correctOptionId: string;
  }>;
}

export interface LearnerExamMatrixInteraction {
  kind: 'matrix_multiple_choice' | 'matrix_multiple_response';
  instructions?: string | null;
  rows: Array<{ id: string; label: string; prompt?: string | null }>;
  columns: Array<{ id: string; label: string; text: string }>;
  correctResponse: Record<string, string[]>;
}

export interface LearnerExamTrendInteraction {
  kind: 'trend_analysis';
  instructions?: string | null;
  metrics: Array<{ id: string; label: string; values: string[] }>;
  correctInterpretations: string[];
}

export type LearnerExamInteractionConfig =
  | LearnerExamBowTieInteraction
  | LearnerExamClozeInteraction
  | LearnerExamMatrixInteraction
  | LearnerExamTrendInteraction;

export interface LearnerExamPrepQuestion {
  id: string;
  stem: string;
  scenarioText?: string | null;
  leadInQuestion: string;
  itemType: string;
  interactionConfig?: LearnerExamInteractionConfig | null;
  moduleTitle: string;
  courseGroupTitle: string;
  parentCaseId?: string | null;
  points: number;
  choices: LearnerExamPrepChoice[];
  subject?: string;
  lesson?: string;
  clientNeedArea?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  explanation?: string;
  /** Correct answer key(s) — present in resumed sessions and review-mode sessions */
  correctAnswerKey?: string[];
  /** Clinical rationale for the correct answer */
  rationale?: string;
}

export interface LearnerExamCaseStudyBundle {
  id: string;
  title: string;
  scenarioText: string;
  questionIds: string[];
}

export interface LearnerExamPrepSession {
  status: 'in_progress' | 'submitted' | 'timed_out' | 'expired';
  attemptId: string;
  assemblyId?: string | null;
  assessmentId: string;
  title: string;
  description: string;
  instructions: string;
  reviewMode: string;
  passingScorePercent: number;
  durationMinutes: number;
  attemptNumber: number;
  resumed: boolean;
  questions: LearnerExamPrepQuestion[];
  currentQuestionIndex: number;
  totalQuestionCount: number;
  confirmedCount: number;
  answers: Record<string, string[]>;
  flags: Record<string, boolean>;
  visitedQuestionIds: string[];
  lockedQuestionIds: string[];
  questionStatuses: Record<string, LearnerExamQuestionStatus>;
  questionDurations: Record<string, number>;
  answeredCount: number;
  unansweredCount: number;
  flaggedCount: number;
  startedAtMs: number;
  expiresAtMs: number;
  serverNowMs: number;
  remainingSeconds: number;
  caseStudyBundles?: LearnerExamCaseStudyBundle[];
  policy: LearnerExamPrepPolicy;
}

export interface LearnerExamPrepProgressPayload {
  attemptId: string;
  answers: Record<string, string[]>;
  flags: Record<string, boolean>;
  visitedQuestionIds: string[];
  currentQuestionIndex: number;
  questionDurations: Record<string, number>;
  eventType?: string;
}

export interface LearnerExamPrepProgressResponse {
  status: 'in_progress' | 'submitted' | 'timed_out' | 'expired';
  attemptId: string;
  reviewId?: string;
  currentQuestionIndex?: number;
  lockedQuestionIds?: string[];
  questionStatuses?: Record<string, LearnerExamQuestionStatus>;
  answeredCount?: number;
  unansweredCount?: number;
  flaggedCount?: number;
  remainingSeconds: number;
  serverNowMs: number;
}

export interface LearnerExamPrepSubmitPayload {
  attemptId: string;
  answers: Record<string, string[]>;
  flags: Record<string, boolean>;
  questionDurations: Record<string, number>;
  elapsedSeconds: number;
  submitMode?: 'manual' | 'timeout';
}

export interface LearnerExamPrepConfirmPayload {
  attemptId: string;
  questionId: string;
  selectedAnswerKeys: string[];
  questionDurations: Record<string, number>;
  elapsedSeconds: number;
  finalizeAttempt?: boolean;
}

export interface LearnerExamPrepConfirmResponse {
  status: 'in_progress' | 'submitted' | 'timed_out' | 'expired';
  attemptId: string;
  reviewId?: string;
  currentQuestionIndex?: number;
  lockedQuestionIds?: string[];
  questionStatuses?: Record<string, LearnerExamQuestionStatus>;
  answeredCount?: number;
  unansweredCount?: number;
  flaggedCount?: number;
  remainingSeconds: number;
  serverNowMs: number;
}

export interface LearnerExamPrepSubmitResponse {
  status: 'submitted' | 'timed_out' | 'expired';
  attemptId: string;
  reviewId?: string;
  scorePercent?: number;
  passed?: boolean;
  timedOut?: boolean;
  answeredCount?: number;
  unansweredCount?: number;
  flaggedCount?: number;
  scoreVisible?: boolean;
  reviewUnlocked?: boolean;
  elapsedSeconds?: number;
  remainingSeconds?: number;
  serverNowMs: number;
}

export interface LearnerExamPrepReviewItem {
  itemId: string;
  stem: string;
  leadInQuestion: string;
  itemType: string;
  selectedAnswerKeys: string[];
  correctAnswerKeys?: string[];
  isCorrect: boolean;
  pointsEarned: number;
  pointsPossible: number;
  explanation?: string | null;
  rationale?: string | null;
  markedForReview?: boolean;
  questionStatus?: LearnerExamQuestionStatus;
  timeSpentSeconds?: number;
  choices: LearnerExamPrepChoice[];
}

export interface LearnerExamPrepResult {
  attemptId: string;
  assessmentId: string;
  assessmentTitle: string;
  scoreVisible: boolean;
  reviewUnlocked: boolean;
  scorePercent: number | null;
  pointsEarned: number | null;
  totalPoints: number | null;
  passed: boolean | null;
  reviewMode: string;
  showCorrectAnswers: boolean;
  showRationales: boolean;
  elapsedSeconds: number;
  submissionMode: 'manual' | 'timeout';
  answeredCount: number;
  unansweredCount: number;
  flaggedCount: number;
  domainScores: Record<string, number>;
  moduleScores: Record<string, number>;
  tagScores: Record<string, number>;
  items: LearnerExamPrepReviewItem[];
}

export interface LearnerExamPrepAttemptSummary {
  id: string;
  assessmentId: string;
  assessmentTitle: string;
  score: number;
  passed: boolean;
  completedAt?: unknown;
  timedOut?: boolean;
}

export interface LearnerExamPrepActiveAttempt {
  attemptId: string;
  assessmentId: string;
  assessmentTitle: string;
  attemptNumber: number;
  currentQuestionIndex: number;
  remainingSeconds: number;
}

export interface LearnerExamPrepAbandonPayload {
  attemptId: string;
  answers: Record<string, string[]>;
  flags: Record<string, boolean>;
  visitedQuestionIds: string[];
  currentQuestionIndex: number;
  questionDurations: Record<string, number>;
}

export interface LearnerExamPrepAbandonResponse {
  status: 'abandoned' | 'submitted' | 'timed_out' | 'expired';
  attemptId: string;
  reviewId?: string;
  remainingSeconds: number;
  serverNowMs: number;
}

export type LearnerExamPrepCatalogKind = 'assessment' | 'simulation';

interface ListPayload {
  programSpaceId?: string;
}

interface ListResponse {
  items: LearnerExamPrepAssessmentSummary[];
}

interface StartPayload {
  assessmentId: string;
  programSpaceId?: string;
}

interface ActiveAttemptsPayload {
  programSpaceId?: string;
}

interface ActiveAttemptsResponse {
  items: LearnerExamPrepActiveAttempt[];
}

interface ReviewPayload {
  attemptId: string;
}

@Injectable({ providedIn: 'root' })
export class LearnerExamPrepService {
  private readonly functions = inject(Functions);
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(AuthService);

  private readonly listFn = httpsCallable<ListPayload, ListResponse>(this.functions, 'listExamPrepAssessments');
  private readonly startFn = httpsCallable<StartPayload, LearnerExamPrepSession>(this.functions, 'startExamPrepAttempt');
  private readonly activeAttemptsFn = httpsCallable<ActiveAttemptsPayload, ActiveAttemptsResponse>(
    this.functions,
    'getActiveExamPrepAttempts'
  );
  private readonly createCustomFn = httpsCallable<CreateCustomExamPrepAssessmentPayload, CreateCustomExamPrepAssessmentResponse>(
    this.functions,
    'createCustomExamPrepAssessment'
  );
  private readonly availabilityFn = httpsCallable<CustomExamPrepAvailabilityPayload, CustomExamPrepAvailabilityResponse>(
    this.functions,
    'getCustomExamPrepAvailability'
  );
  private readonly saveFn = httpsCallable<LearnerExamPrepProgressPayload, LearnerExamPrepProgressResponse>(
    this.functions,
    'saveExamPrepAttemptProgress'
  );
  private readonly confirmFn = httpsCallable<LearnerExamPrepConfirmPayload, LearnerExamPrepConfirmResponse>(
    this.functions,
    'confirmExamPrepQuestion'
  );
  private readonly submitFn = httpsCallable<LearnerExamPrepSubmitPayload, LearnerExamPrepSubmitResponse>(
    this.functions,
    'submitExamPrepAttempt'
  );
  private readonly reviewFn = httpsCallable<ReviewPayload, LearnerExamPrepResult>(
    this.functions,
    'getExamPrepAttemptReview'
  );
  private readonly abandonFn = httpsCallable<LearnerExamPrepAbandonPayload, LearnerExamPrepAbandonResponse>(
    this.functions,
    'abandonExamPrepAttempt'
  );

  listAssessments(programSpaceId: string): Observable<LearnerExamPrepAssessmentSummary[]> {
    return from(this.listFn({ programSpaceId })).pipe(map((response) => response.data.items ?? []));
  }

  listCatalog(programSpaceId: string, kind: LearnerExamPrepCatalogKind): Observable<LearnerExamPrepAssessmentSummary[]> {
    return this.listAssessments(programSpaceId).pipe(
      map((items) => items.filter((item) => this.matchesKind(item.assessmentMode, kind)))
    );
  }

  getAssessment(programSpaceId: string, assessmentId: string): Observable<LearnerExamPrepAssessmentSummary | null> {
    return this.listAssessments(programSpaceId).pipe(
      map((items) => {
        const requested = String(assessmentId || '').trim();
        if (!requested) return null;

        const exact = items.find((item) => String(item.id || '') === requested);
        if (exact) return exact;

        const normalizedRequested = this.normalizeAssessmentLookupToken(requested);
        const normalizedItems = items.map((item) => ({
          item,
          id: this.normalizeAssessmentLookupToken(String(item.id || '')),
          title: this.normalizeAssessmentLookupToken(String(item.title || '')),
        }));

        const normalizedExact = normalizedItems.find((entry) => entry.id === normalizedRequested);
        if (normalizedExact) return normalizedExact.item;

        const fuzzy = normalizedItems.find((entry) =>
          entry.id.includes(normalizedRequested) ||
          normalizedRequested.includes(entry.id) ||
          entry.title === normalizedRequested
        );

        return fuzzy?.item ?? null;
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  private normalizeAssessmentLookupToken(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  startAttempt(programSpaceId: string, assessmentId: string): Observable<LearnerExamPrepSession> {
    const normalizedProgramId = String(programSpaceId || '').trim();
    const normalizedAssessmentId = String(assessmentId || '').trim();
    if (!normalizedProgramId || !normalizedAssessmentId) {
      return throwError(() => new Error('Assessment routing context is missing. Please reopen this exam from the catalogue.'));
    }

    return from(this.startFn({ programSpaceId: normalizedProgramId, assessmentId: normalizedAssessmentId })).pipe(
      map((response) => response.data)
    );
  }

  listActiveAttempts(programSpaceId: string): Observable<LearnerExamPrepActiveAttempt[]> {
    return from(this.activeAttemptsFn({ programSpaceId })).pipe(map((response) => response.data.items ?? []));
  }

  async createCustomAssessment(
    payload: CreateCustomExamPrepAssessmentPayload
  ): Promise<CreateCustomExamPrepAssessmentResponse> {
    const response = await this.createCustomFn(payload);
    return response.data;
  }

  getCustomAssessmentAvailability(
    payload: CustomExamPrepAvailabilityPayload
  ): Observable<CustomExamPrepAvailabilityResponse> {
    return from(this.availabilityFn(payload)).pipe(map((response) => response.data));
  }

  async saveProgress(payload: LearnerExamPrepProgressPayload): Promise<LearnerExamPrepProgressResponse> {
    const response = await this.saveFn(payload);
    return response.data;
  }

  async confirmQuestion(payload: LearnerExamPrepConfirmPayload): Promise<LearnerExamPrepConfirmResponse> {
    const response = await this.confirmFn(payload);
    return response.data;
  }

  async submitAttempt(payload: LearnerExamPrepSubmitPayload): Promise<LearnerExamPrepSubmitResponse> {
    const response = await this.submitFn(payload);
    return response.data;
  }

  async abandonAttempt(payload: LearnerExamPrepAbandonPayload): Promise<LearnerExamPrepAbandonResponse> {
    const response = await this.abandonFn(payload);
    return response.data;
  }

  getReview(attemptId: string): Observable<LearnerExamPrepResult> {
    return from(this.reviewFn({ attemptId })).pipe(map((response) => response.data));
  }

  getAttemptSummaries(programSpaceId: string): Observable<LearnerExamPrepAttemptSummary[]> {
    return this.auth.profile$.pipe(
      switchMap((profile) => {
        const uid = profile?.uid ?? '';
        if (!uid || !programSpaceId) {
          return of([]);
        }

        const ref = query(
          collection(this.firestore, `users/${uid}/assessmentAttempts`),
          where('programId', '==', programSpaceId)
        );
        return collectionData(ref, { idField: 'id' }) as Observable<Record<string, unknown>[]>;
      }),
      map((rows) =>
        rows
          .filter((row) => String(row['source'] || '') === 'exam-prep')
          .map((row) => ({
            id: String(row['id'] || ''),
            assessmentId: String(row['assessmentId'] || ''),
            assessmentTitle: String(row['assessmentTitle'] || 'Exam Prep Assessment'),
            score: Number(row['score'] || 0),
            passed: row['passed'] === true,
            timedOut: row['timedOut'] === true,
            completedAt: row['completedAt'],
          }))
      )
    );
  }

  formatModeLabel(mode: string): string {
    return String(mode || '')
      .split('_')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  getErrorMessage(error: unknown, fallback = 'Unable to complete this exam-prep action.'): string {
    const candidate = error as {
      message?: unknown;
      details?: unknown;
      code?: unknown;
      customData?: { message?: unknown; details?: unknown };
    } | null;

    const detailMessage =
      typeof candidate?.details === 'string'
        ? candidate.details
        : typeof candidate?.customData?.details === 'string'
          ? candidate.customData.details
          : '';

    const message =
      typeof candidate?.message === 'string'
        ? candidate.message
        : typeof candidate?.customData?.message === 'string'
          ? candidate.customData.message
          : '';

    const raw = detailMessage || message;
    if (!raw) {
      return fallback;
    }

    return raw
      .replace(/^functions\/[a-z-]+\s*/i, '')
      .replace(/^firebase:\s*/i, '')
      .trim() || fallback;
  }

  private matchesKind(mode: string, kind: LearnerExamPrepCatalogKind): boolean {
    const normalizedMode = String(mode || '').trim().toLowerCase();
    const simulationModes = new Set([
      'case_simulation',
      'comprehensive_mock_fixed',
      'comprehensive_mock_progressive',
      'comprehensive_ngn_mock',
      'jurisdiction_readiness_exam',
      'cat_like_mock',
      'preboard_final_exam',
    ]);

    const isSimulation = simulationModes.has(normalizedMode);
    return kind === 'simulation' ? isSimulation : !isSimulation;
  }
}
