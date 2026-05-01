import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { map, switchMap } from 'rxjs';
import { LearnerCaseStudiesService } from '../services/learner-case-studies.service';

@Component({
  selector: 'app-case-studies-list-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="cs-page">
      <h1 class="cs-title">Case Studies</h1>
      <p class="cs-subtitle">Real-world scenarios to apply your clinical reasoning and critical thinking.</p>

      @if (caseStudiesWithAttempts().length > 0) {
        <div class="cs-grid">
          @for (c of caseStudiesWithAttempts(); track c.id) {
            <a class="cs-card" [routerLink]="[c.id]">
              <div class="cs-card-top">
                <span class="cs-scoring">{{ c.scoringMode }}</span>
                <span class="cs-questions">{{ c.questions.length }} question{{ c.questions.length !== 1 ? 's' : '' }}</span>
                @if (c.bestScore !== null) {
                  <span class="cs-score">Best: {{ c.bestScore }}%</span>
                }
              </div>
              <h3 class="cs-name">{{ c.title }}</h3>
              <p class="cs-desc">{{ c.description }}</p>
              <p class="cs-scenario">{{ c.scenario | slice:0:120 }}{{ c.scenario.length > 120 ? '…' : '' }}</p>
              <div class="cs-footer">
                <span class="cs-attempts">📊 {{ c.attempts }} attempt{{ c.attempts !== 1 ? 's' : '' }}</span>
                <span class="cs-arrow">→</span>
              </div>
            </a>
          }
        </div>
      } @else {
        <div class="cs-empty"><span>🔬</span><p>No case studies available yet.</p></div>
      }
    </div>
  `,
  styles: [`
    .cs-page { max-width: 1000px; }
    .cs-title { font-size: 1.4rem; font-weight: 800; color: #111827; margin: 0 0 .3rem; }
    .cs-subtitle { font-size: .82rem; color: #6b7280; margin: 0 0 1.5rem; }

    .cs-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
    .cs-card {
      background: #ffffff; border: 1px solid #e5e7eb;
      border-radius: 14px; padding: 1.2rem; display: flex; flex-direction: column; gap: .3rem;
      text-decoration: none; color: #374151; transition: all .2s; box-shadow: 0 1px 3px rgba(0,0,0,.04);
    }
    .cs-card:hover { border-color: #6366f1; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,.08); }

    .cs-card-top { display: flex; align-items: center; gap: .4rem; flex-wrap: wrap; }
    .cs-scoring {
      font-size: .58rem; font-weight: 700; text-transform: uppercase;
      padding: .12rem .4rem; border-radius: 4px; background: #d1fae5; color: #059669;
    }
    .cs-questions { font-size: .62rem; color: #9ca3af; }
    .cs-score { margin-left: auto; font-size: .78rem; font-weight: 800; color: #6366f1; }

    .cs-name { font-size: .95rem; font-weight: 700; color: #111827; margin: .2rem 0 0; }
    .cs-desc { font-size: .75rem; color: #6b7280; line-height: 1.4; }
    .cs-scenario {
      font-size: .72rem; color: #6b7280; font-style: italic; line-height: 1.4;
      background: #f9fafb; padding: .5rem; border-radius: 8px; border-left: 2px solid #c7d2fe;
    }

    .cs-footer { display: flex; align-items: center; justify-content: space-between; margin-top: .3rem; }
    .cs-attempts { font-size: .68rem; color: #9ca3af; }
    .cs-arrow { font-size: 1rem; color: #6366f1; }

    .cs-empty { text-align: center; padding: 3rem 0; color: #9ca3af; }
    .cs-empty span { font-size: 2rem; display: block; margin-bottom: .5rem; }
  `],
})
export class CaseStudiesListPage {
  private readonly route = inject(ActivatedRoute);
  private readonly caseStudiesService = inject(LearnerCaseStudiesService);

  private readonly programId$ = this.route.parent!.paramMap.pipe(map((p) => p.get('programId') || ''));

  private readonly caseStudies = toSignal(
    this.programId$.pipe(switchMap((id) => this.caseStudiesService.getCaseStudies(id))),
    { initialValue: [] }
  );

  private readonly attempts = toSignal(
    this.programId$.pipe(switchMap((id) => this.caseStudiesService.getMyAttempts(id))),
    { initialValue: [] }
  );

  readonly caseStudiesWithAttempts = computed(() => {
    const items = this.caseStudies();
    const atts = this.attempts();
    return items.map((c) => {
      const myAttempts = atts.filter((a) => a.caseStudyId === c.id);
      const bestScore = myAttempts.length > 0
        ? Math.max(...myAttempts.map((a) => Number(a.score || 0)))
        : null;
      return {
        ...c,
        questions: Array.isArray(c.questions) ? c.questions : [],
        scenario: c.scenario ?? '',
        attempts: myAttempts.length,
        bestScore,
      };
    });
  });
}
