import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ListeningTestService } from '../services/listening-test.service';
import { Auth } from '@angular/fire/auth';
import {
  ListeningTestResult,
  ListeningTestAssessment,
  TARGET_TEST_LABELS,
  ERROR_CATEGORY_LABELS,
} from '../models/listening-test.models';

@Component({
  selector: 'app-instructor-listening-result-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="page-wrap">

      <!-- Nav -->
      <div class="breadcrumb">
        <a routerLink="/manager/language/listening-results">← All Results</a>
      </div>

      @if (loading()) {
        <div class="state-loading"><div class="spinner"></div><p>Loading result…</p></div>
      } @else if (!result()) {
        <div class="state-empty">Result not found.</div>
      } @else {
        <!-- Header -->
        <div class="detail-header">
          <div class="dh-badges">
            <span class="badge badge--test">{{ TARGET_TEST_LABELS[result()!.targetTest] }}</span>
            <span class="badge" [class.badge--pass]="result()!.passed" [class.badge--fail]="!result()!.passed">
              {{ result()!.passed ? 'Passed' : 'Failed' }}
            </span>
            <span class="badge" [class.badge--practice]="result()!.mode === 'PRACTICE'" [class.badge--mock]="result()!.mode === 'MOCK_EXAM'">
              {{ result()!.mode === 'PRACTICE' ? 'Practice' : 'Mock Exam' }}
            </span>
          </div>
          <h1>{{ result()!.title ?? assessment()?.title ?? 'Listening Test Result' }}</h1>
          <div class="dh-meta">
            <span>Learner: <code>{{ result()!.learnerId }}</code></span>
            <span>Submitted: {{ formatDate(result()!.submittedAt) }}</span>
            <span>Duration: {{ formatDuration(result()!.durationUsedSeconds) }}</span>
            <span>Audio plays: {{ result()!.audioPlayCount }}</span>
          </div>
        </div>

        <!-- Score card -->
        <div class="score-card">
          <div class="score-circle" [class.sc--pass]="result()!.passed" [class.sc--fail]="!result()!.passed">
            <span class="sc-pct">{{ result()!.percentage }}%</span>
            <span class="sc-label">{{ result()!.passed ? 'PASSED' : 'FAILED' }}</span>
          </div>
          <div class="score-stats">
            <div class="stat-item"><span class="stat-val">{{ result()!.score }}</span><span class="stat-k">Score</span></div>
            <div class="stat-item"><span class="stat-val">{{ result()!.maxScore }}</span><span class="stat-k">Max Score</span></div>
          </div>
        </div>

        <!-- Error log -->
        @if (result()!.errorLog?.length) {
          <div class="section-card">
            <h3 class="section-title">Error Reflection</h3>
            @for (e of result()!.errorLog; track e.questionId) {
              <div class="error-log-item">
                <div class="el-header">
                  <span class="el-qid">Q: {{ e.questionId }}</span>
                  @if (e.selectedCategory) {
                    <span class="el-cat">{{ ERROR_CATEGORY_LABELS[e.selectedCategory] }}</span>
                  }
                </div>
                @if (e.learnerExplanation) {
                  <p><strong>Why missed:</strong> {{ e.learnerExplanation }}</p>
                }
                @if (e.correctionPlan) {
                  <p><strong>Correction plan:</strong> {{ e.correctionPlan }}</p>
                }
              </div>
            }
          </div>
        }

        <!-- Answers breakdown -->
        @if (result()!.answers?.length) {
          <div class="section-card">
            <h3 class="section-title">Answer Breakdown</h3>
            <div class="answers-table-wrap">
              <table class="answers-table">
                <thead>
                  <tr><th>Question</th><th>Your Answer</th><th>Correct</th><th>Points</th></tr>
                </thead>
                <tbody>
                  @for (a of result()!.answers; track a.questionId; let i = $index) {
                    <tr [class.tr--correct]="a.isCorrect" [class.tr--wrong]="!a.isCorrect">
                      <td>{{ i + 1 }}</td>
                      <td>{{ formatAnswer(a) }}</td>
                      <td>{{ a.isCorrect ? '✓' : '✗' }}</td>
                      <td>{{ a.pointsAwarded ?? 0 }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

        <!-- Instructor notes -->
        <div class="section-card">
          <h3 class="section-title">Instructor Notes</h3>
          @if (result()!.instructorNotes?.length) {
            @for (n of result()!.instructorNotes; track n.createdAt) {
              <div class="note-item">
                <p>{{ n.note }}</p>
                <span class="note-meta">by {{ n.reviewerUid }} — {{ formatDate(n.createdAt) }}</span>
              </div>
            }
          }
          <textarea class="note-textarea" rows="3" placeholder="Add an instructor note…" [(ngModel)]="newNote"></textarea>
          <button type="button" class="btn-add-note" (click)="addNote()" [disabled]="savingNote() || !newNote.trim()">
            {{ savingNote() ? 'Saving…' : 'Add Note' }}
          </button>
        </div>

        <!-- Mark reviewed -->
        <div class="action-bar">
          @if (!result()!.reviewedAt) {
            <button type="button" class="btn-reviewed" (click)="markReviewed()" [disabled]="markingReviewed()">
              {{ markingReviewed() ? 'Saving…' : '✓ Mark as Reviewed' }}
            </button>
          } @else {
            <span class="reviewed-badge">✓ Reviewed on {{ formatDate(result()!.reviewedAt) }}</span>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .page-wrap { max-width: 900px; margin: 0 auto; padding: 1.5rem 1rem; display: grid; gap: 1.25rem; }
    .breadcrumb a { color: #1a74c8; font-size: 0.88rem; font-weight: 600; text-decoration: none; }
    .breadcrumb a:hover { text-decoration: underline; }

    .state-loading { display: flex; align-items: center; gap: 0.75rem; padding: 2rem; color: #5f7f9f; }
    .spinner { width: 1.5rem; height: 1.5rem; border: 2px solid #d9e5f2; border-top-color: #1a74c8; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .state-empty { padding: 2rem; text-align: center; color: #7fa3c8; }

    .detail-header { background: #fff; border: 1px solid #d9e5f2; border-radius: 1rem; padding: 1.3rem 1.5rem; display: grid; gap: 0.6rem; }
    .dh-badges { display: flex; gap: 0.4rem; flex-wrap: wrap; }
    .detail-header h1 { margin: 0; color: #0f3659; font-size: 1.3rem; }
    .dh-meta { display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.83rem; color: #5f7f9f; }
    .dh-meta code { background: #f0f6ff; padding: 0.1rem 0.3rem; border-radius: 0.3rem; color: #1a74c8; font-size: 0.78rem; }

    .badge { display: inline-block; padding: 0.18rem 0.55rem; border-radius: 999px; font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; }
    .badge--test { background: #e8f0fb; color: #1a74c8; }
    .badge--practice { background: #e0f2fe; color: #0284c7; }
    .badge--mock { background: #ede9fe; color: #7c3aed; }
    .badge--pass { background: #dcfce7; color: #16a34a; }
    .badge--fail { background: #fee2e2; color: #dc2626; }

    .score-card { display: flex; align-items: center; gap: 2rem; background: #fff; border: 1px solid #d9e5f2; border-radius: 1rem; padding: 1.3rem 1.5rem; }
    .score-circle { width: 100px; height: 100px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 5px solid #d9e5f2; flex-shrink: 0; }
    .sc--pass { border-color: #4ade80; background: #f0fdf4; }
    .sc--fail { border-color: #f87171; background: #fff5f5; }
    .sc-pct { font-size: 1.4rem; font-weight: 900; color: #0f3659; line-height: 1; }
    .sc-label { font-size: 0.7rem; font-weight: 800; letter-spacing: 0.1em; margin-top: 0.2rem; }
    .sc--pass .sc-label { color: #16a34a; }
    .sc--fail .sc-label { color: #dc2626; }
    .score-stats { display: flex; gap: 1.5rem; }
    .stat-item { display: flex; flex-direction: column; }
    .stat-val { font-size: 1.5rem; font-weight: 900; color: #0f3659; }
    .stat-k { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; color: #7fa3c8; }

    .section-card { background: #fff; border: 1px solid #d9e5f2; border-radius: 1rem; padding: 1.2rem 1.4rem; display: grid; gap: 0.85rem; }
    .section-title { margin: 0; color: #0f3659; font-size: 0.95rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.07em; }

    .error-log-item { border: 1px solid #fde68a; border-radius: 0.65rem; padding: 0.75rem 1rem; background: #fffbeb; display: grid; gap: 0.35rem; }
    .el-header { display: flex; align-items: center; gap: 0.65rem; }
    .el-qid { font-size: 0.8rem; font-weight: 700; color: #78350f; }
    .el-cat { padding: 0.15rem 0.55rem; background: #fef3c7; color: #92400e; border-radius: 999px; font-size: 0.72rem; font-weight: 700; }
    .error-log-item p { margin: 0; font-size: 0.87rem; color: #1e3a5a; }

    .answers-table-wrap { overflow-x: auto; }
    .answers-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
    .answers-table th { padding: 0.5rem 0.75rem; text-align: left; font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #5f7f9f; border-bottom: 1px solid #d9e5f2; background: #f4f9ff; }
    .answers-table td { padding: 0.5rem 0.75rem; border-bottom: 1px solid #eef3fb; color: #1e3a5a; }
    .tr--correct td:nth-child(3) { color: #16a34a; font-weight: 700; }
    .tr--wrong td:nth-child(3) { color: #dc2626; font-weight: 700; }

    .note-item { background: #f8fbff; border: 1px solid #d9e5f2; border-radius: 0.6rem; padding: 0.65rem 0.85rem; }
    .note-item p { margin: 0 0 0.25rem; color: #1e3a5a; font-size: 0.88rem; }
    .note-meta { font-size: 0.72rem; color: #7fa3c8; }
    .note-textarea { padding: 0.65rem 0.8rem; border: 1.5px solid #d9e5f2; border-radius: 0.65rem; font-size: 0.88rem; color: #1e3a5a; resize: vertical; outline: none; width: 100%; box-sizing: border-box; }
    .btn-add-note { padding: 0.5rem 1.1rem; border: none; border-radius: 0.6rem; background: linear-gradient(135deg, #0f3659, #1a74c8); color: #fff; font-weight: 700; font-size: 0.88rem; cursor: pointer; align-self: flex-start; }
    .btn-add-note:disabled { opacity: 0.5; cursor: not-allowed; }

    .action-bar { display: flex; justify-content: flex-end; }
    .btn-reviewed { padding: 0.6rem 1.4rem; border: none; border-radius: 0.65rem; background: linear-gradient(135deg, #065f46, #16a34a); color: #fff; font-weight: 700; font-size: 0.9rem; cursor: pointer; }
    .btn-reviewed:disabled { opacity: 0.5; cursor: not-allowed; }
    .reviewed-badge { padding: 0.4rem 1rem; background: #dcfce7; color: #16a34a; border-radius: 999px; font-weight: 700; font-size: 0.85rem; }
  `],
})
export class InstructorListeningResultDetailPage implements OnInit {
  private route = inject(ActivatedRoute);
  private testSvc = inject(ListeningTestService);
  private auth = inject(Auth);

  readonly TARGET_TEST_LABELS = TARGET_TEST_LABELS;
  readonly ERROR_CATEGORY_LABELS = ERROR_CATEGORY_LABELS;

  readonly loading = signal(true);
  readonly result = signal<ListeningTestResult | null>(null);
  readonly assessment = signal<ListeningTestAssessment | null>(null);
  readonly savingNote = signal(false);
  readonly markingReviewed = signal(false);

  newNote = '';

  async ngOnInit(): Promise<void> {
    const resultId = this.route.snapshot.paramMap.get('resultId') ?? '';
    try {
      const r = await this.testSvc.getResultById(resultId);
      this.result.set(r ?? null);
      if (r?.assessmentId) {
        const a = await this.testSvc.getAssessment(r.assessmentId);
        this.assessment.set(a ?? null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.loading.set(false);
    }
  }

  async addNote(): Promise<void> {
    const rid = this.result()?.id;
    if (!rid || !this.newNote.trim()) return;
    this.savingNote.set(true);
    try {
      await this.testSvc.addInstructorNote(rid, this.newNote.trim(), this.auth.currentUser?.uid ?? 'instructor');
      // refresh
      const r = await this.testSvc.getResultById(rid);
      this.result.set(r ?? null);
      this.newNote = '';
    } catch (e) {
      console.error(e);
    } finally {
      this.savingNote.set(false);
    }
  }

  async markReviewed(): Promise<void> {
    const rid = this.result()?.id;
    if (!rid) return;
    this.markingReviewed.set(true);
    try {
      const { Timestamp } = await import('@angular/fire/firestore');
      await this.testSvc.updateErrorLog(rid, this.result()!.errorLog ?? [], this.auth.currentUser?.uid ?? '', this.result()!.assessmentId);
      const r = await this.testSvc.getResultById(rid);
      this.result.set(r ?? null);
    } catch (e) {
      console.error(e);
    } finally {
      this.markingReviewed.set(false);
    }
  }

  formatDate(ts: unknown): string {
    if (!ts) return '—';
    if (ts instanceof Date) return ts.toLocaleDateString();
    if (typeof ts === 'object' && 'toDate' in (ts as object)) {
      return (ts as { toDate(): Date }).toDate().toLocaleDateString();
    }
    return '—';
  }

  formatDuration(s: number): string {
    const m = Math.floor((s ?? 0) / 60);
    const sec = (s ?? 0) % 60;
    return `${m}m ${sec}s`;
  }

  formatAnswer(a: import('../models/listening-test.models').ListeningAnswer): string {
    if (a.textAnswer !== undefined) return a.textAnswer || '(no answer)';
    if (a.matchingAnswers?.length) return a.matchingAnswers.map((m) => `${m.left}→${m.selectedRight}`).join(' | ');
    return a.selectedAnswerKeys?.join(', ') || '(no answer)';
  }
}
