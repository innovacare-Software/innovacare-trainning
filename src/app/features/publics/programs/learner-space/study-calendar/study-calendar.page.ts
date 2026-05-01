import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { map, switchMap } from 'rxjs/operators';
import { LearnerDashboardExperienceService } from '../services/learner-dashboard-experience.service';

@Component({
  selector: 'app-study-calendar-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    @if (experience(); as experience) {
      <section class="scp-shell">
        <header class="scp-hero">
          <span class="scp-kicker">Study calendar</span>
          <h1>Choose a study plan that matches your exam pressure</h1>
          <p>Pick a cadence, lock your milestones, and keep your energy focused on the next high-value move.</p>
        </header>

        <div class="scp-grid">
          @for (plan of experience.studyPlans; track plan.id) {
            <article class="scp-card" [class.is-recommended]="plan.recommended">
              <span class="scp-badge">{{ plan.recommended ? 'Recommended' : plan.highlight }}</span>
              <h2>{{ plan.title }}</h2>
              <p>{{ plan.description }}</p>
              <a class="scp-btn" [routerLink]="plan.ctaLink">Start Plan</a>
            </article>
          }
        </div>
      </section>
    }
  `,
  styles: [`
    :host { display: block; }
    .scp-shell { display: grid; gap: 1rem; }
    .scp-hero, .scp-card {
      border-radius: 1.3rem; border: 1px solid rgba(20,33,50,.08); background: rgba(255,255,255,.92);
      box-shadow: 0 18px 46px rgba(20,33,50,.08); padding: 1.1rem;
    }
    .scp-kicker, .scp-badge { text-transform: uppercase; letter-spacing: .12em; font-size: .72rem; font-weight: 800; color: #155e75; }
    .scp-hero h1, .scp-card h2 { margin: .2rem 0 0; font-family: 'Iowan Old Style', Georgia, serif; }
    .scp-hero p, .scp-card p { color: #52606d; line-height: 1.7; }
    .scp-grid { display: grid; gap: .9rem; grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .scp-card { display: grid; gap: .8rem; }
    .scp-card.is-recommended { border-color: rgba(15,118,110,.2); background: linear-gradient(180deg, rgba(236,253,245,.92), rgba(255,255,255,.95)); }
    .scp-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 42px; padding: 0 1rem; width: fit-content; border-radius: 999px; background: linear-gradient(135deg, #155e75, #0f766e); color: #fff; text-decoration: none; font-weight: 800; }
    @media (max-width: 1080px) { .scp-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media (max-width: 680px) { .scp-grid { grid-template-columns: 1fr; } }
  `],
})
export class StudyCalendarPage {
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