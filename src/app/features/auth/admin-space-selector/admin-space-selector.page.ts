import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterModule } from '@angular/router';
import { AccessCapabilitiesService, AdminSpaceKey, AdminSpaceOption } from '../../../core/access-capabilities.service';
import { AuthService } from '../../../core/auth';
import { OrgContextService } from '../../../core/organization/org-context.service';
import { rememberAdminSpace } from '../../../core/auth-redirect.util';

@Component({
  selector: 'app-admin-space-selector-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="space-selector">
      <header class="hero">
        <p class="eyebrow">Admin Routing Hub</p>
        <h1>Select Your Admin Space</h1>
        <p class="hero-copy">
          Your account can access multiple administrative workspaces. Choose the operational context you want to enter.
        </p>
      </header>

      <section class="cards" *ngIf="spaces().length; else emptyTpl">
        <button
          *ngFor="let space of spaces()"
          type="button"
          class="space-card"
          [class.space-card--platform]="space.tone === 'platform'"
          [class.space-card--organization]="space.tone === 'organization'"
          [class.space-card--program]="space.tone === 'program'"
          (click)="openSpace(space)"
        >
          <span class="space-card__kicker">{{ levelLabel(space.key) }}</span>
          <h2>{{ space.label }}</h2>
          <p>{{ space.description }}</p>
          <span class="space-card__meta">Selection remembered on this device</span>
          <span class="space-card__cta">Open workspace</span>
        </button>
      </section>

      <ng-template #emptyTpl>
        <article class="empty">
          <h2>No admin workspace found</h2>
          <p>Your current profile does not expose multiple admin spaces.</p>
        </article>
      </ng-template>
    </section>
  `,
  styles: [`
    :host { display:block; min-height:100vh; background: radial-gradient(circle at top left, #eef6ff 0%, #f7fbff 50%, #ffffff 100%); }
    .space-selector { max-width: 1180px; margin: 0 auto; padding: 2rem 1.2rem 2.4rem; }
    .hero { border: 1px solid #d6e4f1; border-radius: 1.2rem; background: linear-gradient(145deg, #ffffff, #f4f9ff); padding: 1.35rem 1.4rem; box-shadow: 0 10px 28px rgba(15,53,90,0.06); }
    .eyebrow { margin: 0; text-transform: uppercase; letter-spacing: .12em; font-size: .72rem; font-weight: 800; color: #55769b; }
    .hero h1 { margin: .35rem 0 .3rem; color: #112f4e; }
    .hero-copy { margin: 0; color: #5f7a96; max-width: 62ch; line-height: 1.55; }
    .cards { display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: .9rem; margin-top: 1rem; }
    .space-card { display:block; width: 100%; text-align: left; cursor: pointer; text-decoration:none; border-radius: 1.15rem; padding: 1rem; border: 1px solid #d8e5f1; background: #fff; color: #163d61; box-shadow: 0 8px 24px rgba(15,53,90,0.06); transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease; }
    .space-card:hover { transform: translateY(-3px); box-shadow: 0 16px 36px rgba(15,53,90,0.10); }
    .space-card--platform { background: linear-gradient(145deg, #132b49, #244c7b); color: #f3f8ff; border-color: #244c7b; }
    .space-card--organization { background: linear-gradient(145deg, #ffffff, #eff7ff); border-color: #c7dcf0; }
    .space-card--program { background: linear-gradient(145deg, #0f3659, #123d66); color: #eff7ff; border-color: #1b4f7f; }
    .space-card__kicker { display:inline-flex; margin-bottom: .75rem; border-radius: 999px; padding: .35rem .6rem; font-size: .74rem; font-weight: 800; background: rgba(255,255,255,.14); color: inherit; border: 1px solid rgba(255,255,255,.18); }
    .space-card--organization .space-card__kicker { background: #eef5fc; color: #1f4a72; border-color: #d2e3f2; }
    .space-card h2 { margin: 0; font-size: 1.2rem; }
    .space-card p { margin: .55rem 0 0; line-height: 1.55; color: inherit; opacity: .92; }
    .space-card__meta { display:block; margin-top: .8rem; font-size: .78rem; font-weight: 700; opacity: .78; }
    .space-card__cta { display:inline-flex; margin-top: 1rem; font-weight: 800; }
    .empty { margin-top: 1rem; border: 1px dashed #cad9e8; border-radius: 1rem; background: #fff; padding: 1rem; text-align:center; color: #56708a; }
    @media (max-width: 980px) { .cards { grid-template-columns: 1fr; } }
  `],
})
export class AdminSpaceSelectorPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly capabilities = inject(AccessCapabilitiesService);
  private readonly orgContext = inject(OrgContextService);

  readonly profile = toSignal(this.auth.profile$, { initialValue: null });
  readonly orgCtx = toSignal(this.orgContext.context$, { initialValue: null });
  readonly spaces = computed(() => this.capabilities.getAdminSpaces(this.profile(), this.orgCtx()));

  async openSpace(space: AdminSpaceOption): Promise<void> {
    rememberAdminSpace(this.profile(), space.key);
    await this.router.navigateByUrl(space.route);
  }

  levelLabel(key: AdminSpaceKey): string {
    switch (key) {
      case 'super-admin':
        return 'Level 1';
      case 'org-admin':
        return 'Level 2';
      case 'program-admin':
        return 'Level 3';
      default:
        return 'Admin';
    }
  }
}