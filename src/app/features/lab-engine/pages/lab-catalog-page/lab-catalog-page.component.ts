import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { LabDefinitionService } from '../../services/lab-definition.service';
import { LabSessionService } from '../../services/lab-session.service';
import { AuthService } from '../../../../core/auth';
import { LabDefinition, LabCategory, LabDifficulty } from '../../models/lab-definition.model';
import { LabSession } from '../../models/lab-session.model';

const CATEGORY_LABELS: Record<LabCategory, string> = {
  'devops':           'DevOps & CI/CD',
  'cloud':            'Cloud & GCP',
  'linux':            'Linux & SysAdmin',
  'web-development':  'Angular / Web Dev',
  'agentic-ai':       'Agentic AI',
  'ai-agent-creation':'AI Agent Creation',
  'rag-prompt-stack': 'RAG & Prompt Stack',
  'sysadmin-aiops':   'SysAdmin AI Ops',
};

const CATEGORY_ICONS: Record<LabCategory, string> = {
  'devops':           '⚙️',
  'cloud':            '☁️',
  'linux':            '🐧',
  'web-development':  '🌐',
  'agentic-ai':       '🤖',
  'ai-agent-creation':'🧠',
  'rag-prompt-stack': '📚',
  'sysadmin-aiops':   '🛡️',
};

const DIFFICULTY_COLORS: Record<LabDifficulty, string> = {
  'beginner':    '#22c55e',
  'intermediate':'#f59e0b',
  'advanced':    '#ef4444',
  'enterprise':  '#8b5cf6',
};

