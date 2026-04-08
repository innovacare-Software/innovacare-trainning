import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { OrgContextService } from '../../core/organization/org-context.service';

@Component({
  selector: 'app-org-admin-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <section class="oa-shell">
      <header class="oa-top">
        <div>
          <h1>Organization Admin</h1>
          <p>Org context: <strong>{{ orgId() || 'n/a' }}</strong></p>
        </div>
        <div class="pill">Scope locked to orgId</div>
      </header>

      <nav class="oa-nav">
        <a routerLink="/org-admin/dashboard" routerLinkActive="active">Overview</a>
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
      </nav>

      <main class="oa-content">
        <router-outlet></router-outlet>
      </main>
    </section>
  `,
  styles: [`
    .oa-shell { min-height: calc(100vh - 72px); padding: 1.1rem 1.2rem 1.5rem; background: linear-gradient(165deg, #f5f8fc 0%, #ebf1f7 100%); }
    .oa-top { display: flex; justify-content: space-between; gap: 1rem; align-items: center; margin-bottom: 1rem; }
    .oa-top h1 { margin: 0; font-size: 1.55rem; color: #132d48; }
    .oa-top p { margin: .35rem 0 0; color: #496682; }
    .pill { border-radius: 999px; border: 1px solid #bccde0; background: #fff; padding: .35rem .7rem; color: #1b3a5a; font-weight: 700; }
    .oa-nav { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: .55rem; margin-bottom: .95rem; }
    .oa-nav a { text-decoration: none; text-align: center; border-radius: 10px; border: 1px solid #ccdced; background: #fff; padding: .55rem .6rem; color: #26496d; font-weight: 700; font-size: .86rem; }
    .oa-nav a.active { background: #0f3e68; border-color: #0f3e68; color: #f3f8ff; }
    .oa-content { border-radius: 14px; }
    @media (max-width: 1200px) { .oa-nav { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
    @media (max-width: 760px) { .oa-nav { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  `],
})
export class OrgAdminShellComponent {
  private readonly ctx = inject(OrgContextService);
  readonly context = toSignal(this.ctx.context$, {
    initialValue: {
      uid: '',
      orgId: null,
      role: '',
      orgRole: null,
      isSuperAdmin: false,
      isOrgAdmin: false,
      isOrgManager: false,
      isOrgLearner: false,
    },
  });

  readonly orgId = computed(() => this.context().orgId);
}
