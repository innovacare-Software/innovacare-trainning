import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LearnerExamPrepService } from '../services/learner-exam-prep.service';

@Component({
  selector: 'app-simulation-exam-redirect-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="redirect-state">
      <h1>Opening simulation briefing…</h1>
      <p>This learner route now uses the exam-prep delivery engine.</p>
    </section>
  `,
  styles: [
    `
      :host { display: block; }
      .redirect-state {
        display: grid;
        gap: 0.5rem;
        place-items: center;
        min-height: 40vh;
        text-align: center;
        color: #39506b;
      }
      h1,
      p {
        margin: 0;
      }
    `,
  ],
})
export class SimulationExamRedirectPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly examPrep = inject(LearnerExamPrepService);

  constructor() {
    void this.resolveRoute();
  }

  private async resolveRoute(): Promise<void> {
    const programId = this.route.parent?.snapshot.paramMap.get('programId') || '';
    const simulationId = this.route.snapshot.paramMap.get('simulationId') || '';
    await this.router.navigate(['/my-programs', programId, 'exam-prep', simulationId], {
      replaceUrl: true,
      state: { sourceKind: 'simulation', forceEndReviewMode: true },
    });
  }
}