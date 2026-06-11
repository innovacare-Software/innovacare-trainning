import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth';
import { EMPTY_ORG_CONTEXT, OrgContextService } from '../../core/organization/org-context.service';
import { OrganizationAdminDashboardService } from '../../core/organization/services/organization-admin-dashboard.service';
import { SuperAdminOrganizationsService } from '../superAdmin/services/super-admin-organizations';
import { LanguageSwitcherComponent } from '../../shared/components/language-switcher/language-switcher.component';
import { GlobalSearchTriggerComponent } from '../../shared/global-search/global-search-trigger.component';
import { OnboardingTriggerComponent } from '../../shared/onboarding/onboarding-trigger.component';

@Component({
  selector: 'app-org-admin-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, LanguageSwitcherComponent, GlobalSearchTriggerComponent, OnboardingTriggerComponent],
  template: `
    <section class="oa-shell">
      <header class="oa-topbar">
        <div class="oa-topbar__copy">
          <span>Organization admin dashboard</span>
          <strong>Session controls, navigation shortcuts and logout stay available.</strong>
        </div>
        <div class="oa-topbar__actions">
          <app-global-search-trigger></app-global-search-trigger>
          <app-onboarding-trigger></app-onboarding-trigger>
          <a routerLink="/admin-spaces" class="oa-topbar-link">Switch space</a>
          <app-language-switcher></app-language-switcher>
          <button type="button" class="oa-topbar-logout" (click)="logout()">Logout</button>
        </div>
      </header>

      <header class="oa-top">
        <div class="oa-top-copy">
          <p class="oa-kicker">Admin Level 2 · Organization Control Center</p>
          <h1 class="oa-org-name">{{ orgName() || 'Organization Admin' }}</h1>
          <p>Operate users, assignments, compliance and interventions from a single org-scoped workspace.</p>
          <p class="oa-org-context">Role: <strong>{{ roleLabel() }}</strong></p>
        </div>
        <div class="oa-top-actions">
          <app-global-search-trigger></app-global-search-trigger>
          <app-onboarding-trigger></app-onboarding-trigger>
          <a routerLink="/admin-spaces" class="oa-link-pill oa-link-pill--secondary">Switch admin space</a>
          <a routerLink="/learner" class="oa-link-pill">Learner</a>
          <div class="pill">Scope locked to orgId</div>
        </div>
      </header>

      <section class="oa-summary" *ngIf="stats() as stats; else shellLoadingTpl">
        <article>
          <span>Total users</span>
          <strong>{{ stats.totalUsers }}</strong>
          <p>{{ stats.activeLearners }} active learners in scope</p>
        </article>
        <article>
          <span>Assignments</span>
          <strong>{{ stats.assignedCourses }}</strong>
          <p>{{ stats.assignmentCoverageRate }}% assignment coverage</p>
        </article>
        <article>
          <span>Progress</span>
          <strong>{{ stats.averageProgress }}%</strong>
          <p>{{ stats.completionRate }}% completion rate</p>
        </article>
        <article>
          <span>Intervention</span>
          <strong>{{ stats.usersAtRisk }}</strong>
          <p>{{ stats.overdueCount }} overdue and {{ stats.activeAlerts }} active alerts</p>
        </article>
      </section>

      <nav class="oa-nav">
        <a routerLink="/org-admin/dashboard" routerLinkActive="active">Overview</a>
        <a routerLink="/org-admin/ai-command-center" routerLinkActive="active">AI Command Center</a>
        <a routerLink="/org-admin/communication-center" routerLinkActive="active">Communication Center</a>
        <a routerLink="/org-admin/users" routerLinkActive="active">Users</a>
        <a routerLink="/org-admin/courses" routerLinkActive="active">Courses</a>
        <a routerLink="/org-admin/assignments" routerLinkActive="active">Assignments</a>
        <a routerLink="/org-admin/progress" routerLinkActive="active">Progress</a>
        <a routerLink="/org-admin/overdue" routerLinkActive="active">Overdue</a>
        <a routerLink="/org-admin/policies" routerLinkActive="active">Policies</a>
        <a routerLink="/org-admin/wound-library" routerLinkActive="active">Wound Library</a>
        <a routerLink="/org-admin/reports" routerLinkActive="active">Reports</a>
        <a routerLink="/org-admin/audit" routerLinkActive="active">Audit</a>
        <a routerLink="/org-admin/alerts" routerLinkActive="active">Alerts</a>
        <a routerLink="/org-admin/troubleshooting" routerLinkActive="active">Troubleshooting</a>
        <a routerLink="/admin/security" routerLinkActive="active">Security</a>
        <a routerLink="/admin/analytics/shares" routerLinkActive="active">Share Analytics</a>
      </nav>

      <main class="oa-content">
        <router-outlet></router-outlet>
      </main>

      <ng-template #shellLoadingTpl>
        <section class="oa-summary oa-summary--loading">
          <article *ngFor="let item of [1,2,3,4]">
            <span>Loading</span>
            <strong>...</strong>
            <p>Preparing organization summary</p>
          </article>
        </section>
      </ng-template>
    </section>
  `,
  styles: [`
    .oa-shell { min-height: calc(100vh - 72px); padding: 1.1rem 1.2rem 1.5rem; background: linear-gradient(165deg, #f5f8fc 0%, #ebf1f7 100%); }
    .oa-topbar { position: sticky; top: .75rem; z-index: 20; display: flex; justify-content: space-between; gap: 1rem; align-items: center; margin-bottom: 1rem; padding: .95rem 1rem; border: 1px solid rgba(15, 62, 104, 0.08); border-radius: 1rem; background: rgba(255,255,255,.88); box-shadow: 0 14px 32px rgba(15, 62, 104, 0.08); backdrop-filter: blur(12px); }
    .oa-topbar__copy { display: grid; gap: .2rem; }
    .oa-topbar__copy span { font-size: .72rem; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; color: #5b7795; }
    .oa-topbar__copy strong { color: #14385a; }
    .oa-topbar__actions { display: flex; align-items: center; gap: .65rem; flex-wrap: wrap; justify-content: flex-end; }
    .oa-topbar-link, .oa-topbar-logout { border-radius: 999px; padding: .5rem .9rem; font-size: .82rem; font-weight: 800; }
    .oa-topbar-link { text-decoration: none; color: #123d66; border: 1px solid rgba(18, 61, 102, 0.16); background: #fff; }
    .oa-topbar-logout { border: 1px solid rgba(153, 27, 27, 0.18); background: rgba(255,255,255,.96); color: #8b1e1e; cursor: pointer; }
    .oa-top { display: flex; justify-content: space-between; gap: 1rem; align-items: center; margin-bottom: 1rem; }
    .oa-top-copy { max-width: 760px; }
    .oa-kicker { margin: 0; text-transform: uppercase; letter-spacing: .12em; font-size: .72rem; font-weight: 800; color: #55779a; }
    .oa-top h1 { margin: 0; font-size: 1.55rem; color: #132d48; }
    .oa-org-name { font-size: 2.1rem !important; font-weight: 900; letter-spacing: -0.02em; background: linear-gradient(95deg, #0f3e68 0%, #2070bd 50%, #2aa9d8 100%); -webkit-background-clip: text; background-clip: text; color: transparent; text-shadow: 0 6px 22px rgba(15, 62, 104, 0.22); padding: 0.1rem 0; }
    .oa-top p { margin: .35rem 0 0; color: #496682; }
    .oa-org-context strong { color: #14385a; }
    .oa-top-actions { display: flex; align-items: center; gap: .7rem; flex-wrap: wrap; justify-content: flex-end; }
    .pill { border-radius: 999px; border: 1px solid #bccde0; background: #fff; padding: .35rem .7rem; color: #1b3a5a; font-weight: 700; }
    .oa-link-pill { text-decoration: none; border-radius: 999px; border: 1px solid #0f3e68; background: #0f3e68; padding: .45rem .85rem; color: #f3f8ff; font-weight: 800; }
    .oa-link-pill--secondary { background: #fff; color: #0f3e68; }
    .oa-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .65rem; margin-bottom: .95rem; }
    .oa-summary article { border: 1px solid #d4e1ee; border-radius: 14px; background: linear-gradient(180deg, #ffffff 0%, #f5faff 100%); padding: .85rem .9rem; box-shadow: 0 10px 24px rgba(15, 62, 104, 0.04); }
    .oa-summary span { display: block; color: #5f7f9e; text-transform: uppercase; letter-spacing: .08em; font-size: .72rem; font-weight: 800; }
    .oa-summary strong { display: block; margin-top: .35rem; font-size: 1.45rem; color: #14385a; }
    .oa-summary p { margin: .35rem 0 0; color: #607d98; font-size: .85rem; }
    .oa-summary--loading strong { opacity: .55; }
    .oa-nav { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: .55rem; margin-bottom: .95rem; }
    .oa-nav a { text-decoration: none; text-align: center; border-radius: 10px; border: 1px solid #ccdced; background: #fff; padding: .55rem .6rem; color: #26496d; font-weight: 700; font-size: .86rem; }
    .oa-nav a.active { background: #0f3e68; border-color: #0f3e68; color: #f3f8ff; }
    .oa-content { border-radius: 14px; }
    @media (max-width: 1200px) { .oa-summary, .oa-nav { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
    @media (max-width: 760px) { .oa-topbar { top: .5rem; align-items: flex-start; flex-direction: column; } .oa-topbar__actions { justify-content: flex-start; } .oa-top { align-items: flex-start; flex-direction: column; } .oa-top-actions { justify-content: flex-start; } .oa-summary, .oa-nav { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media (max-width: 560px) { .oa-summary, .oa-nav { grid-template-columns: 1fr; } }
  `],
})
export class OrgAdminShellComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly ctx = inject(OrgContextService);
  private readonly dashboard = inject(OrganizationAdminDashboardService);
  private readonly orgsSvc = inject(SuperAdminOrganizationsService);
  readonly context = toSignal(this.ctx.context$, { initialValue: EMPTY_ORG_CONTEXT });

  readonly orgId = computed(() => this.context().orgId);
  readonly roleLabel = computed(() => this.context().orgRole || this.context().role || 'org_admin');
  private readonly orgId$ = toObservable(this.orgId);
  readonly stats = toSignal(
    this.orgId$.pipe(switchMap((orgId) => (orgId ? this.dashboard.stats(orgId) : of(null as any)))),
    { initialValue: null as any }
  );
  readonly organization = toSignal(
    this.orgId$.pipe(switchMap((id) => (id ? this.orgsSvc.getOrganizationById(id) : of(null)))),
    { initialValue: null as any }
  );
  readonly orgName = computed(() => this.organization()?.name || '');

  async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigate(['/login']);
  }
}
