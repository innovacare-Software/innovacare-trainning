import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { map, switchMap } from 'rxjs';
import { AccessCapabilitiesService } from '../../../core/access-capabilities.service';
import { resolveDefaultRoute } from '../../../core/auth-redirect.util';
import { AppProfile } from '../../../core/auth';
import { SuperAdminUsersService } from '../services/super-admin-users';

@Component({
  selector: 'app-program-access-diagnostic-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="diag-shell">
      <a class="diag-back" routerLink="/super-admin/users">Back to users</a>

      @if (user(); as user) {
        <header class="diag-hero">
          <div>
            <span class="diag-eyebrow">Program Admin Access Diagnostic</span>
            <h1>{{ user.displayName || user.email || user.uid }}</h1>
            <p>Read the current account shape, the access decision, and the exact conditions that produce it.</p>
          </div>
          <div class="diag-status" [class.is-allowed]="canAccess()" [class.is-blocked]="!canAccess()">
            <strong>{{ canAccess() ? 'Allowed' : 'Blocked' }}</strong>
            <span>{{ defaultRoute() }}</span>
          </div>
        </header>

        <section class="diag-grid">
          <article class="diag-card">
            <h2>Profile snapshot</h2>
            <dl>
              <div><dt>UID</dt><dd>{{ user.uid }}</dd></div>
              <div><dt>Role</dt><dd>{{ user.role }}</dd></div>
              <div><dt>Org ID</dt><dd>{{ user.orgId || '—' }}</dd></div>
              <div><dt>Active</dt><dd>{{ user.active === false ? 'No' : 'Yes' }}</dd></div>
              <div><dt>isProgramAdmin</dt><dd>{{ user.isProgramAdmin ? 'true' : 'false' }}</dd></div>
              <div><dt>isProgramStaff</dt><dd>{{ user.isProgramStaff ? 'true' : 'false' }}</dd></div>
              <div><dt>isProgramLearner</dt><dd>{{ user.isProgramLearner ? 'true' : 'false' }}</dd></div>
            </dl>
          </article>

          <article class="diag-card">
            <h2>Decision checks</h2>
            <ul class="diag-checks">
              @for (item of checks(); track item.label) {
                <li [class.pass]="item.pass" [class.fail]="!item.pass">
                  <strong>{{ item.label }}</strong>
                  <span>{{ item.value }}</span>
                  <p>{{ item.help }}</p>
                </li>
              }
            </ul>
          </article>
        </section>

        <section class="diag-card">
          <h2>Explanation</h2>
          @if (canAccess()) {
            <p>This account can open Program Admin because it matches at least one accepted path: organization-admin access or an explicit role programAdmin/programStaff.</p>
          } @else {
            <p>This account is blocked from Program Admin because it does not currently satisfy the accepted paths. Legacy flags alone no longer unlock the area.</p>
          }

          @if (needsNormalization()) {
            <p class="diag-warning">Legacy state detected: this user still has program flags, but the role is not explicit.</p>
            <div class="diag-actions">
              <button type="button" class="diag-btn" (click)="normalizeUser()" [disabled]="normalizing()">
                {{ normalizing() ? 'Normalizing...' : 'Normalize this user' }}
              </button>
            </div>
          }

          @if (normalizeNotice()) {
            <p class="diag-note">{{ normalizeNotice() }}</p>
          }
        </section>
      } @else {
        <section class="diag-card"><p>User not found.</p></section>
      }
    </section>
  `,
  styles: [
    `
      :host { display: block; }
      .diag-shell { display: grid; gap: 1rem; padding: 1rem; }
      .diag-back { color: #35516d; text-decoration: none; }
      .diag-hero, .diag-card { border: 1px solid #d7e1ea; border-radius: 20px; background: #fff; box-shadow: 0 12px 32px rgba(15,35,58,0.06); }
      .diag-hero { display: flex; justify-content: space-between; gap: 1rem; padding: 1.3rem; align-items: start; }
      .diag-eyebrow { display: inline-flex; margin-bottom: .45rem; font-size: .72rem; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: #4e7292; }
      .diag-hero h1, .diag-hero p, .diag-card h2, .diag-card p { margin: 0; }
      .diag-hero p { margin-top: .45rem; color: #5c7086; line-height: 1.6; }
      .diag-status { display: grid; gap: .2rem; min-width: 180px; padding: .85rem 1rem; border-radius: 16px; }
      .diag-status.is-allowed { background: #ebfbf2; color: #135c39; }
      .diag-status.is-blocked { background: #fff2f2; color: #9f3030; }
      .diag-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
      .diag-card { padding: 1.2rem; }
      dl { display: grid; gap: .7rem; margin: 0; }
      dl div { display: flex; justify-content: space-between; gap: 1rem; padding-bottom: .7rem; border-bottom: 1px solid #edf2f6; }
      dt { color: #5c7086; font-weight: 700; }
      dd { margin: 0; color: #11283f; font-weight: 700; text-align: right; }
      .diag-checks { list-style: none; padding: 0; margin: 0; display: grid; gap: .8rem; }
      .diag-checks li { border-radius: 16px; padding: .9rem 1rem; }
      .diag-checks li.pass { background: #eef8f2; }
      .diag-checks li.fail { background: #faf3f3; }
      .diag-checks strong, .diag-checks span, .diag-checks p { display: block; }
      .diag-checks span { margin-top: .25rem; font-weight: 700; }
      .diag-checks p { margin-top: .3rem; color: #5c7086; line-height: 1.5; }
      .diag-warning { color: #8b4f00; font-weight: 700; }
      .diag-note { color: #1f4f7a; font-weight: 700; }
      .diag-actions { margin-top: .8rem; }
      .diag-btn { min-height: 42px; padding: 0 1rem; border: 0; border-radius: 999px; background: #17324f; color: #fff; font-weight: 800; cursor: pointer; }
      .diag-btn:disabled { opacity: .6; cursor: not-allowed; }
      @media (max-width: 900px) { .diag-grid { grid-template-columns: 1fr; } .diag-hero { grid-template-columns: 1fr; display: grid; } }
    `,
  ],
})
export class ProgramAccessDiagnosticPage {
  private readonly route = inject(ActivatedRoute);
  private readonly usersService = inject(SuperAdminUsersService);
  private readonly capabilities = inject(AccessCapabilitiesService);

  readonly normalizing = signal(false);
  readonly normalizeNotice = signal('');

  private readonly uid$ = this.route.paramMap.pipe(map((params) => params.get('uid') || ''));

  readonly user = toSignal(
    this.uid$.pipe(switchMap((uid) => this.usersService.getByUid(uid))),
    { initialValue: null }
  );

  readonly canAccess = computed(() => this.capabilities.canAccessProgramAdmin(this.user() as AppProfile | null));
  readonly defaultRoute = computed(() => resolveDefaultRoute(this.user() as AppProfile | null));
  readonly needsNormalization = computed(() => {
    const user = this.user();
    if (!user) {
      return false;
    }

    const hasLegacyFlags = user.isProgramAdmin === true || user.isProgramStaff === true || user.isProgramLearner === true;
    const hasExplicitProgramRole = user.role === 'programAdmin' || user.role === 'programStaff' || user.role === 'programLearner';
    return hasLegacyFlags && !hasExplicitProgramRole;
  });

  readonly checks = computed(() => {
    const user = this.user();
    if (!user) {
      return [];
    }

    const explicitProgramRole = user.role === 'programAdmin' || user.role === 'programStaff';
    const orgAdminPath = !!String(user.orgId || '').trim() && (user.role === 'super_admin' || user.role === 'admin' || user.role === 'manager');
    return [
      {
        label: 'Explicit program role',
        value: explicitProgramRole ? user.role : 'missing',
        pass: explicitProgramRole,
        help: 'Program Admin now requires role programAdmin or programStaff unless the account already has organization-admin access.',
      },
      {
        label: 'Organization-admin fallback',
        value: orgAdminPath ? 'available' : 'not available',
        pass: orgAdminPath,
        help: 'admin and manager accounts with an orgId still keep access to Program Admin.',
      },
      {
        label: 'Legacy flags still present',
        value: `admin=${user.isProgramAdmin ? 'true' : 'false'}, staff=${user.isProgramStaff ? 'true' : 'false'}, learner=${user.isProgramLearner ? 'true' : 'false'}`,
        pass: !this.needsNormalization(),
        help: 'Flags are now informational or backward-compatible only. They do not unlock Program Admin by themselves anymore.',
      },
      {
        label: 'Final access decision',
        value: this.canAccess() ? 'Program Admin allowed' : 'Program Admin blocked',
        pass: this.canAccess(),
        help: 'This is the same decision returned by AccessCapabilitiesService.canAccessProgramAdmin and enforced by the route guard.',
      },
    ];
  });

  async normalizeUser(): Promise<void> {
    const user = this.user();
    if (!user?.uid || this.normalizing()) {
      return;
    }

    this.normalizing.set(true);
    this.normalizeNotice.set('');

    try {
      const role = await this.usersService.normalizeProgramAccessRole(user.uid);
      this.normalizeNotice.set(`Program access normalized. Current explicit role: ${role}.`);
    } catch (error) {
      this.normalizeNotice.set(error instanceof Error ? error.message : 'Failed to normalize this user.');
    } finally {
      this.normalizing.set(false);
    }
  }
}