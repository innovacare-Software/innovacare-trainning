import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { map, switchMap } from 'rxjs/operators';
import { LearnerDashboardExperienceService } from '../services/learner-dashboard-experience.service';

@Component({
  selector: 'app-wallet-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    @if (experience(); as experience) {
      <section class="wp-shell">
        <article class="wp-hero">
          <span class="wp-kicker">Wallet</span>
          <h1>{{ experience.walletPoints }} reward points</h1>
          <p>Use your momentum as a motivation layer: every completion, purchase, and milestone makes the next conversion easier.</p>
          <div class="wp-actions">
            <a class="wp-btn" routerLink="../explore-products">Explore premium offers</a>
            <a class="wp-btn wp-btn--teal" routerLink="../wallet/add-credits">Add Wallet Credits</a>
          </div>
        </article>

        <div class="wp-grid">
          <article class="wp-card">
            <span class="wp-kicker">Unlock next</span>
            <h2>Premium simulation bundle</h2>
            <p>Great for learners who want higher exam confidence and faster readiness jumps.</p>
          </article>
          <article class="wp-card">
            <span class="wp-kicker">Reward logic</span>
            <h2>Consistency pays off</h2>
            <p>Finish modules, attend live sessions, and keep your streak alive to grow your wallet.</p>
          </article>
        </div>
      </section>
    }
  `,
  styles: [`
    :host { display: block; }
    .wp-shell, .wp-grid { display: grid; gap: 1rem; }
    .wp-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .wp-hero, .wp-card { border-radius: 1.3rem; border: 1px solid rgba(20,33,50,.08); background: rgba(255,255,255,.92); box-shadow: 0 18px 46px rgba(20,33,50,.08); padding: 1.1rem; }
    .wp-kicker { text-transform: uppercase; letter-spacing: .12em; font-size: .72rem; font-weight: 800; color: #155e75; }
    .wp-hero h1, .wp-card h2 { margin: .25rem 0 0; font-family: 'Iowan Old Style', Georgia, serif; }
    .wp-hero p, .wp-card p { color: #52606d; line-height: 1.7; }
    .wp-actions { display: flex; flex-wrap: wrap; gap: .7rem; }
    .wp-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 42px; padding: 0 1rem; width: fit-content; border-radius: 999px; background: linear-gradient(135deg, #155e75, #0f766e); color: #fff; text-decoration: none; font-weight: 800; }
    .wp-btn--teal { background: linear-gradient(135deg, #0A9DB8, #12B5D0); }
    @media (max-width: 760px) { .wp-grid { grid-template-columns: 1fr; } }
    @media (max-width: 560px) {
      .wp-actions { display: grid; }
      .wp-btn { width: 100%; }
    }
  `],
})
export class WalletPage {
  private readonly route = inject(ActivatedRoute);
  private readonly experienceService = inject(LearnerDashboardExperienceService);

  readonly experience = toSignal(
    this.route.parent!.paramMap.pipe(
      map((params) => params.get('programId') || ''),
      switchMap((programId) => this.experienceService.buildExperience(programId))
    ),
    { initialValue: null }
  );
}