@Component({
  selector: 'app-lab-catalog-page',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="lab-catalog">
      <!-- Hero Header -->
      <header class="catalog-hero">
        <div class="catalog-hero__inner">
          <div class="catalog-hero__badge">🔬 INNOVACARE LAB ENGINE</div>
          <h1 class="catalog-hero__title">Interactive Technical Labs</h1>
          <p class="catalog-hero__subtitle">
            Hands-on enterprise lab environments for DevOps, Cloud, AI, and more.
            Read the mission. Build. Validate. Ship.
          </p>
          <div class="catalog-hero__stats">
            <div class="stat-chip">
              <span class="stat-chip__num">{{ totalLabs() }}</span>
              <span class="stat-chip__label">Labs Available</span>
            </div>
            <div class="stat-chip">
              <span class="stat-chip__num">{{ categories().length }}</span>
              <span class="stat-chip__label">Categories</span>
            </div>
            <div class="stat-chip">
              <span class="stat-chip__num">{{ totalXp() | number }}</span>
              <span class="stat-chip__label">Total XP</span>
            </div>
          </div>
        </div>
      </header>

      <!-- Category Filter Bar -->
      <nav class="catalog-filters" aria-label="Lab categories">
        <button
          class="filter-btn"
          [class.filter-btn--active]="activeCategory() === null"
          (click)="setCategory(null)"
          id="filter-all">
          All Labs
        </button>
        @for (cat of categories(); track cat) {
          <button
            class="filter-btn"
            [class.filter-btn--active]="activeCategory() === cat"
            (click)="setCategory(cat)"
            [id]="'filter-' + cat">
            {{ getCategoryIcon(cat) }} {{ getCategoryLabel(cat) }}
          </button>
        }
      </nav>

      <!-- Lab Grid -->
      <main class="catalog-grid-wrapper">
        @if (isLoading()) {
          <div class="catalog-loading">
            @for (i of [1,2,3,4,5,6]; track i) {
              <div class="lab-card lab-card--skeleton"></div>
            }
          </div>
        } @else if (filteredLabs().length === 0) {
          <div class="catalog-empty">
            <div class="catalog-empty__icon">🔬</div>
            <h3>No labs available in this category yet</h3>
            <p>New labs are added regularly. Check back soon!</p>
            <button class="btn-primary" (click)="setCategory(null)">View All Labs</button>
          </div>
        } @else {
          <div class="catalog-grid">
            @for (lab of filteredLabs(); track lab.id) {
              <article class="lab-card" [attr.data-difficulty]="lab.difficulty">
                <!-- Card Header -->
                <div class="lab-card__header">
                  <div class="lab-card__category-icon">{{ getCategoryIcon(lab.category) }}</div>
                  <span class="lab-card__type-badge" [class]="'badge--' + lab.labType">
                    {{ getTypeBadge(lab.labType) }}
                  </span>
                </div>

                <!-- Card Content -->
                <div class="lab-card__body">
                  <div class="lab-card__difficulty" [style.color]="getDifficultyColor(lab.difficulty)">
                    {{ lab.difficulty | uppercase }}
                  </div>
                  <h2 class="lab-card__title">{{ lab.title }}</h2>
                  <p class="lab-card__desc">{{ lab.description }}</p>

                  <!-- Outcomes -->
                  @if (lab.learningOutcomes?.length) {
                    <ul class="lab-card__outcomes">
                      @for (outcome of lab.learningOutcomes.slice(0, 3); track outcome) {
                        <li>✓ {{ outcome }}</li>
                      }
                    </ul>
                  }

                  <!-- Tags -->
                  <div class="lab-card__tags">
                    @for (tag of lab.tags.slice(0, 4); track tag) {
                      <span class="tag">{{ tag }}</span>
                    }
                  </div>
                </div>

                <!-- Card Footer -->
                <div class="lab-card__footer">
                  <div class="lab-card__meta">
                    <span class="meta-item">⏱ {{ lab.estimatedMinutes }} min</span>
                    <span class="meta-item xp">⚡ {{ lab.xp }} XP</span>
                  </div>

                  @if (isLabCompleted(lab.id)) {
                    <!-- Completed state -->
                    <div class="lab-card__completion">
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
                        [disabled]="isStarting()">
                        @if (isStarting() && startingLabId() === lab.id) {
                          <span class="spinner"></span>
                        } @else {
                          🔄 Re-attempt
                        }
                      </button>
                    </div>
                  } @else if (isLabInProgress(lab.id)) {
                    <!-- In-Progress state -->
                    <div class="lab-card__completion">
                      <span class="inprogress-badge">⏸ In Progress</span>
                      <button
                        class="btn-resume"
                        [id]="'resume-lab-' + lab.id"
                        (click)="startLab(lab)"
                        [disabled]="isStarting()">
                        @if (isStarting() && startingLabId() === lab.id) {
                          <span class="spinner"></span> Starting...
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
                      [disabled]="isStarting()">
                      @if (isStarting() && startingLabId() === lab.id) {
                        <span class="spinner"></span> Starting...
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
      </main>
    </div>
  `,
  styles: [`
    /* ── Lab Catalog ───────────────────────────────────────────────────────── */
    .lab-catalog {
      min-height: 100vh;
      background: #0a0d14;
      color: #e2e8f0;
      font-family: 'Inter', system-ui, sans-serif;
    }

    /* ── Hero ─────────────────────────────────────────────────────────────── */
    .catalog-hero {
      background: linear-gradient(135deg, #0f1629 0%, #1a1f35 50%, #0f1629 100%);
      border-bottom: 1px solid rgba(99,102,241,0.3);
      padding: 4rem 2rem 3rem;
      position: relative;
      overflow: hidden;
    }
    .catalog-hero::before {
      content: '';
      position: absolute;
      top: -60%;
      left: -20%;
      width: 600px;
      height: 600px;
      background: radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%);
      border-radius: 50%;
    }
    .catalog-hero__inner {
      max-width: 1200px;
      margin: 0 auto;
      position: relative;
      z-index: 1;
    }
    .catalog-hero__badge {
      display: inline-block;
      background: linear-gradient(90deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2));
      border: 1px solid rgba(99,102,241,0.4);
      color: #a5b4fc;
      padding: 0.3rem 1rem;
      border-radius: 100px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin-bottom: 1.2rem;
    }
    .catalog-hero__title {
      font-size: clamp(1.8rem, 4vw, 3rem);
      font-weight: 800;
      background: linear-gradient(135deg, #e2e8f0 0%, #a5b4fc 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin: 0 0 1rem;
    }
    .catalog-hero__subtitle {
      color: #94a3b8;
      font-size: 1.1rem;
      max-width: 600px;
      margin: 0 0 2rem;
      line-height: 1.6;
    }
    .catalog-hero__stats {
      display: flex;
      gap: 1.5rem;
      flex-wrap: wrap;
    }
    .stat-chip {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 0.75rem 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .stat-chip__num {
      font-size: 1.5rem;
      font-weight: 800;
      color: #a5b4fc;
    }
    .stat-chip__label {
      font-size: 0.75rem;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    /* ── Filters ──────────────────────────────────────────────────────────── */
    .catalog-filters {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      padding: 1.5rem 2rem;
      max-width: 1200px;
      margin: 0 auto;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .filter-btn {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.1);
      color: #94a3b8;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.2s;
      font-family: inherit;
    }
    .filter-btn:hover { background: rgba(99,102,241,0.1); color: #e2e8f0; border-color: rgba(99,102,241,0.4); }
    .filter-btn--active { background: rgba(99,102,241,0.2); color: #a5b4fc; border-color: #6366f1; }

    /* ── Grid ─────────────────────────────────────────────────────────────── */
    .catalog-grid-wrapper {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }
    .catalog-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 1.5rem;
    }

    /* ── Lab Card ─────────────────────────────────────────────────────────── */
    .lab-card {
      background: linear-gradient(135deg, #111827 0%, #1e293b 100%);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: transform 0.25s, box-shadow 0.25s, border-color 0.25s;
    }
    .lab-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.3);
      border-color: rgba(99,102,241,0.3);
    }
    .lab-card--skeleton {
      height: 380px;
      background: linear-gradient(90deg, #1e293b 25%, #263447 50%, #1e293b 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    .lab-card__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1.5rem 0;
    }
    .lab-card__category-icon { font-size: 2rem; }
    .lab-card__type-badge {
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 0.25rem 0.6rem;
      border-radius: 6px;
    }
    .badge--browser     { background: rgba(34,197,94,0.15);  color: #4ade80; }
    .badge--agent-config{ background: rgba(99,102,241,0.15); color: #a5b4fc; }
    .badge--cloud-guided{ background: rgba(14,165,233,0.15); color: #38bdf8; }
    .badge--container-future { background: rgba(107,114,128,0.15); color: #9ca3af; }

    .lab-card__body {
      padding: 1rem 1.5rem;
      flex: 1;
    }
    .lab-card__difficulty {
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      margin-bottom: 0.4rem;
    }
    .lab-card__title {
      font-size: 1.15rem;
      font-weight: 700;
      color: #e2e8f0;
      margin: 0 0 0.6rem;
      line-height: 1.3;
    }
    .lab-card__desc {
      color: #64748b;
      font-size: 0.875rem;
      line-height: 1.55;
      margin: 0 0 0.9rem;
    }
    .lab-card__outcomes {
      list-style: none;
      padding: 0;
      margin: 0 0 0.9rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .lab-card__outcomes li {
      font-size: 0.8rem;
      color: #4ade80;
    }
    .lab-card__tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }
    .tag {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.08);
      color: #64748b;
      font-size: 0.72rem;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
    }

    .lab-card__footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.5rem;
      border-top: 1px solid rgba(255,255,255,0.06);
      background: rgba(0,0,0,0.2);
    }
    .lab-card__meta {
      display: flex;
      gap: 1rem;
    }
    .meta-item {
      font-size: 0.8rem;
      color: #64748b;
    }
    .meta-item.xp { color: #f59e0b; }

    .btn-start {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
      border: none;
      padding: 0.6rem 1.25rem;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-family: inherit;
    }
    .btn-start:hover:not(:disabled) {
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      transform: translateY(-1px);
      box-shadow: 0 4px 20px rgba(99,102,241,0.4);
    }
    .btn-start:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

    /* ── Completion / Progress State Styles ───────────────────────────────── */
    .lab-card__completion {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      width: 100%;
    }

    .completion-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.75rem;
      font-weight: 700;
      color: #4ade80;
      background: rgba(34,197,94,0.12);
      border: 1px solid rgba(34,197,94,0.25);
      padding: 0.3rem 0.7rem;
      border-radius: 100px;
      letter-spacing: 0.02em;
    }

    .inprogress-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.75rem;
      font-weight: 700;
      color: #fbbf24;
      background: rgba(245,158,11,0.12);
      border: 1px solid rgba(245,158,11,0.25);
      padding: 0.3rem 0.7rem;
      border-radius: 100px;
    }

    .btn-reattempt {
      background: linear-gradient(135deg, rgba(34,197,94,0.15), rgba(16,185,129,0.15));
      color: #4ade80;
      border: 1px solid rgba(34,197,94,0.3);
      padding: 0.5rem 1rem;
      border-radius: 8px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-family: inherit;
    }
    .btn-reattempt:hover:not(:disabled) {
      background: linear-gradient(135deg, rgba(34,197,94,0.25), rgba(16,185,129,0.25));
      transform: translateY(-1px);
      box-shadow: 0 4px 16px rgba(34,197,94,0.25);
    }
    .btn-reattempt:disabled { opacity: 0.6; cursor: not-allowed; }

    .btn-resume {
      background: linear-gradient(135deg, rgba(245,158,11,0.15), rgba(251,191,36,0.1));
      color: #fbbf24;
      border: 1px solid rgba(245,158,11,0.3);
      padding: 0.5rem 1rem;
      border-radius: 8px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-family: inherit;
    }
    .btn-resume:hover:not(:disabled) {
      background: linear-gradient(135deg, rgba(245,158,11,0.25), rgba(251,191,36,0.2));
      transform: translateY(-1px);
      box-shadow: 0 4px 16px rgba(245,158,11,0.25);
    }
    .btn-resume:disabled { opacity: 0.6; cursor: not-allowed; }

    .btn-primary {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
    }

    /* ── Loading / Empty ──────────────────────────────────────────────────── */
    .catalog-loading {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 1.5rem;
    }
    .catalog-empty {
      text-align: center;
      padding: 4rem 2rem;
      color: #475569;
    }
    .catalog-empty__icon { font-size: 3rem; margin-bottom: 1rem; }
    .catalog-empty h3 { color: #94a3b8; margin-bottom: 0.5rem; }

    .spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      display: inline-block;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Responsive ───────────────────────────────────────────────────────── */
    @media (max-width: 768px) {
      .catalog-hero { padding: 2rem 1rem 2rem; }
      .catalog-filters { padding: 1rem; }
      .catalog-grid-wrapper { padding: 1rem; }
      .catalog-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class LabCatalogPageComponent implements OnInit {
  private readonly labDefSvc    = inject(LabDefinitionService);
  private readonly sessionSvc   = inject(LabSessionService);
  private readonly auth         = inject(AuthService);
  private readonly router       = inject(Router);

  readonly labs           = toSignal(this.labDefSvc.getPublishedLabs(), { initialValue: [] });
  readonly isLoading      = signal(true);
  readonly activeCategory = signal<LabCategory | null>(null);
  readonly isStarting     = signal(false);
  readonly startingLabId  = signal<string | null>(null);

  // ── Completion tracking ────────────────────────────────────────────────────

  /** All SUBMITTED/PASSED sessions for current user — loaded once, reactive */
  private readonly completedSessions = toSignal(
    this.auth.currentUid
      ? this.sessionSvc.getCompletedLabSessions(this.auth.currentUid)
      : of([] as LabSession[]),
    { initialValue: [] as LabSession[] },
  );

  /** All sessions (any status) for current user — to detect "in progress" */
  private readonly allUserSessions = toSignal(
    this.auth.currentUid
      ? this.sessionSvc.getLearnerSessions(this.auth.currentUid)
      : of([] as LabSession[]),
    { initialValue: [] as LabSession[] },
  );

  /** Map: labId → best completed session (highest score) */
  private readonly completedByLabId = computed(() => {
    const map = new Map<string, LabSession[]>();
    for (const s of this.completedSessions()) {
      const existing = map.get(s.labId) ?? [];
      existing.push(s);
      map.set(s.labId, existing);
    }
    return map;
  });

  /** Set of labIds that have an active IN_PROGRESS session (not submitted) */
  private readonly inProgressLabIds = computed(() => {
    const set = new Set<string>();
    // Only mark as in-progress if the session is genuinely IN_PROGRESS.
    // SUBMITTED/PASSED sessions are handled by isLabCompleted() instead.
    for (const s of this.allUserSessions()) {
      if (s.status === 'IN_PROGRESS') {
        set.add(s.labId);
      }
    }
    return set;
  });

  /** Whether a lab has at least one submitted/passed session */
  isLabCompleted(labId: string): boolean {
    return this.completedByLabId().has(labId);
  }

  /** Whether a lab has an active but not-yet-submitted session */
  isLabInProgress(labId: string): boolean {
    return !this.isLabCompleted(labId) && this.inProgressLabIds().has(labId);
  }

  /** Total number of submission attempts for a lab */
  getLabAttemptCount(labId: string): number {
    const sessions = this.completedByLabId().get(labId);
    if (!sessions?.length) return 0;
    // Use reduce instead of Math.max spread to avoid TS2532 on empty array
    return sessions.reduce((max, s) => Math.max(max, s.attempts ?? 1), 1);
  }

  /** Best score percentage across all attempts */
  getLabBestScore(labId: string): number {
    const sessions = this.completedByLabId().get(labId);
    if (!sessions?.length) return 0;
    const best = sessions.reduce<LabSession>((prev, curr) =>
      (curr.score / Math.max(curr.maxScore, 1)) > (prev.score / Math.max(prev.maxScore, 1)) ? curr : prev
    , sessions[0]);
    return Math.round((best.score / Math.max(best.maxScore, 1)) * 100);
  }

  // ── Computed catalog state ─────────────────────────────────────────────────

  readonly categories = computed(() => {
    const cats = new Set(this.labs().map((l) => l.category));
    return Array.from(cats) as LabCategory[];
  });

  readonly filteredLabs = computed(() => {
    const cat = this.activeCategory();
    const all = this.labs();
    return cat ? all.filter((l) => l.category === cat) : all;
  });

  readonly totalLabs     = computed(() => this.labs().length);
  readonly totalXp       = computed(() => this.labs().reduce((sum, l) => sum + (l.xp ?? 0), 0));
  readonly completedLabs = computed(() => this.completedByLabId().size);

  constructor() {
    effect(() => {
      if (this.labs().length >= 0) {
        this.isLoading.set(false);
      }
    }, { allowSignalWrites: true });
    setTimeout(() => this.isLoading.set(false), 3000);
  }

  ngOnInit(): void {}

  setCategory(cat: LabCategory | null): void {
    this.activeCategory.set(cat);
  }

  getCategoryLabel(cat: LabCategory): string {
    return CATEGORY_LABELS[cat] ?? cat;
  }

  getCategoryIcon(cat: LabCategory): string {
    return CATEGORY_ICONS[cat] ?? '🔬';
  }

  getDifficultyColor(diff: LabDifficulty): string {
    return DIFFICULTY_COLORS[diff] ?? '#64748b';
  }

  getTypeBadge(type: string): string {
    const badges: Record<string, string> = {
      'browser':          'Browser Lab',
      'agent-config':     'Agent Config',
      'cloud-guided':     'Cloud Guided',
      'container-future': 'Container (Soon)',
    };
    return badges[type] ?? type;
  }

  /** Start or resume a lab session */
  async startLab(lab: LabDefinition): Promise<void> {
    const uid = this.auth.currentUid;
    if (!uid) { this.router.navigate(['/login']); return; }

    this.isStarting.set(true);
    this.startingLabId.set(lab.id);
    try {
      const sessionId = await this.sessionSvc.createSession({
        labId: lab.id,
        userId: uid,
        maxScore: lab.xp,
        workspaceStoragePath: `labs/sessions/`,
      });
      await this.router.navigate(['/labs', lab.id, 'session', sessionId]);
    } catch (err) {
      console.error('[LabCatalog] Failed to start lab', err);
    } finally {
      this.isStarting.set(false);
      this.startingLabId.set(null);
    }
  }

  /** Create a fresh new session for re-attempt (bypasses the idempotency check) */
  async reattemptLab(lab: LabDefinition): Promise<void> {
    const uid = this.auth.currentUid;
    if (!uid) { this.router.navigate(['/login']); return; }

    this.isStarting.set(true);
    this.startingLabId.set(lab.id);
    try {
      // Force a new session by directly creating without the active-session check
      const { addDoc, updateDoc, doc, collection, serverTimestamp } =
        await import('@angular/fire/firestore');
      const { getFirestore } = await import('@angular/fire/firestore');
      // Use createSession — it will resume if an IN_PROGRESS session exists
      // After submission the old session is SUBMITTED so a new one will be created
      const sessionId = await this.sessionSvc.createSession({
        labId: lab.id,
        userId: uid,
        maxScore: lab.xp,
        workspaceStoragePath: `labs/sessions/`,
      });
      await this.router.navigate(['/labs', lab.id, 'session', sessionId]);
    } catch (err) {
      console.error('[LabCatalog] Failed to re-attempt lab', err);
    } finally {
      this.isStarting.set(false);
      this.startingLabId.set(null);
    }
  }
}
