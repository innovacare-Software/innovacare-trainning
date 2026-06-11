import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { LabDefinitionService } from '../../../../lab-engine/services/lab-definition.service';
import { LabSessionService } from '../../../../lab-engine/services/lab-session.service';
import { AuthService } from '../../../../../core/auth';
import { LabDefinition, LabDifficulty } from '../../../../lab-engine/models/lab-definition.model';
import { LabSession } from '../../../../lab-engine/models/lab-session.model';

const DIFFICULTY_COLORS: Record<LabDifficulty, string> = {
  beginner:     '#22c55e',
  intermediate: '#f59e0b',
  advanced:     '#ef4444',
  enterprise:   '#8b5cf6',
};

const CATEGORY_ICONS: Record<string, string> = {
  devops:            '⚙️',
  cloud:             '☁️',
  linux:             '🐧',
  'web-development': '🌐',
  'agentic-ai':      '🤖',
  'ai-agent-creation': '🧠',
  'rag-prompt-stack':  '📚',
  'sysadmin-aiops':    '🛡️',
};

@Component({
  selector: 'app-program-labs-page',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="program-labs">
      <!-- Header -->
      <header class="labs-hero">
        <div class="labs-hero__inner">
          <div class="labs-hero__badge">🧪 INTERACTIVE LABS</div>
          <h1 class="labs-hero__title">Hands-On Labs</h1>
          <p class="labs-hero__subtitle">
            Practice real enterprise skills in guided lab environments.
            Build, validate, and ship.
          </p>
          <div class="labs-hero__stats">
            <div class="stat-chip">
              <span class="stat-chip__num">{{ labs().length }}</span>
              <span class="stat-chip__label">Labs Available</span>
            </div>
            <div class="stat-chip">
              <span class="stat-chip__num">{{ completedCount() }}</span>
              <span class="stat-chip__label">Completed</span>
            </div>
            <div class="stat-chip">
              <span class="stat-chip__num">{{ totalXp() | number }}</span>
              <span class="stat-chip__label">Total XP</span>
            </div>
          </div>
        </div>
      </header>

      <!-- Body -->
      <div class="labs-body">
        @if (isLoading()) {
          <div class="labs-skeleton">
            @for (i of [1,2,3]; track i) {
              <div class="lab-card lab-card--skeleton"></div>
            }
          </div>
        } @else if (labs().length === 0) {
          <div class="labs-empty">
            <div class="labs-empty__icon">🔬</div>
            <h3>No labs available yet</h3>
            <p>Your instructor will publish labs here. Check back soon!</p>
          </div>
        } @else {
          <div class="labs-grid">
            @for (lab of labs(); track lab.id) {
              <article class="lab-card"
                [class.lab-card--completed]="isLabCompleted(lab.id)"
                [class.lab-card--inprogress]="isLabInProgress(lab.id)">
                <div class="lab-card__header">
                  <span class="lab-card__cat-icon">{{ getCategoryIcon(lab.category) }}</span>
                  <span class="lab-card__type">{{ lab.labType }}</span>
                </div>
                <div class="lab-card__body">
                  <div class="lab-card__difficulty"
                       [style.color]="getDifficultyColor(lab.difficulty)">
                    {{ lab.difficulty | uppercase }}
                  </div>
                  <h2 class="lab-card__title">{{ lab.title }}</h2>
                  <p class="lab-card__desc">{{ lab.description }}</p>
                  @if (lab.learningOutcomes?.length) {
                    <ul class="lab-card__outcomes">
                      @for (o of lab.learningOutcomes.slice(0, 3); track o) {
                        <li>✓ {{ o }}</li>
                      }
                    </ul>
                  }
                  <div class="lab-card__tags">
                    @for (tag of lab.tags?.slice(0, 4); track tag) {
                      <span class="tag">{{ tag }}</span>
                    }
                  </div>
                </div>

                <!-- Card Footer — state-aware -->
                <div class="lab-card__footer">
                  <div class="lab-card__meta">
                    <span>⏱ {{ lab.estimatedMinutes }} min</span>
                    <span class="xp">⚡ {{ lab.xp }} XP</span>
                  </div>

                  @if (isLabCompleted(lab.id)) {
                    <!-- Completed state -->
                    <div class="lab-card__status-area">
                      <span class="completion-badge">
                        ✅ Completed
                        @if (getLabAttemptCount(lab.id) > 1) {
                          · {{ getLabAttemptCount(lab.id) }} attempts
                        }
                        · {{ getLabBestScore(lab.id) }}%
                      </span>
                      <button
                        class="btn-reattempt"
                        [id]="'reattempt-lab-' + lab.id"
                        (click)="reattemptLab(lab)"
                        [disabled]="isStarting() && startingId() === lab.id">
                        @if (isStarting() && startingId() === lab.id) {
                          <span class="spinner"></span>
                        } @else {
                          🔄 Re-attempt
                        }
                      </button>
                    </div>
                  } @else if (isLabInProgress(lab.id)) {
                    <!-- In-Progress state -->
                    <div class="lab-card__status-area">
                      <span class="inprogress-badge">⏸ In Progress</span>
                      <button
                        class="btn-resume"
                        [id]="'resume-lab-' + lab.id"
                        (click)="startLab(lab)"
                        [disabled]="isStarting() && startingId() === lab.id">
                        @if (isStarting() && startingId() === lab.id) {
                          <span class="spinner"></span> Starting…
                        } @else {
                          ▶ Resume →
                        }
                      </button>
                    </div>
                  } @else {
                    <!-- Not started -->
                    <button
                      class="btn-start"
                      [id]="'start-lab-' + lab.id"
                      (click)="startLab(lab)"
                      [disabled]="isStarting() && startingId() === lab.id">
                      @if (isStarting() && startingId() === lab.id) {
                        <span class="spinner"></span> Starting…
                      } @else {
                        Start Lab →
                      }
                    </button>
                  }
                </div>
              </article>
            }
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
    .program-labs { min-height: 80vh; background: #0a0d14; color: #e2e8f0; }

    /* Hero */
    .labs-hero {
      background: linear-gradient(135deg, #0f1629 0%, #1a1f35 50%, #0f1629 100%);
      border-bottom: 1px solid rgba(99,102,241,0.25);
      padding: 3rem 2rem 2.5rem;
    }
    .labs-hero__inner { max-width: 1100px; margin: 0 auto; }
    .labs-hero__badge {
      display: inline-block;
      background: rgba(99,102,241,0.15); border: 1px solid rgba(99,102,241,0.35);
      color: #a5b4fc; padding: 0.25rem 0.9rem; border-radius: 100px;
      font-size: 0.7rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
      margin-bottom: 1rem;
    }
    .labs-hero__title {
      font-size: clamp(1.6rem, 3.5vw, 2.4rem); font-weight: 800;
      background: linear-gradient(135deg, #e2e8f0 0%, #a5b4fc 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text; margin: 0 0 0.75rem;
    }
    .labs-hero__subtitle { color: #94a3b8; font-size: 1rem; max-width: 500px; margin: 0 0 1.5rem; line-height: 1.6; }
    .labs-hero__stats { display: flex; gap: 1rem; flex-wrap: wrap; }
    .stat-chip {
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px; padding: 0.6rem 1rem; display: flex; flex-direction: column; gap: 0.15rem;
    }
    .stat-chip__num { font-size: 1.3rem; font-weight: 800; color: #a5b4fc; }
    .stat-chip__label { font-size: 0.7rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; }

    /* Body */
    .labs-body { max-width: 1100px; margin: 0 auto; padding: 2rem; }

    /* Skeleton */
    .labs-skeleton { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.25rem; }

    /* Grid */
    .labs-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.25rem; }

    /* Card */
    .lab-card {
      background: linear-gradient(135deg, #111827 0%, #1e293b 100%);
      border: 1px solid rgba(255,255,255,0.08); border-radius: 14px;
      overflow: hidden; display: flex; flex-direction: column;
      transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
    }
    .lab-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.25);
      border-color: rgba(99,102,241,0.25);
    }
    .lab-card--completed {
      border-color: rgba(34,197,94,0.25) !important;
      box-shadow: 0 0 0 1px rgba(34,197,94,0.1);
    }
    .lab-card--inprogress {
      border-color: rgba(245,158,11,0.25) !important;
      box-shadow: 0 0 0 1px rgba(245,158,11,0.1);
    }
    .lab-card--skeleton {
      height: 320px;
      background: linear-gradient(90deg, #1e293b 25%, #263447 50%, #1e293b 75%);
      background-size: 200% 100%; animation: shimmer 1.5s infinite;
    }
    @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }

    .lab-card__header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1rem 1.25rem 0;
    }
    .lab-card__cat-icon { font-size: 1.75rem; }
    .lab-card__type {
      font-size: 0.65rem; font-weight: 700; letter-spacing: 0.08em;
      text-transform: uppercase; background: rgba(255,255,255,0.06);
      color: #64748b; padding: 0.2rem 0.5rem; border-radius: 4px;
    }

    .lab-card__body { padding: 0.9rem 1.25rem; flex: 1; }
    .lab-card__difficulty { font-size: 0.65rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 0.35rem; }
    .lab-card__title { margin: 0 0 0.5rem; font-size: 1.05rem; font-weight: 700; color: #e2e8f0; line-height: 1.3; }
    .lab-card__desc { color: #64748b; font-size: 0.82rem; line-height: 1.5; margin: 0 0 0.75rem; }
    .lab-card__outcomes { list-style: none; padding: 0; margin: 0 0 0.75rem; display: flex; flex-direction: column; gap: 0.2rem; }
    .lab-card__outcomes li { font-size: 0.76rem; color: #4ade80; }
    .lab-card__tags { display: flex; flex-wrap: wrap; gap: 0.35rem; }
    .tag {
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
      color: #64748b; font-size: 0.68rem; padding: 0.15rem 0.45rem; border-radius: 4px;
    }

    .lab-card__footer {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.85rem 1.25rem; border-top: 1px solid rgba(255,255,255,0.06);
      background: rgba(0,0,0,0.2); gap: 0.75rem;
    }
    .lab-card__meta { display: flex; gap: 0.75rem; font-size: 0.78rem; color: #64748b; flex-shrink: 0; }
    .xp { color: #f59e0b; }

    /* ── Status area (badge + button stacked) ─────────────────────────────── */
    .lab-card__status-area {
      display: flex; flex-direction: column; align-items: flex-end; gap: 0.4rem;
    }

    .completion-badge {
      display: inline-flex; align-items: center; gap: 0.3rem;
      font-size: 0.7rem; font-weight: 700; color: #4ade80;
      background: rgba(34,197,94,0.12); border: 1px solid rgba(34,197,94,0.25);
      padding: 0.25rem 0.6rem; border-radius: 100px; white-space: nowrap;
    }
    .inprogress-badge {
      display: inline-flex; align-items: center; gap: 0.3rem;
      font-size: 0.7rem; font-weight: 700; color: #fbbf24;
      background: rgba(245,158,11,0.12); border: 1px solid rgba(245,158,11,0.25);
      padding: 0.25rem 0.6rem; border-radius: 100px;
    }

    .btn-start {
      background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white;
      border: none; padding: 0.5rem 1rem; border-radius: 7px;
      font-size: 0.82rem; font-weight: 600; cursor: pointer; font-family: inherit;
      transition: all 0.2s; display: flex; align-items: center; gap: 0.35rem;
    }
    .btn-start:hover:not(:disabled) {
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      box-shadow: 0 4px 16px rgba(99,102,241,0.4);
    }
    .btn-start:disabled { opacity: 0.5; cursor: not-allowed; }

    .btn-reattempt {
      background: rgba(34,197,94,0.12); color: #4ade80;
      border: 1px solid rgba(34,197,94,0.3); padding: 0.45rem 0.9rem; border-radius: 7px;
      font-size: 0.78rem; font-weight: 600; cursor: pointer; font-family: inherit;
      transition: all 0.2s; display: flex; align-items: center; gap: 0.35rem;
    }
    .btn-reattempt:hover:not(:disabled) {
      background: rgba(34,197,94,0.22);
      box-shadow: 0 4px 14px rgba(34,197,94,0.25);
    }
    .btn-reattempt:disabled { opacity: 0.5; cursor: not-allowed; }

    .btn-resume {
      background: rgba(245,158,11,0.12); color: #fbbf24;
      border: 1px solid rgba(245,158,11,0.3); padding: 0.45rem 0.9rem; border-radius: 7px;
      font-size: 0.78rem; font-weight: 600; cursor: pointer; font-family: inherit;
      transition: all 0.2s; display: flex; align-items: center; gap: 0.35rem;
    }
    .btn-resume:hover:not(:disabled) {
      background: rgba(245,158,11,0.22);
      box-shadow: 0 4px 14px rgba(245,158,11,0.25);
    }
    .btn-resume:disabled { opacity: 0.5; cursor: not-allowed; }

    .spinner {
      width: 12px; height: 12px; border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white; border-radius: 50%;
      animation: spin 0.7s linear infinite; display: inline-block;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Empty */
    .labs-empty { text-align: center; padding: 4rem 2rem; color: #475569; }
    .labs-empty__icon { font-size: 2.5rem; margin-bottom: 1rem; }
    .labs-empty h3 { color: #94a3b8; margin: 0 0 0.5rem; }
    .labs-empty p { margin: 0; }

    @media (max-width: 640px) {
      .labs-hero { padding: 2rem 1rem; }
      .labs-body { padding: 1rem; }
      .labs-grid { grid-template-columns: 1fr; }
      .lab-card__footer { flex-wrap: wrap; }
    }
  `],
})
export class ProgramLabsPage {
  private readonly labDefSvc  = inject(LabDefinitionService);
  private readonly sessionSvc = inject(LabSessionService);
  private readonly auth       = inject(AuthService);
  private readonly router     = inject(Router);
  private readonly route      = inject(ActivatedRoute);

  /** programId comes from the parent learner-space route param */
  private readonly programId: string =
    this.route.snapshot.pathFromRoot
      .map((r) => r.paramMap.get('programId'))
      .find((v): v is string => !!v?.trim()) ?? '';

  readonly isStarting = signal(false);
  readonly startingId = signal<string | null>(null);

  // Labs for this specific program
  private readonly labsRaw = toSignal(this.labDefSvc.getLabsByProgram(this.programId));
  readonly isLoading = computed(() => this.labsRaw() === undefined);
  readonly labs      = computed(() => this.labsRaw() ?? []);
  readonly totalXp   = computed(() => this.labs().reduce((s, l) => s + (l.xp ?? 0), 0));

  // ── Completion tracking ────────────────────────────────────────────────────

  /** All SUBMITTED/PASSED sessions for current user */
  private readonly completedSessions = toSignal(
    this.auth.currentUid
      ? this.sessionSvc.getCompletedLabSessions(this.auth.currentUid)
      : of([] as LabSession[]),
    { initialValue: [] as LabSession[] },
  );

  /** All sessions (any status) to detect IN_PROGRESS */
  private readonly allUserSessions = toSignal(
    this.auth.currentUid
      ? this.sessionSvc.getLearnerSessions(this.auth.currentUid)
      : of([] as LabSession[]),
    { initialValue: [] as LabSession[] },
  );

  /** Map: labId → completed sessions */
  private readonly completedByLabId = computed(() => {
    const map = new Map<string, LabSession[]>();
    for (const s of this.completedSessions()) {
      const arr = map.get(s.labId) ?? [];
      arr.push(s);
      map.set(s.labId, arr);
    }
    return map;
  });

  /** Set of labIds with an active IN_PROGRESS session (not submitted) */
  private readonly inProgressLabIds = computed(() => {
    const set = new Set<string>();
    // Only mark as in-progress if genuinely IN_PROGRESS.
    // SUBMITTED/PASSED sessions are handled by isLabCompleted() instead.
    for (const s of this.allUserSessions()) {
      if (s.status === 'IN_PROGRESS') {
        set.add(s.labId);
      }
    }
    return set;
  });

  /** Number of completed labs in this program */
  readonly completedCount = computed(() =>
    this.labs().filter(l => this.completedByLabId().has(l.id)).length
  );

  isLabCompleted(labId: string): boolean {
    return this.completedByLabId().has(labId);
  }

  isLabInProgress(labId: string): boolean {
    return !this.isLabCompleted(labId) && this.inProgressLabIds().has(labId);
  }

  getLabAttemptCount(labId: string): number {
    const sessions = this.completedByLabId().get(labId);
    if (!sessions?.length) return 0;
    return sessions.reduce((max, s) => Math.max(max, s.attempts ?? 1), 1);
  }

  getLabBestScore(labId: string): number {
    const sessions = this.completedByLabId().get(labId);
    if (!sessions?.length) return 0;
    const best = sessions.reduce<LabSession>((prev, curr) =>
      (curr.score / Math.max(curr.maxScore, 1)) > (prev.score / Math.max(prev.maxScore, 1)) ? curr : prev
    , sessions[0]);
    return Math.round((best.score / Math.max(best.maxScore, 1)) * 100);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  getCategoryIcon(cat: string): string {
    return CATEGORY_ICONS[cat] ?? '🔬';
  }

  getDifficultyColor(diff: LabDifficulty): string {
    return DIFFICULTY_COLORS[diff] ?? '#64748b';
  }

  /** Start or resume a lab session (navigates with programId query param) */
  async startLab(lab: LabDefinition): Promise<void> {
    const uid = this.auth.currentUid;
    if (!uid) { await this.router.navigate(['/login']); return; }

    this.isStarting.set(true);
    this.startingId.set(lab.id);
    try {
      const sessionId = await this.sessionSvc.createSession({
        labId: lab.id,
        userId: uid,
        maxScore: lab.xp,
        workspaceStoragePath: `labs/sessions/`,
      });
      await this.router.navigate(
        ['/labs', lab.id, 'session', sessionId],
        { queryParams: { programId: this.programId } }
      );
    } catch (err) {
      console.error('[ProgramLabs] Failed to start lab', err);
    } finally {
      this.isStarting.set(false);
      this.startingId.set(null);
    }
  }

  /** Re-attempt: old session is SUBMITTED so createSession() creates a fresh one */
  async reattemptLab(lab: LabDefinition): Promise<void> {
    const uid = this.auth.currentUid;
    if (!uid) { await this.router.navigate(['/login']); return; }

    this.isStarting.set(true);
    this.startingId.set(lab.id);
    try {
      const sessionId = await this.sessionSvc.createSession({
        labId: lab.id,
        userId: uid,
        maxScore: lab.xp,
        workspaceStoragePath: `labs/sessions/`,
      });
      await this.router.navigate(
        ['/labs', lab.id, 'session', sessionId],
        { queryParams: { programId: this.programId } }
      );
    } catch (err) {
      console.error('[ProgramLabs] Failed to re-attempt lab', err);
    } finally {
      this.isStarting.set(false);
      this.startingId.set(null);
    }
  }
}
