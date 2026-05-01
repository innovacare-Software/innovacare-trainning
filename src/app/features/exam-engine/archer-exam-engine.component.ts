import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Input,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  LearnerExamDeliveryMode,
  LearnerExamPrepService,
  LearnerExamPrepSession,
} from '../publics/programs/learner-space/services/learner-exam-prep.service';

// ─── Public interfaces ────────────────────────────────────────────────────────

export interface ArcherChoice {
  id: string;   // 'A' | 'B' | 'C' | 'D'
  text: string;
}

export interface ArcherQuestion {
  id: number;
  stem: string;                   // supports innerHTML via [innerHTML]
  choices: ArcherChoice[];
  correctId: string;              // '' when not disclosed (live CBT)
  correctIds?: string[];          // multi-select correct keys (SATA, bow-tie)
  explanation: string;            // supports innerHTML
  rationale?: string;             // clinical rationale (admin-authored)
  distractorRationale?: Record<string, string>; // per-choice wrong-answer reasoning
  additionalInfo?: string;        // blue block, supports innerHTML
  difficulty: 'Easy' | 'Medium' | 'Hard';
  subject: string;
  lesson: string;
  clientNeedArea: string;
  clientNeedTopic: string;
  questionType: string;
}

export type ExamMode = 'quiz' | 'cbt' | 'review';

// ─── Internal ─────────────────────────────────────────────────────────────────

interface QState {
  selectedIds: string[];
  submitted: boolean;           // true in quiz mode after submit; set to true in review/cbt-review
  markedForLater: boolean;
  enteredAt: number;            // ms timestamp when user entered this question
  timeTakenMs: number;          // accumulated ms
}

// ─── Demo questions ───────────────────────────────────────────────────────────

