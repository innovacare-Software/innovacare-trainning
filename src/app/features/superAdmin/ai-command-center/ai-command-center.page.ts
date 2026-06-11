import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/auth';
import { OrgContextService } from '../../../core/organization/org-context.service';
import { AiCommandCenterService, CommandCenterSnapshot, AgentDefinition } from './ai-command-center.service';

@Component({
  selector: 'app-ai-command-center-page',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
    <section class="ai-page">
      <header class="hero">
        <div>
          <p class="eyebrow">Agentic AI Learning OS</p>
          <h1>AI Command Center</h1>
          <p class="subcopy">
            {{ scopeMode() === 'org' ? 'Pilot your organization AI workspace for learner success, readiness, faculty interventions and completion recovery.' : 'Pilot the first digital workforce layer for learner success, readiness, revenue and executive intelligence.' }}
          </p>
          <p class="stamp" *ngIf="scopeMode() === 'org' && orgId()">Organization scope: {{ orgId() }}</p>
          <p class="stamp" *ngIf="snapshot() as data">Last snapshot: {{ data.generatedAt | date:'medium' }}</p>
        </div>
        <div class="hero-actions">
          <button type="button" class="btn primary" (click)="refresh()" [disabled]="loading()">
            {{ loading() ? 'Refreshing…' : 'Refresh snapshot' }}
          </button>
          <button *ngIf="scopeMode() !== 'org'" type="button" class="btn" (click)="runExecutiveSweep()" [disabled]="runningAgent() !== null">
            Run executive sweep
          </button>
        </div>
      </header>

      <section class="metric-grid" *ngIf="snapshot() as data">
        <article class="metric-card">
          <span class="label">Organizations</span>
          <strong>{{ data.metrics.organizations }}</strong>
        </article>
        <article class="metric-card">
          <span class="label">Learners</span>
          <strong>{{ data.metrics.learners }}</strong>
        </article>
        <article class="metric-card warning">
          <span class="label">Open recommendations</span>
          <strong>{{ data.metrics.openRecommendations }}</strong>
        </article>
        <article class="metric-card critical">
          <span class="label">Pending approvals</span>
          <strong>{{ data.metrics.pendingApprovals }}</strong>
        </article>
        <article class="metric-card">
          <span class="label">Completed runs (7d)</span>
          <strong>{{ data.metrics.completedRuns7d }}</strong>
        </article>
      </section>

      <p class="error" *ngIf="error()">{{ error() }}</p>

      <section class="agent-grid" *ngIf="snapshot() as data">
        <article class="agent-card" *ngFor="let agent of data.agents">
          <div class="agent-card__head">
            <div>
              <h2>{{ agent.name }}</h2>
              <p>{{ agent.goal }}</p>
            </div>
            <button type="button" class="btn small" (click)="runAgent(agent)" [disabled]="runningAgent() === agent.id">
              {{ runningAgent() === agent.id ? 'Running…' : 'Run now' }}
            </button>
          </div>
          <p class="micro-label">Responsibilities</p>
          <ul>
            <li *ngFor="let item of agent.responsibilities">{{ item }}</li>
          </ul>
          <p class="micro-label">Memory</p>
          <p class="mono">{{ agent.memoryCollections.join(' · ') }}</p>
          <p class="micro-label">Escalation</p>
          <p>{{ agent.escalationPaths.join(' -> ') }}</p>
        </article>
      </section>

      <section class="panel-grid" *ngIf="snapshot() as data">
        <article class="panel">
          <div class="panel-head">
            <h2>Recent runs</h2>
            <span>{{ data.recentRuns.length }}</span>
          </div>
          <div class="list" *ngIf="data.recentRuns.length; else emptyRuns">
            <article class="list-item" *ngFor="let run of data.recentRuns">
              <div class="list-item__top">
                <strong>{{ labelForAgent(run.agentId, data.agents) }}</strong>
                <span class="pill" [class]="'pill ' + run.status">{{ run.status }}</span>
              </div>
              <p>{{ run.summary }}</p>
              <small>
                Confidence {{ asPercent(run.confidenceScore) }} · {{ run.createdAt | date:'short' }}
              </small>
            </article>
          </div>
        </article>

        <article class="panel">
          <div class="panel-head">
            <h2>Open recommendations</h2>
            <span>{{ data.recommendations.length }}</span>
          </div>
          <div class="list" *ngIf="data.recommendations.length; else emptyRecommendations">
            <article class="list-item recommendation" *ngFor="let rec of data.recommendations">
              <div class="list-item__top">
                <strong>{{ rec.title }}</strong>
                <span class="pill priority-{{ rec.priority }}">{{ rec.priority }}</span>
              </div>
              <p>{{ rec.summary }}</p>
              <small>
                {{ labelForAgent(rec.agentId, data.agents) }} · Confidence {{ asPercent(rec.confidenceScore) }}
              </small>
            </article>
          </div>
        </article>

        <article class="panel approvals">
          <div class="panel-head">
            <h2>Approval queue</h2>
            <span>{{ data.pendingApprovals.length }}</span>
          </div>
          <p class="panel-note" *ngIf="!canReviewApprovals()">Platform approval remains restricted to super admins. Org admins can monitor queued actions here.</p>
          <div class="list" *ngIf="data.pendingApprovals.length; else emptyApprovals">
            <article class="list-item approval" *ngFor="let item of data.pendingApprovals">
              <div class="list-item__top">
                <strong>{{ item.title }}</strong>
                <span class="pill pending">{{ item.approvalType }}</span>
              </div>
              <small>
                {{ labelForAgent(item.agentId, data.agents) }} · Confidence {{ asPercent(item.confidenceScore) }}
              </small>
              <div class="approval-actions" *ngIf="canReviewApprovals()">
                <button type="button" class="btn success" (click)="review(item.id, 'approved')">Approve</button>
                <button type="button" class="btn danger" (click)="review(item.id, 'rejected')">Reject</button>
              </div>
            </article>
          </div>
        </article>
      </section>

      <ng-template #emptyRuns>
        <p class="empty-state">No agent runs yet.</p>
      </ng-template>
      <ng-template #emptyRecommendations>
        <p class="empty-state">No open recommendations.</p>
      </ng-template>
      <ng-template #emptyApprovals>
        <p class="empty-state">No approval item is waiting for human review.</p>
      </ng-template>
    </section>
  `,
  styles: [`
    .ai-page { padding: 1.25rem; display: grid; gap: 1rem; background: linear-gradient(180deg, #f5f9ff 0%, #eef4fb 100%); min-height: 100%; }
    .hero { display: flex; justify-content: space-between; gap: 1rem; align-items: start; background: linear-gradient(135deg, #0f2742 0%, #1f4d78 70%, #3d7db7 100%); color: #fff; border-radius: 18px; padding: 1.25rem 1.35rem; box-shadow: 0 20px 50px rgba(17, 48, 79, .18); }
    .eyebrow { text-transform: uppercase; letter-spacing: .12em; font-size: .78rem; opacity: .78; margin: 0 0 .35rem; }
    .hero h1 { margin: 0 0 .35rem; font-size: clamp(1.7rem, 2vw, 2.4rem); }
    .subcopy { margin: 0; max-width: 52rem; color: rgba(255,255,255,.86); }
    .stamp { margin-top: .75rem; font-size: .82rem; color: rgba(255,255,255,.76); }
    .hero-actions { display: flex; gap: .65rem; flex-wrap: wrap; justify-content: flex-end; }
    .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: .85rem; }
    .metric-card { background: #fff; border: 1px solid #d8e4f0; border-radius: 16px; padding: 1rem; box-shadow: 0 8px 24px rgba(31, 77, 120, .08); }
    .metric-card .label { display: block; text-transform: uppercase; font-size: .74rem; letter-spacing: .08em; color: #4f6f8f; margin-bottom: .35rem; }
    .metric-card strong { font-size: 1.8rem; color: #11304f; }
    .metric-card.warning { background: #fff8eb; }
    .metric-card.critical { background: #fff1f1; }
    .agent-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(290px, 1fr)); gap: 1rem; }
    .agent-card, .panel { background: rgba(255,255,255,.92); backdrop-filter: blur(8px); border: 1px solid #d8e4f0; border-radius: 18px; padding: 1rem; box-shadow: 0 10px 28px rgba(31, 77, 120, .08); }
    .agent-card__head, .panel-head, .list-item__top { display: flex; justify-content: space-between; gap: .75rem; align-items: start; }
    .agent-card h2, .panel h2 { margin: 0 0 .3rem; color: #11304f; font-size: 1.05rem; }
    .agent-card p, .list-item p { margin: 0; color: #47637f; }
    .micro-label { margin-top: .85rem !important; font-size: .72rem; text-transform: uppercase; letter-spacing: .08em; color: #6a86a4; font-weight: 700; }
    .mono { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: .78rem; }
    ul { margin: .45rem 0 0; padding-left: 1rem; color: #35516e; }
    .panel-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1rem; }
    .panel-head span { background: #eaf2fa; color: #1f4d78; border-radius: 999px; padding: .15rem .55rem; font-size: .78rem; font-weight: 700; }
    .panel-note { margin: .65rem 0 0; color: #5f7c98; font-size: .84rem; }
    .list { display: grid; gap: .75rem; margin-top: .85rem; }
    .list-item { border: 1px solid #e2ebf4; border-radius: 14px; padding: .85rem; background: #fbfdff; display: grid; gap: .4rem; }
    .pill { display: inline-flex; align-items: center; border-radius: 999px; padding: .12rem .45rem; font-size: .72rem; text-transform: uppercase; letter-spacing: .06em; background: #e3edf8; color: #1f4d78; }
    .pill.completed { background: #e8f8ee; color: #15693a; }
    .pill.failed { background: #fdecec; color: #a12828; }
    .pill.running { background: #eef5ff; color: #275ea1; }
    .pill.queued, .pill.pending { background: #fff4db; color: #8f5b05; }
    .pill.priority-critical { background: #ffe4e4; color: #9c1717; }
    .pill.priority-high { background: #fff0dc; color: #8a4f00; }
    .pill.priority-medium { background: #edf5ff; color: #1f4d78; }
    .pill.priority-low { background: #eef4f9; color: #4e6b88; }
    .approval-actions { display: flex; gap: .55rem; margin-top: .25rem; }
    .btn { border: 1px solid #c6d8ea; border-radius: 10px; padding: .55rem .85rem; background: #fff; color: #11304f; font-weight: 700; cursor: pointer; }
    .btn.small { padding: .45rem .7rem; font-size: .82rem; }
    .btn.primary { background: #f6b73c; border-color: #f6b73c; color: #18283a; }
    .btn.success { background: #e9f8ee; color: #166b3c; }
    .btn.danger { background: #fff1f1; color: #9c1717; }
    .btn:disabled { opacity: .6; cursor: not-allowed; }
    .error { margin: 0; color: #a12828; font-weight: 700; }
    .empty-state { margin: .8rem 0 0; color: #6a86a4; }
    @media (max-width: 900px) {
      .hero { flex-direction: column; }
      .hero-actions { justify-content: start; }
    }
  `],
})
export class AiCommandCenterPage {
  private readonly service = inject(AiCommandCenterService);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly orgContext = inject(OrgContextService);

  readonly profile = toSignal(this.auth.profile$, { initialValue: null });
  readonly context = toSignal(this.orgContext.context$, { initialValue: null });
  readonly scopeMode = computed<'global' | 'org'>(() => this.route.snapshot.data['aiScopeMode'] === 'org' ? 'org' : 'global');
  readonly orgId = computed(() => this.scopeMode() === 'org' ? this.context()?.orgId || this.profile()?.orgId || null : null);
  readonly canReviewApprovals = computed(() => this.scopeMode() === 'global' && this.profile()?.role === 'super_admin');

  readonly snapshot = signal<CommandCenterSnapshot | null>(null);
  readonly loading = signal(false);
  readonly runningAgent = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  constructor() {
    void this.refresh();
  }

  readonly agentCount = computed(() => this.snapshot()?.agents.length ?? 0);

  async refresh(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      this.snapshot.set(await this.service.getSnapshot({ organizationId: this.orgId() }));
    } catch (error: unknown) {
      this.error.set(this.messageFromError(error, 'Unable to load AI Command Center snapshot.'));
    } finally {
      this.loading.set(false);
    }
  }

  async runAgent(agent: AgentDefinition): Promise<void> {
    this.runningAgent.set(agent.id);
    this.error.set(null);
    try {
      await this.service.runAgent({ agentId: agent.id, organizationId: this.orgId() });
      await this.refresh();
    } catch (error: unknown) {
      this.error.set(this.messageFromError(error, `Unable to run ${agent.name}.`));
    } finally {
      this.runningAgent.set(null);
    }
  }

  async runExecutiveSweep(): Promise<void> {
    const snapshot = this.snapshot();
    const executiveAgent = snapshot?.agents.find((agent) => agent.id === 'executive_insights');
    if (executiveAgent) {
      await this.runAgent(executiveAgent);
    }
  }

  async review(itemId: string, status: 'approved' | 'rejected'): Promise<void> {
    if (!this.canReviewApprovals()) {
      return;
    }
    this.error.set(null);
    try {
      await this.service.reviewApproval({ itemId, status });
      await this.refresh();
    } catch (error: unknown) {
      this.error.set(this.messageFromError(error, 'Unable to review approval item.'));
    }
  }

  labelForAgent(agentId: string, agents: AgentDefinition[]): string {
    return agents.find((agent) => agent.id === agentId)?.name || agentId;
  }

  asPercent(value: number): string {
    return `${Math.round((value || 0) * 100)}%`;
  }

  private messageFromError(error: unknown, fallback: string): string {
    const details = String((error as { details?: unknown })?.details || '').trim();
    const message = String((error as { message?: string })?.message || '').trim();
    return details || message || fallback;
  }
}
