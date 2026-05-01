import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { map, switchMap } from 'rxjs/operators';
import { LearnerDashboardExperienceService } from '../services/learner-dashboard-experience.service';

@Component({
  selector: 'app-explore-products-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    @if (experience(); as experience) {
      <section class="ep-shell">
        <header class="ep-hero">
          <span class="ep-kicker">Explore more products</span>
          <h1>Recommended offers built to raise conversion and confidence</h1>
          <p>Each recommendation is selected to complement your current learning program and accelerate readiness.</p>
        </header>

        <div class="ep-grid">
          @for (product of experience.products; track product.id) {
            <article class="ep-card">
              @if (product.badge) {
                <span class="ep-badge">{{ product.badge }}</span>
              }
              <h2>{{ product.title }}</h2>
              <p>{{ product.subtitle }}</p>
              <strong>{{ product.priceLabel }}</strong>
              <ul>
                @for (feature of product.features; track feature) {
                  <li>{{ feature }}</li>
                }
              </ul>
              <a class="ep-btn" [routerLink]="product.ctaLink">Buy Now</a>
            </article>
          }
        </div>
      </section>
    }
  `,
  styles: [`
    :host { display: block; }
    .ep-shell, .ep-grid { display: grid; gap: 1rem; }
    .ep-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .ep-hero, .ep-card { border-radius: 1.3rem; border: 1px solid rgba(20,33,50,.08); background: rgba(255,255,255,.92); box-shadow: 0 18px 46px rgba(20,33,50,.08); padding: 1.1rem; }
    .ep-kicker, .ep-badge { text-transform: uppercase; letter-spacing: .12em; font-size: .72rem; font-weight: 800; color: #155e75; }
    .ep-hero h1, .ep-card h2 { margin: .2rem 0 0; font-family: 'Iowan Old Style', Georgia, serif; }
    .ep-hero p, .ep-card p, .ep-card li { color: #52606d; line-height: 1.7; }
    .ep-card { display: grid; gap: .8rem; }
    .ep-card strong { font-size: 1.3rem; }
    .ep-card ul { margin: 0; padding-left: 1rem; }
    .ep-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 42px; padding: 0 1rem; width: fit-content; border-radius: 999px; background: linear-gradient(135deg, #155e75, #0f766e); color: #fff; text-decoration: none; font-weight: 800; }
    @media (max-width: 1080px) { .ep-grid { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 680px) { .ep-grid { grid-template-columns: 1fr; } }
  `],
})
export class ExploreProductsPage {
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