const DEMO_QUESTIONS: ArcherQuestion[] = [
  {
    id: 1,
    stem: 'A nurse is caring for a client with severe burns covering 45% of total body surface area. Two hours after admission, the client\'s blood pressure has dropped to 84/52 and urine output is 15 mL/hr. The nurse recognizes this as which type of shock?',
    choices: [
      { id: 'A', text: 'Hypovolemic, due to plasma loss into burned tissue (third-spacing)' },
      { id: 'B', text: 'Cardiogenic, due to myocardial depression from burn toxins' },
      { id: 'C', text: 'Septic, due to bacterial colonization of burn wounds' },
      { id: 'D', text: 'Distributive, due to massive histamine release from injured tissue' },
    ],
    correctId: 'A',
    explanation:
      '<strong>Choice A is correct.</strong> Burn shock in the first 24–48 hours is <strong>hypovolemic</strong> — capillary permeability increases dramatically at the burn site, causing massive plasma loss into the interstitium (third-spacing). The Parkland formula (4 mL × kg × %TBSA of LR) addresses this loss; half is given in the first 8 hours from time of injury.<br><br>' +
      '<strong>Choices B, C, and D are incorrect.</strong> Cardiogenic shock (B) is uncommon in early burn injury; myocardial depression can occur in massive burns but is not the primary mechanism. Septic shock (C) typically develops days later when burn wounds become colonized — at 2 hours post-admission, infection is not yet the cause. While histamine is released (D), the dominant mechanism is fluid loss, not vasodilation; burn shock is classified as hypovolemic.',
    additionalInfo:
      '<strong>Parkland Formula:</strong> 4 mL × kg × %TBSA of lactated Ringer\'s over 24 hours.<br>' +
      '• <strong>Half</strong> in the first 8 hours (from time of burn, not arrival)<br>' +
      '• <strong>Half</strong> over the next 16 hours<br>' +
      '• Adjust to maintain urine output of <strong>0.5 mL/kg/hr in adults</strong> (1 mL/kg/hr in children)',
    difficulty: 'Medium',
    subject: 'Adult Health',
    lesson: 'Burn Shock',
    clientNeedArea: 'Physiological Adaptation',
    clientNeedTopic: 'Fluid & Electrolyte Imbalances',
    questionType: 'Application/Analysis',
  },
  {
    id: 2,
    stem: 'A client is prescribed digoxin 0.25 mg PO daily. The nurse assesses the following: heart rate 52 bpm, visual changes reported as "yellow halos around lights," nausea, and weakness. Which action should the nurse take <strong>first</strong>?',
    choices: [
      { id: 'A', text: 'Administer the scheduled digoxin dose and monitor the client closely' },
      { id: 'B', text: 'Hold the digoxin and notify the healthcare provider immediately' },
      { id: 'C', text: 'Administer an antiemetic to relieve the nausea before the next assessment' },
      { id: 'D', text: 'Recheck the heart rate in 30 minutes before making a clinical decision' },
    ],
    correctId: 'B',
    explanation:
      '<strong>Choice B is correct.</strong> The client is exhibiting classic signs of <strong>digoxin toxicity</strong>: bradycardia (HR 52), xanthopsia (yellow halos — a hallmark visual disturbance), GI symptoms (nausea), and neuromuscular weakness. The nurse should immediately hold the dose and notify the provider. Digoxin has a narrow therapeutic index and toxicity can be life-threatening.<br><br>' +
      '<strong>Choice A is incorrect</strong> — administering the dose would worsen toxicity. <strong>Choice C</strong> treats a symptom while ignoring the underlying toxicity. <strong>Choice D</strong> delays critical intervention.',
    additionalInfo:
      '<strong>Digoxin Toxicity — Key Signs:</strong><br>' +
      '• Bradycardia (HR &lt;60), dysrhythmias<br>' +
      '• GI: nausea, vomiting, anorexia<br>' +
      '• Visual: xanthopsia (yellow/green halos), blurred vision<br>' +
      '• Neurological: confusion, weakness<br>' +
      '• Treatment: hold drug, monitor K⁺, consider Digibind for severe toxicity',
    difficulty: 'Medium',
    subject: 'Pharmacology',
    lesson: 'Cardiac Glycosides',
    clientNeedArea: 'Pharmacological & Parenteral Therapies',
    clientNeedTopic: 'Adverse Effects / Contraindications',
    questionType: 'Application/Analysis',
  },
  {
    id: 3,
    stem: 'A post-op client (day 2 after abdominal surgery) reports sudden onset of chest pain rated 8/10, dyspnea, and anxiety. Vital signs: BP 118/76, HR 122, RR 24, SpO₂ 90% RA, T 37.1°C. Which condition is the nurse <strong>most concerned</strong> about?',
    choices: [
      { id: 'A', text: 'Pneumonia developing as a postoperative complication' },
      { id: 'B', text: 'Pulmonary embolism from deep vein thrombosis' },
      { id: 'C', text: 'Atelectasis related to decreased respiratory effort' },
      { id: 'D', text: 'Acute myocardial infarction triggered by surgical stress' },
    ],
    correctId: 'B',
    explanation:
      '<strong>Choice B is correct.</strong> The clinical picture — sudden pleuritic chest pain, tachypnea, tachycardia, hypoxia (SpO₂ 90%), and anxiety in a postoperative day 2 patient — is classic for <strong>pulmonary embolism</strong>. DVT is a well-known surgical complication, and Virchow\'s triad (stasis, hypercoagulability, endothelial injury) is directly triggered by surgery and immobility.<br><br>' +
      '<strong>Choice A</strong> (pneumonia) typically develops later (day 2–5+) with fever and productive cough. <strong>Choice C</strong> (atelectasis) presents with low-grade fever and decreased breath sounds, not sudden severe chest pain. <strong>Choice D</strong> is possible but less likely without classic ECG changes or cardiac history.',
    additionalInfo:
      '<strong>Wells Score for PE (simplified):</strong><br>' +
      '• Clinical signs of DVT: +3 points<br>' +
      '• PE most likely diagnosis: +3 points<br>' +
      '• HR &gt;100: +1.5 points<br>' +
      '• Immobilization/surgery in past 4 weeks: +1.5 points<br>' +
      '• Previous DVT/PE: +1.5 points<br>' +
      'Score &gt;4 = high probability → CT pulmonary angiography (gold standard)',
    difficulty: 'Hard',
    subject: 'Adult Health',
    lesson: 'Pulmonary Embolism',
    clientNeedArea: 'Physiological Adaptation',
    clientNeedTopic: 'Medical Emergencies',
    questionType: 'Analysis/Synthesis',
  },
  {
    id: 4,
    stem: 'A nurse is preparing to administer a blood transfusion. Fifteen minutes after starting the infusion, the client reports chills, back pain, and headache. Temperature has risen from 37.0°C to 38.8°C. Which is the nurse\'s priority action?',
    choices: [
      { id: 'A', text: 'Slow the transfusion rate and continue to monitor the client' },
      { id: 'B', text: 'Stop the transfusion, maintain IV access with normal saline, and notify the provider' },
      { id: 'C', text: 'Administer acetaminophen and diphenhydramine to manage the symptoms' },
      { id: 'D', text: 'Switch the blood tubing and resume the transfusion with a new unit' },
    ],
    correctId: 'B',
    explanation:
      '<strong>Choice B is correct.</strong> Chills, back pain, headache, and fever during a blood transfusion are classic signs of a <strong>hemolytic transfusion reaction</strong> (ABO incompatibility). The priority is to stop the transfusion immediately, keep the IV patent with normal saline (to preserve renal perfusion), and notify the provider. The blood bag must be returned to the blood bank for analysis.<br><br>' +
      '<strong>Choice A is incorrect</strong> — slowing the transfusion risks worsening a potentially fatal reaction. <strong>Choice C</strong> treats symptoms without addressing the cause. <strong>Choice D</strong> is dangerous — switching to a new unit before identifying the problem does not resolve the incompatibility.',
    additionalInfo:
      '<strong>Transfusion Reaction — STOP sequence:</strong><br>' +
      '• <strong>S</strong>top the transfusion immediately<br>' +
      '• <strong>T</strong>ake vital signs; assess airway<br>' +
      '• <strong>O</strong>pen IV with normal saline (new tubing)<br>' +
      '• <strong>P</strong>hysician notified + blood bank notified; return bag + tubing<br>' +
      '• Collect blood and urine samples per protocol',
    difficulty: 'Hard',
    subject: 'Adult Health',
    lesson: 'Blood Transfusion Reactions',
    clientNeedArea: 'Pharmacological & Parenteral Therapies',
    clientNeedTopic: 'Blood & Blood Products',
    questionType: 'Priority/Safety',
  },
  {
    id: 5,
    stem: 'A nurse is assessing a 2-day postpartum client and finds the fundus to be boggy, displaced to the right of midline, and 2 cm above the umbilicus. The client reports moderate lochia rubra. What is the most likely cause?',
    choices: [
      { id: 'A', text: 'Normal uterine involution' },
      { id: 'B', text: 'Uterine atony with distended bladder' },
      { id: 'C', text: 'Retained placental fragments' },
      { id: 'D', text: 'Postpartum hemorrhage requiring immediate surgical intervention' },
    ],
    correctId: 'B',
    explanation:
      '<strong>Choice B is correct.</strong> A boggy uterus that is deviated to the right of midline and above the umbilicus is the classic presentation of <strong>uterine atony caused by a distended bladder</strong>. The full bladder displaces the uterus and prevents it from contracting properly. The first intervention is to have the client void or catheterize if unable, then reassess the fundus and perform uterine massage if needed.<br><br>' +
      '<strong>Choice A is incorrect</strong> — normal involution produces a firm, midline fundus. <strong>Choice C</strong> (retained fragments) typically presents with subinvolution and abnormal bleeding, not acute displacement. <strong>Choice D</strong> is premature without first addressing the bladder.',
    additionalInfo:
      '<strong>Postpartum Fundal Assessment:</strong><br>' +
      '• Normal: firm, midline, at or below umbilicus descending ~1 cm/day<br>' +
      '• Boggy + deviated = bladder distension → have client void first<br>' +
      '• Boggy + midline = uterine atony → massage + oxytocin<br>' +
      '• Assess bladder before any uterine intervention',
    difficulty: 'Medium',
    subject: 'Maternal-Newborn',
    lesson: 'Postpartum Assessment',
    clientNeedArea: 'Health Promotion & Maintenance',
    clientNeedTopic: 'Ante/Intra/Postpartum Care',
    questionType: 'Application/Analysis',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-archer-exam-engine',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './archer-exam-engine.component.html',
  styleUrls: ['./archer-exam-engine.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArcherExamEngineComponent implements OnInit, OnDestroy {
  // ─── Inputs ─────────────────────────────────────────────────────────────────
  @Input() questions: ArcherQuestion[]   = DEMO_QUESTIONS;
  @Input() mode: ExamMode                = 'quiz';
  @Input() sessionTitle                  = 'InnovaCareReview NCLEX';
  @Input() userName                      = 'DEMO USER';
  @Input() examLabel                     = 'Tutorial';

  // ─── DI ─────────────────────────────────────────────────────────────────────
  private readonly _route    = inject(ActivatedRoute);
  private readonly _router   = inject(Router);
  private readonly _destroy  = inject(DestroyRef);
  private readonly _examPrep = inject(LearnerExamPrepService);

  // ─── Signals ────────────────────────────────────────────────────────────────
  readonly currentIndex = signal(0);
  readonly paused       = signal(false);
  readonly totalElapsed = signal(0);         // seconds since start
  readonly cbtPhase     = signal<'exam' | 'review'>('exam');

  /** Bump to force re-evaluation of computed values that depend on mutable QState */
  private readonly _ver = signal(0);

  // ─── Per-question state (mutable map, change detected via _ver) ─────────────
  private readonly _states = new Map<number, QState>();

  private _timer: ReturnType<typeof setInterval> | null = null;

  /** Resolved mode (may be overridden by route param in ngOnInit) */
  private _activeMode: ExamMode = 'quiz';

  // ─── Live session (set when launched from exam-prep-rules) ──────────────────
  private _liveSession: LearnerExamPrepSession | null = null;
  private _liveProgramId = '';
  private _sessionStartMs = Date.now();
  private _forceEndReviewMode = false;

  // ─── Computed ───────────────────────────────────────────────────────────────

  /** Current question object */
  readonly q = computed(() => {
    this._ver();
    return this.questions[this.currentIndex()];
  });

  /** Current question state */
  readonly qs = computed((): QState => {
    this._ver();
    return this._ensureState(this.currentIndex());
  });

  /** Formatted QID — SHK-XXXX */
  readonly qid = computed(() => {
    const q = this.q();
    return q ? 'SHK-' + (6900 + q.id).toString().padStart(4, '0') : '';
  });

  /** Global timer display (HH:MM:SS) */
  readonly headerTime = computed(() => this._hms(this.totalElapsed()));

  /**
   * True when this question is in "revealed" state:
   * - quiz: after per-question submit
   * - cbt: after full exam submit (review phase)
   * - review: always
   */
  readonly revealed = computed(() => {
    this._ver();
    if (this._activeMode === 'review') return true;
    if (this._activeMode === 'cbt')   return this.cbtPhase() === 'review';
    return this._ensureState(this.currentIndex()).submitted;
  });

  /** Whether the user selected the correct option */
  readonly isCorrect = computed(() => {
    this._ver();
    if (!this.canEvaluateCurrentQuestion()) return false;
    const q = this.q();
    if (!q) return false;
    const st = this._ensureState(this.currentIndex());
    const correctIds = this._correctIdsFor(q);
    if (!st.selectedIds.length || !correctIds.length) return false;
    if (correctIds.length !== st.selectedIds.length) return false;
    return correctIds.every((id) => st.selectedIds.includes(id));
  });

  /** Full text of the correct choice (empty string when correctId is not disclosed) */
  readonly correctChoiceText = computed(() => {
    const q = this.q();
    if (!q?.correctId) return '';
    return q.choices.find(c => c.id === q.correctId)?.text ?? q.correctId;
  });

  /** Whether the current question is marked for later */
  readonly isMarked = computed(() => {
    this._ver();
    return this._ensureState(this.currentIndex()).markedForLater;
  });

  readonly canPrev = computed(() => this.currentIndex() > 0);
  readonly canNext = computed(() => this.currentIndex() < this.questions.length - 1);
  readonly isLast  = computed(() => this.currentIndex() === this.questions.length - 1);

  /** CBT: true when every question has at least one selection */
  readonly allSelected = computed(() => {
    this._ver();
    return this.questions.every((_, i) => (this._states.get(i)?.selectedIds?.length ?? 0) > 0);
  });

  /** Pseudo peer-correct percentage (deterministic) */
  readonly peerPct = computed(() => {
    const q = this.q();
    return q ? this._pseudoPct(q.id, q.difficulty) : 0;
  });

  /** Option distribution map { choiceId → pct } */
  readonly dist = computed(() => {
    const q = this.q();
    return q ? this._dist(q) : ({} as Record<string, number>);
  });

  /** "Time Taken" meta-strip value */
  readonly timeTaken = computed(() => {
    this._ver();
    if (this._activeMode === 'review') return '—';
    const st = this._ensureState(this.currentIndex());
    if (this._activeMode === 'cbt' && this.cbtPhase() === 'exam') return '—';
    if (!st.submitted) return '—';
    return this._fmt(st.timeTakenMs);
  });

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    // ── Live session injected via router navigation state ─────────────────────
    const histState = window.history.state as {
      session?: LearnerExamPrepSession;
      programId?: string;
      sourceKind?: 'assessment' | 'simulation';
      forceEndReviewMode?: boolean;
    };

    this._forceEndReviewMode =
      histState?.forceEndReviewMode === true ||
      histState?.sourceKind === 'simulation';

    if (histState?.session) {
      this._applyLiveSession(histState.session, histState.programId || '');
      if (this._forceEndReviewMode) {
        this._activeMode = 'cbt';
      }
    } else {
      // Demo / standalone: allow route param to override @Input mode
      const p = this._route.snapshot.paramMap.get('mode') as ExamMode | null;
      this._activeMode = p && (['quiz', 'cbt', 'review'] as ExamMode[]).includes(p)
        ? p
        : this.mode;

      // If page is opened directly on /my-programs/:programId/exam-prep/:assessmentId/archer,
      // hydrate from backend instead of falling back to demo questions.
      void this._hydrateFromRouteContext();
    }

    // Review mode: pre-mark all questions as submitted so rationale shows
    if (this._activeMode === 'review') {
      this.questions.forEach((_, i) => { this._ensureState(i).submitted = true; });
    }

    this._enter(this.currentIndex());
    this._startTimer();
  }

  private async _hydrateFromRouteContext(): Promise<void> {
    const programId = this._route.snapshot.pathFromRoot
      .map((routeSnapshot) => routeSnapshot.paramMap.get('programId'))
      .find((value): value is string => !!value?.trim()) || '';
    const assessmentId = this._route.snapshot.paramMap.get('assessmentId') || '';

    if (!programId || !assessmentId || this._liveSession) {
      return;
    }

    try {
      const session = await firstValueFrom(this._examPrep.startAttempt(programId, assessmentId));
      if (session.status === 'submitted' || session.status === 'timed_out') {
        return;
      }
      this._applyLiveSession(session, programId);
      if (this._forceEndReviewMode) {
        this._activeMode = 'cbt';
      }
      this._ver.update((v) => v + 1);
    } catch {
      // Keep demo fallback when backend context is unavailable.
    }
  }

  private _applyLiveSession(session: LearnerExamPrepSession, programId: string): void {
    this._liveSession = session;
    this._liveProgramId = programId;
    this._sessionStartMs = Date.now();
    this.questions = this._mapSession(session);
    this._activeMode = this._mapDeliveryMode(session.policy.deliveryMode);
    this.sessionTitle = session.title;
    this.examLabel = this._examLabelFor(session.policy.deliveryMode);
    this._states.clear();
    this.currentIndex.set(session.resumed && session.currentQuestionIndex > 0 ? session.currentQuestionIndex : 0);

    const liveQs = session.questions;
    Object.entries(session.answers).forEach(([qId, keys]) => {
      if (!keys.length) return;
      const qi = liveQs.findIndex((q) => q.id === qId);
      if (qi >= 0) this._ensureState(qi).selectedIds = [...keys];
    });
  }

  ngOnDestroy(): void {
    this._stopTimer();
  }

  // ─── Timer ──────────────────────────────────────────────────────────────────

  private _startTimer(): void {
    this._timer = setInterval(() => {
      if (!this.paused()) this.totalElapsed.update(v => v + 1);
    }, 1000);
  }

  private _stopTimer(): void {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  }

  // ─── State helpers ──────────────────────────────────────────────────────────

  private _ensureState(idx: number): QState {
    if (!this._states.has(idx)) {
      this._states.set(idx, {
        selectedIds: [],
        submitted: false,
        markedForLater: false,
        enteredAt: Date.now(),
        timeTakenMs: 0,
      });
    }
    return this._states.get(idx)!;
  }

  private _enter(idx: number): void {
    this._ensureState(idx).enteredAt = Date.now();
  }

  private _leave(idx: number): void {
    const st = this._states.get(idx);
    if (st && !st.submitted) st.timeTakenMs += Date.now() - st.enteredAt;
  }

  // ─── User actions ────────────────────────────────────────────────────────────

  /** Select an option (no-op if question already revealed) */
  select(choiceId: string): void {
    if (this.revealed()) return;
    const st = this._ensureState(this.currentIndex());
    if (this.isMultiSelectCurrent()) {
      st.selectedIds = st.selectedIds.includes(choiceId)
        ? st.selectedIds.filter((id) => id !== choiceId)
        : [...st.selectedIds, choiceId];
    } else {
      st.selectedIds = [choiceId];
    }
    this._ver.update(v => v + 1);
  }

  /** Quiz mode: submit current question and reveal explanation */
  submitAnswer(): void {
    const st = this._ensureState(this.currentIndex());
    if (!st.selectedIds.length || st.submitted) return;
    st.submitted   = true;
    st.timeTakenMs += Date.now() - st.enteredAt;
    st.enteredAt   = Date.now();
    this._ver.update(v => v + 1);
  }

  /** Toggle mark-for-later on current question */
  toggleMark(): void {
    this._ensureState(this.currentIndex()).markedForLater =
      !this._ensureState(this.currentIndex()).markedForLater;
    this._ver.update(v => v + 1);
  }

  /** Navigate by delta (-1 prev, +1 next) */
  navigate(delta: number): void {
    const next = this.currentIndex() + delta;
    if (next < 0 || next >= this.questions.length) return;
    this._leave(this.currentIndex());
    this.currentIndex.set(next);
    this._enter(next);
    this._ver.update(v => v + 1);
  }

  /** CBT mode: submit the entire exam and enter review phase */
  submitCbt(): void {
    if (!this.allSelected()) return;
    this._states.forEach((st) => {
      if (!st.submitted) {
        st.timeTakenMs += Date.now() - st.enteredAt;
        st.submitted    = true;
      }
    });
    this.cbtPhase.set('review');
    this.currentIndex.set(0);
    this._ver.update(v => v + 1);
  }

  /** Exit the exam session — submits to backend if live, then navigates to results */
  async endExam(): Promise<void> {
    this._stopTimer();

    if (this._liveSession) {
      const elapsedSeconds = Math.round((Date.now() - this._sessionStartMs) / 1000);
      const answers: Record<string, string[]> = {};
      const questionDurations: Record<string, number> = {};

      this._liveSession.questions.forEach((q, i) => {
        const st = this._states.get(i);
        if (st?.selectedIds?.length)  answers[q.id] = [...st.selectedIds];
        if (st) questionDurations[q.id] = Math.round(st.timeTakenMs / 1000);
      });

      try {
        const result = await this._examPrep.submitAttempt({
          attemptId:        this._liveSession.attemptId,
          answers,
          flags:            {},
          questionDurations,
          elapsedSeconds,
          submitMode:       'manual',
        });
        await this._router.navigate([
          '/my-programs', this._liveProgramId,
          'exam-prep', 'results', result.attemptId || this._liveSession.attemptId,
        ]);
        return;
      } catch {
        // fall through to default nav on error
      }
    }

    this._router.navigate(['/my-programs']);
  }

  /** Toggle pause/resume */
  togglePause(): void {
    this.paused.update(v => !v);
  }

  // ─── Template helpers ────────────────────────────────────────────────────────

  /** Returns active mode for template comparisons */
  getMode(): ExamMode { return this._activeMode; }

  /** CSS class map for an option list item */
  optClass(choiceId: string): Record<string, boolean> {
    const st  = this._ensureState(this.currentIndex());
    const q   = this.q();
    const rev = this.revealed();
    const canEvaluate = this.canEvaluateCurrentQuestion();
    const isCorrectChoice = !!q && canEvaluate && this._correctIdsFor(q).includes(choiceId);
    return {
      'archer-opt--selected': !rev && st.selectedIds.includes(choiceId),
      'archer-opt--correct':  rev && isCorrectChoice,
      'archer-opt--wrong':    rev && canEvaluate && st.selectedIds.includes(choiceId) && !isCorrectChoice,
      'archer-opt--disabled': rev,
    };
  }

  /** Icon for an option after reveal (✓ correct, ✗ wrong, '' otherwise) */
  optIcon(choiceId: string): string {
    if (!this.revealed()) return '';
    if (!this.canEvaluateCurrentQuestion()) return '';
    const q  = this.q();
    const st = this._ensureState(this.currentIndex());
    if (q && this._correctIdsFor(q).includes(choiceId)) return '✓';
    if (st.selectedIds.includes(choiceId)) return '✗';
    return '';
  }

  /** Is a given choice currently selected? */
  isSelected(choiceId: string): boolean {
    this._ver();
    return this._ensureState(this.currentIndex()).selectedIds.includes(choiceId);
  }

  /** Can the submit button be clicked? */
  canSubmit(): boolean {
    this._ver();
    const st = this._ensureState(this.currentIndex());
    return !!st.selectedIds.length && !st.submitted;
  }

  canEvaluateCurrentQuestion(): boolean {
    const q = this.q();
    if (!q) return false;
    return this._correctIdsFor(q).length > 0;
  }

  statusText(): string {
    if (!this.canEvaluateCurrentQuestion()) {
      return 'Submitted';
    }
    return this.isCorrect() ? 'Correct' : 'Incorrect';
  }

  isMultiSelectCurrent(): boolean {
    const q = this.q();
    if (!q) return false;
    const correctIds = this._correctIdsFor(q);
    return correctIds.length > 1;
  }

  correctAnswerDisplay(): string {
    const q = this.q();
    if (!q) return '';
    const ids = this._correctIdsFor(q);
    return ids.join(', ');
  }

  private _correctIdsFor(q: ArcherQuestion): string[] {
    if (q.correctIds?.length) return q.correctIds;
    if (q.correctId) return [q.correctId];
    return [];
  }

  /** Show per-question Submit Answer button (quiz mode only) */
  showSubmit(): boolean {
    return this._activeMode === 'quiz' && !this.revealed();
  }

  /** Show the CBT "Submit Exam" button strip */
  showCbtBar(): boolean {
    return this._activeMode === 'cbt' && this.cbtPhase() === 'exam';
  }

  /** Label for the Next/Finish button */
  nextLabel(): string {
    if (this.isLast()) {
      return 'Finish';
    }
    return 'Next';
  }

  // ─── Math helpers ─────────────────────────────────────────────────────────

  private _pseudoPct(id: number, diff: string): number {
    const base = diff === 'Easy' ? 78 : diff === 'Medium' ? 58 : 42;
    return Math.max(15, Math.min(92, base + ((id * 17) % 21) - 10));
  }

  private _dist(q: ArcherQuestion): Record<string, number> {
    const correct = this._pseudoPct(q.id, q.difficulty);
    const others  = q.choices.filter(c => c.id !== q.correctId);
    const rest    = 100 - correct;
    const out: Record<string, number> = { [q.correctId]: correct };
    let left = rest;
    others.forEach((c, i) => {
      if (i === others.length - 1) {
        out[c.id] = Math.max(4, left);
      } else {
        const v = ((q.id * (i + 3) * 7) % 13) - 6;
        const s = Math.max(4, Math.min(
          Math.round(rest / others.length + v),
          left - 4 * (others.length - i - 1),
        ));
        out[c.id] = s;
        left -= s;
      }
    });
    return out;
  }

  // ─── Session mapping helpers ─────────────────────────────────────────────

  private _mapSession(session: LearnerExamPrepSession): ArcherQuestion[] {
    const capDiff = (d?: string): 'Easy' | 'Medium' | 'Hard' => {
      const s = d ? d.charAt(0).toUpperCase() + d.slice(1).toLowerCase() : '';
      return (['Easy', 'Medium', 'Hard'].includes(s) ? s : 'Medium') as 'Easy' | 'Medium' | 'Hard';
    };
    return session.questions.map((q, i) => ({
      id: i + 1,
      stem: q.leadInQuestion
        ? q.stem + '<div class="archer-lead-in">' + q.leadInQuestion + '</div>'
        : q.stem,
      choices: q.choices.map((c) => ({
        id: c.id,
        text: c.text,
      })),
      correctId:      q.correctAnswerKey?.[0] ?? '',   // available in resumed / review sessions
      correctIds:     q.correctAnswerKey?.length ? q.correctAnswerKey : undefined,
      explanation:    q.explanation || '',
      rationale:      q.rationale   || undefined,
      additionalInfo: q.scenarioText || undefined,
      difficulty:     capDiff(q.difficulty),
      subject:        q.subject        || q.courseGroupTitle || 'Nursing',
      lesson:         q.lesson         || q.moduleTitle      || 'Clinical Care',
      clientNeedArea: q.clientNeedArea || '',
      clientNeedTopic: q.itemType      || '',
      questionType:   q.itemType       || 'multiple_choice',
    }));
  }

  private _mapDeliveryMode(mode: LearnerExamDeliveryMode): ExamMode {
    if (mode === 'review_mode')        return 'review';
    if (mode === 'strict_nclex_mode')  return 'cbt';
    return 'quiz'; // practice_mode, flaggable_mock_mode
  }

  private _examLabelFor(mode: LearnerExamDeliveryMode): string {
    const labels: Record<LearnerExamDeliveryMode, string> = {
      strict_nclex_mode:   'CBT Mode',
      review_mode:         'Review',
      flaggable_mock_mode: 'Mock Exam',
      practice_mode:       'Practice',
    };
    return labels[mode] ?? 'Practice';
  }

  private _hms(s: number): string {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    return [h, m, r].map(v => String(v).padStart(2, '0')).join(':');
  }

  private _fmt(ms: number): string {
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s} s`;
    const m = Math.floor(s / 60), rem = s % 60;
    return rem ? `${m} m ${rem} s` : `${m} m`;
  }
}
