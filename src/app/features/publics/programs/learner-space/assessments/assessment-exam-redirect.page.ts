import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-assessment-exam-redirect-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="redirect-state">
      <h1>Opening assessment briefing…</h1>
      <p>This learner route now checks the exam-prep engine first.</p>
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
export class AssessmentExamRedirectPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  constructor() {
    void this.resolveRoute();
  }

  private async resolveRoute(): Promise<void> {
    const assessmentId = this.route.snapshot.paramMap.get('assessmentId') || '';
    if (!assessmentId) {
      await this.router.navigate(['../'], { relativeTo: this.route, replaceUrl: true });
      return;
    }

    await this.router.navigate(['../../exam-prep', assessmentId], {
      relativeTo: this.route,
      replaceUrl: true,
      state: { sourceKind: 'assessment' },
    });
  }
}