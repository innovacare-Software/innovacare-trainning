import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { combineLatest, map, of, switchMap } from 'rxjs';
import { ExamPrepAdminService } from '../services/exam-prep-admin.service';

@Component({
  selector: 'app-exam-prep-runtime-inspector-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="runtime-shell">
      <header class="hero-card">
        <div>
          <p class="eyebrow">Exam Prep Runtime</p>
          <h1>Attempt and Assembly Inspector</h1>
          <p class="hero-copy">
            Validate the runtime model by inspecting attempt sessions, immutable assemblies,
            delivered item snapshots, and learner responses from one admin surface.
          </p>
        </div>
        <a routerLink="/program-admin/exam-prep" class="hero-link">Back to dashboard</a>
      </header>

      <section class="stats-grid">
        <article class="stat-card">
          <span>Attempts</span>
          <strong>{{ stats().attemptCount }}</strong>
          <small>{{ stats().inProgressCount }} in progress</small>
        </article>
        <article class="stat-card">
          <span>Assemblies</span>
          <strong>{{ stats().assemblyCount }}</strong>
          <small>{{ stats().linkedAssemblyCount }} linked to attempts</small>
        </article>
        <article class="stat-card">
          <span>Responses</span>
          <strong>{{ stats().responseCount }}</strong>
          <small>{{ stats().answeredResponseCount }} with selected answers</small>
        </article>
        <article class="stat-card accent">
          <span>Coverage</span>
          <strong>{{ stats().responseCoverageLabel }}</strong>
          <small>Responses vs delivered ids for selected attempt</small>
        </article>
      </section>

      <section class="layout-grid">
        <article class="panel">
          <div class="panel-head">
            <h2>Recent Attempts</h2>
            <span>{{ attempts().length }} records</span>
          </div>

          @if (attempts().length) {
            <div class="attempt-list">
              @for (attempt of attempts(); track attempt.id) {
                <button
                  type="button"
                  class="attempt-card"
                  [class.attempt-card--active]="attempt.id === selectedAttemptId()"
                  (click)="selectedAttemptId.set(attempt.id)"
                >
                  <strong>{{ attempt.assessmentTitle || 'Exam Prep Assessment' }}</strong>
                  <span>{{ attempt.id }}</span>
                  <small>
                    {{ attempt.status || 'unknown' }} · attempt {{ attempt.attemptNumber || 1 }} ·
                    {{ attempt.deliveredQuestionIds.length || 0 }} items
                  </small>
                </button>
              }
            </div>
          } @else {
            <p class="empty">No attempt sessions found in the current organization.</p>
          }
        </article>

        <article class="panel">
          <div class="panel-head">
            <h2>Selected Attempt</h2>
            @if (selectedAttempt(); as attempt) {
              <span>{{ attempt.id }}</span>
            }
          </div>

          @if (selectedAttempt(); as attempt) {
            <div class="kv-grid">
              <div><span>Status</span><strong>{{ attempt.status || 'unknown' }}</strong></div>
              <div><span>Assessment</span><strong>{{ attempt.assessmentTitle || attempt.assessmentId }}</strong></div>
              <div><span>Assembly</span><strong>{{ attempt.assemblyId || 'none' }}</strong></div>
              <div><span>Learner</span><strong>{{ attempt.learnerName || attempt.learnerId }}</strong></div>
              <div><span>Delivered ids</span><strong>{{ attempt.deliveredQuestionIds.length || 0 }}</strong></div>
              <div><span>Current index</span><strong>{{ attempt.currentIndex || 0 }}</strong></div>
              <div><span>Answered</span><strong>{{ attempt.answeredCount || 0 }}</strong></div>
              <div><span>Flagged</span><strong>{{ attempt.flaggedCount || 0 }}</strong></div>
            </div>
          } @else {
            <p class="empty">Select an attempt to inspect its runtime state.</p>
          }
        </article>

        <article class="panel">
          <div class="panel-head">
            <h2>Assembly Snapshot</h2>
            @if (selectedAssembly(); as assembly) {
              <span>{{ assembly.id }}</span>
            }
          </div>

          @if (selectedAssembly(); as assembly) {
            <div class="kv-grid">
              <div><span>Assessment</span><strong>{{ assembly.assessmentTitle || assembly.assessmentId }}</strong></div>
              <div><span>Program</span><strong>{{ assembly.programId || 'n/a' }}</strong></div>
              <div><span>Mode</span><strong>{{ assembly.assessmentMode || 'n/a' }}</strong></div>
              <div><span>Review</span><strong>{{ assembly.reviewMode || 'n/a' }}</strong></div>
              <div><span>Item count</span><strong>{{ assembly.itemCount || 0 }}</strong></div>
              <div><span>Blueprint</span><strong>{{ assembly.blueprintId || 'none' }}</strong></div>
            </div>
          } @else {
            <p class="empty">No assembly snapshot linked to the selected attempt.</p>
          }
        </article>

        <article class="panel wide-panel">
          <div class="panel-head">
            <h2>Assembly Items</h2>
            <span>{{ assemblyItems().length }} records</span>
          </div>

          @if (assemblyItems().length) {
            <div class="table-shell">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Item</th>
                    <th>Module</th>
                    <th>Type</th>
                    <th>Points</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of assemblyItems(); track trackByRecord(item)) {
                    <tr>
                      <td>{{ readValue(item, 'sequenceIndex') }}</td>
                      <td>{{ readValue(item, 'stem') || readValue(item, 'id') }}</td>
                      <td>{{ readValue(item, 'moduleTitle') || 'n/a' }}</td>
                      <td>{{ readValue(item, 'itemType') || 'n/a' }}</td>
                      <td>{{ readValue(item, 'points') || 1 }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <p class="empty">No assembly items found for the selected assembly.</p>
          }
        </article>

        <article class="panel wide-panel">
          <div class="panel-head">
            <h2>Attempt Responses</h2>
            <span>{{ responses().length }} records</span>
          </div>

          @if (responses().length) {
            <div class="table-shell">
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Status</th>
                    <th>Selected</th>
                    <th>Visited</th>
                    <th>Locked</th>
                    <th>Seconds</th>
                  </tr>
                </thead>
                <tbody>
                  @for (response of responses(); track response.id) {
                    <tr>
                      <td>{{ response.itemId || response.id }}</td>
                      <td>{{ response.questionStatus || 'unanswered' }}</td>
                      <td>{{ (response.selectedAnswerKeys || []).join(', ') || 'none' }}</td>
                      <td>{{ response.visited ? 'yes' : 'no' }}</td>
                      <td>{{ response.locked ? 'yes' : 'no' }}</td>
                      <td>{{ response.responseTimeSeconds || 0 }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          } @else {
            <p class="empty">No response documents found for the selected attempt.</p>
          }
        </article>
      </section>
    </section>
  `,
  styles: [
    `
      .runtime-shell { display: grid; gap: 1rem; }
      .hero-card, .panel {
        border: 1px solid #d9e4f0;
        border-radius: 1rem;
        background: #fff;
        padding: 1.1rem 1.2rem;
        box-shadow: 0 10px 28px rgba(17, 48, 78, 0.06);
      }
      .hero-card {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;
        background: linear-gradient(135deg, #f7fbff 0%, #ffffff 45%, #fff7ee 100%);
      }
      .eyebrow {
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        font-size: 0.72rem;
        color: #537595;
        font-weight: 800;
      }
      .hero-copy, .empty, .attempt-card span, .attempt-card small, .kv-grid span { color: #647f99; }
      .hero-link { align-self: start; text-decoration: none; font-weight: 700; color: #1a6cb5; }
      .stats-grid, .layout-grid, .kv-grid { display: grid; gap: 0.85rem; }
      .stats-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
      .layout-grid { grid-template-columns: minmax(280px, 0.9fr) minmax(0, 1.1fr) minmax(0, 1.1fr); }
      .wide-panel { grid-column: span 3; }
      .stat-card {
        border: 1px solid #dce7f3;
        border-radius: 0.9rem;
        background: linear-gradient(180deg, #ffffff, #f8fbff);
        padding: 0.95rem 1rem;
        display: grid;
        gap: 0.2rem;
      }
      .stat-card span, .stat-card small { color: #61809c; }
      .stat-card strong { font-size: 1.6rem; color: #163f69; }
      .stat-card.accent { background: linear-gradient(145deg, #eef7ff, #fff8ee); }
      .panel-head {
        display: flex;
        justify-content: space-between;
        gap: 0.75rem;
        align-items: center;
        margin-bottom: 0.85rem;
      }
      .panel-head h2, h1 { margin: 0; }
      .attempt-list { display: grid; gap: 0.7rem; }
      .attempt-card {
        display: grid;
        gap: 0.2rem;
        text-align: left;
        border: 1px solid #d9e5f1;
        border-radius: 0.85rem;
        padding: 0.85rem;
        background: #f8fbff;
        cursor: pointer;
      }
      .attempt-card--active {
        border-color: #1a6cb5;
        background: linear-gradient(180deg, #eef7ff, #ffffff);
      }
      .kv-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .kv-grid div {
        border: 1px solid #e3ecf6;
        border-radius: 0.8rem;
        padding: 0.75rem 0.85rem;
        display: grid;
        gap: 0.2rem;
      }
      .kv-grid strong { color: #173f68; }
      .table-shell { overflow: auto; border: 1px solid #e3ecf6; border-radius: 0.85rem; }
      table { width: 100%; border-collapse: collapse; min-width: 720px; }
      th, td {
        padding: 0.75rem 0.8rem;
        border-bottom: 1px solid #edf2f7;
        text-align: left;
        vertical-align: top;
      }
      th {
        background: #f8fbff;
        color: #416381;
        font-size: 0.78rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      td { color: #244563; }
      @media (max-width: 1100px) {
        .stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .layout-grid { grid-template-columns: 1fr; }
        .wide-panel { grid-column: span 1; }
      }
      @media (max-width: 700px) {
        .stats-grid, .kv-grid { grid-template-columns: 1fr; }
      }
    `,
  ],
})
export class ExamPrepRuntimeInspectorPage {
  private readonly examPrep = inject(ExamPrepAdminService);

  readonly attempts = toSignal(this.examPrep.attempts$, { initialValue: [] });
  readonly assemblies = toSignal(this.examPrep.assemblies$, { initialValue: [] });
  readonly selectedAttemptId = signal('');
  readonly selectedAttempt = computed(() =>
    this.attempts().find((attempt) => attempt.id === this.selectedAttemptId()) ?? null
  );
  readonly selectedAssemblyId = computed(() => this.selectedAttempt()?.assemblyId?.trim() || '');
  readonly selectedAssembly = toSignal(
    toObservable(this.selectedAssemblyId).pipe(
      switchMap((assemblyId) => (assemblyId ? this.examPrep.getAssembly(assemblyId) : of(undefined)))
    ),
    { initialValue: undefined }
  );
  readonly assemblyItems = toSignal(
    toObservable(this.selectedAssemblyId).pipe(
      switchMap((assemblyId) => (assemblyId ? this.examPrep.listAssemblyItems(assemblyId) : of([])))
    ),
    { initialValue: [] }
  );
  readonly responses = toSignal(
    toObservable(this.selectedAttemptId).pipe(
      switchMap((attemptId) => (attemptId ? this.examPrep.listAttemptResponses(attemptId) : of([])))
    ),
    { initialValue: [] }
  );
  readonly stats = toSignal(
    combineLatest([this.examPrep.attempts$, this.examPrep.assemblies$, toObservable(this.responses)]).pipe(
      map(([attempts, assemblies, responses]) => {
        const selectedAttempt = attempts.find((attempt) => attempt.id === this.selectedAttemptId()) ?? null;
        const deliveredCount = selectedAttempt?.deliveredQuestionIds?.length || 0;
        const linkedAssemblyIds = new Set(attempts.map((attempt) => attempt.assemblyId).filter(Boolean));
        const answeredResponseCount = responses.filter((response) => (response.selectedAnswerKeys || []).length > 0).length;
        return {
          attemptCount: attempts.length,
          inProgressCount: attempts.filter((attempt) => attempt.status === 'in_progress').length,
          assemblyCount: assemblies.length,
          linkedAssemblyCount: assemblies.filter((assembly) => linkedAssemblyIds.has(assembly.id)).length,
          responseCount: responses.length,
          answeredResponseCount,
          responseCoverageLabel: deliveredCount ? `${responses.length}/${deliveredCount}` : 'n/a',
        };
      })
    ),
    {
      initialValue: {
        attemptCount: 0,
        inProgressCount: 0,
        assemblyCount: 0,
        linkedAssemblyCount: 0,
        responseCount: 0,
        answeredResponseCount: 0,
        responseCoverageLabel: 'n/a',
      },
    }
  );

  constructor() {
    effect(() => {
      const attempts = this.attempts();
      const selectedAttemptId = this.selectedAttemptId();
      if (!attempts.length) {
        if (selectedAttemptId) {
          this.selectedAttemptId.set('');
        }
        return;
      }

      if (!attempts.some((attempt) => attempt.id === selectedAttemptId)) {
        this.selectedAttemptId.set(attempts[0]?.id || '');
      }
    }, { allowSignalWrites: true });
  }

  trackByRecord(record: Record<string, unknown>): string {
    return String(record['id'] || record['itemId'] || record['sequenceIndex'] || 'record');
  }

  readValue(record: Record<string, unknown>, key: string): string | number {
    const value = record[key];
    return typeof value === 'number' ? value : String(value || '');
  }
}