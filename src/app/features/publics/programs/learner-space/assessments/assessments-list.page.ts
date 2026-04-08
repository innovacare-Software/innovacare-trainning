import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { combineLatest, map, switchMap } from 'rxjs';
import { LearnerAssessmentsService } from '../services/learner-assessments.service';

@Component({
  selector: 'app-assessments-list-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="al-page">
      <h1 class="al-title">Assessments</h1>
      <p class="al-subtitle">Quizzes, mock exams, and readiness tests to measure your understanding.</p>

      @if (assessmentsWithAttempts().length > 0) {
        <div class="al-grid">
          @for (a of assessmentsWithAttempts(); track a.id) {
            <div class="al-card">
              <div class="al-card-top">
                <span class="al-type-badge">{{ a.type }}</span>
                @if (a.bestScore !== null) {
                  <span class="al-score" [class.al-pass]="a.bestScore >= a.passingScore" [class.al-fail]="a.bestScore < a.passingScore">
                    {{ a.bestScore }}%
                  </span>
                }
              </div>
              <h3 class="al-name">{{ a.title }}</h3>
              <p class="al-desc">{{ a.description }}</p>
              <div class="al-meta">
                <span>⏱ {{ a.durationMin }} min</span>
                <span>🎯 Pass: {{ a.passingScore }}%</span>
                <span>📊 {{ a.attempts }} attempt{{ a.attempts !== 1 ? 's' : '' }}</span>
              </div>
              <a class="al-start-btn" [routerLink]="[a.id]">
                {{ a.attempts > 0 ? 'Retake' : 'Start' }} Assessment →
              </a>
            </div>
          }
        </div>
      } @else {
        <div class="al-empty"><span>📝</span><p>No assessments available yet.</p></div>
      }
    </div>
  `,
  styles: [`
    .al-page { max-width: 1000px; }
    .al-title { font-size: 1.4rem; font-weight: 800; color: #111827; margin: 0 0 .3rem; }
    .al-subtitle { font-size: .82rem; color: #6b7280; margin: 0 0 1.5rem; }

    .al-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
    .al-card {
      background: #ffffff; border: 1px solid #e5e7eb;
      border-radius: 14px; padding: 1.2rem; display: flex; flex-direction: column; gap: .4rem;
      transition: all .2s; box-shadow: 0 1px 3px rgba(0,0,0,.04);
    }
    .al-card:hover { border-color: #6366f1; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,.08); }

    .al-card-top { display: flex; align-items: center; justify-content: space-between; }
    .al-type-badge {
      font-size: .6rem; font-weight: 700; text-transform: uppercase;
      padding: .15rem .5rem; border-radius: 6px; background: #eef2ff; color: #4f46e5;
    }
    .al-score { font-size: .85rem; font-weight: 800; }
    .al-pass { color: #059669; }
    .al-fail { color: #d97706; }

    .al-name { font-size: .95rem; font-weight: 700; color: #111827; margin: .2rem 0; }
    .al-desc { font-size: .75rem; color: #6b7280; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .al-meta { display: flex; gap: .6rem; font-size: .68rem; color: #9ca3af; margin-top: .2rem; }

    .al-start-btn {
      display: inline-block; margin-top: .5rem; padding: .45rem 1rem;
      background: #6366f1; color: #fff; font-size: .78rem; font-weight: 700;
      border-radius: 8px; text-decoration: none; text-align: center; transition: background .2s;
    }
    .al-start-btn:hover { background: #4f46e5; }

    .al-empty { text-align: center; padding: 3rem 0; color: #9ca3af; }
    .al-empty span { font-size: 2rem; display: block; margin-bottom: .5rem; }
  `],
})
export class AssessmentsListPage {
  private readonly route = inject(ActivatedRoute);
  private readonly assessmentsService = inject(LearnerAssessmentsService);

  private readonly programId$ = this.route.parent!.paramMap.pipe(map((p) => p.get('programId') || ''));

  private readonly assessments = toSignal(
    this.programId$.pipe(switchMap((id) => this.assessmentsService.getAssessments(id))),
    { initialValue: [] }
  );

  private readonly attempts = toSignal(
    this.programId$.pipe(switchMap((id) => this.assessmentsService.getMyAttempts(id))),
    { initialValue: [] }
  );

  readonly assessmentsWithAttempts = computed(() => {
    const items = this.assessments();
    const atts = this.attempts();
    return items.map((a) => {
      const myAttempts = atts.filter((t) => t.assessmentId === a.id);
      const bestScore = myAttempts.length > 0
        ? Math.max(...myAttempts.map((t) => Number(t.score || 0)))
        : null;
      return { ...a, attempts: myAttempts.length, bestScore };
    });
  });
}
