import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ListeningTestService } from '../services/listening-test.service';
import {
  ListeningTestResult,
  TargetTest,
  ListeningMode,
  TARGET_TEST_LABELS,
} from '../models/listening-test.models';

@Component({
  selector: 'app-instructor-listening-results-table',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="page-wrap">
      <div class="page-header">
        <h1>Listening Test Results</h1>
        <p class="page-subtitle">Review all learner listening test submissions.</p>
      </div>

      <!-- Filters -->
      <div class="filters-card">
        <div class="filter-group">
          <label>Target Test</label>
          <select [(ngModel)]="filterTest" (ngModelChange)="applyFilters()">
            <option value="">All Tests</option>
            @for (t of testOptions; track t.value) {
              <option [value]="t.value">{{ t.label }}</option>
            }
          </select>
        </div>
        <div class="filter-group">
          <label>Mode</label>
          <select [(ngModel)]="filterMode" (ngModelChange)="applyFilters()">
            <option value="">All Modes</option>
            <option value="PRACTICE">Practice</option>
            <option value="MOCK_EXAM">Mock Exam</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Status</label>
          <select [(ngModel)]="filterStatus" (ngModelChange)="applyFilters()">
            <option value="">All</option>
            <option value="passed">Passed</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Learner ID</label>
          <input type="text" placeholder="Search learner UID…" [(ngModel)]="filterLearner" (ngModelChange)="applyFilters()" />
        </div>
        <button type="button" class="btn-reset" (click)="resetFilters()">Reset</button>
      </div>

      <!-- Table -->
      @if (loading()) {
        <div class="state-loading"><div class="spinner"></div><p>Loading results…</p></div>
      } @else if (filtered().length === 0) {
        <div class="state-empty">No results found.</div>
      } @else {
        <div class="results-table-wrap">
          <table class="results-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Learner</th>
                <th>Title</th>
                <th>Target Test</th>
                <th>Mode</th>
                <th>Score</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (r of filtered(); track r.id; let i = $index) {
                <tr>
                  <td class="td-num">{{ i + 1 }}</td>
                  <td class="td-learner"><code>{{ r.learnerId }}</code></td>
                  <td class="td-title">{{ r.title ?? r.assessmentId }}</td>
                  <td><span class="badge badge--test">{{ TARGET_TEST_LABELS[r.targetTest] }}</span></td>
                  <td>
                    <span class="badge" [class.badge--practice]="r.mode === 'PRACTICE'" [class.badge--mock]="r.mode === 'MOCK_EXAM'">
                      {{ r.mode === 'PRACTICE' ? 'Practice' : 'Mock Exam' }}
                    </span>
                  </td>
                  <td class="td-score">{{ r.score }}/{{ r.maxScore }} ({{ r.percentage }}%)</td>
                  <td>
                    <span class="badge" [class.badge--pass]="r.passed" [class.badge--fail]="!r.passed">
                      {{ r.passed ? 'Passed' : 'Failed' }}
                    </span>
                  </td>
                  <td class="td-date">{{ formatDate(r.submittedAt) }}</td>
                  <td>
                    <a [routerLink]="['/manager/language/listening-results', r.id]" class="btn-view">View →</a>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-wrap { max-width: 1100px; margin: 0 auto; padding: 1.5rem 1rem; display: grid; gap: 1.25rem; }
    .page-header h1 { margin: 0 0 0.25rem; color: #0f3659; font-size: 1.4rem; }
    .page-subtitle { margin: 0; color: #5f7f9f; font-size: 0.9rem; }

    .filters-card { background: #fff; border: 1px solid #d9e5f2; border-radius: 1rem; padding: 1rem 1.2rem; display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: flex-end; }
    .filter-group { display: grid; gap: 0.3rem; }
    .filter-group label { font-size: 0.72rem; font-weight: 700; color: #5f7f9f; text-transform: uppercase; letter-spacing: 0.05em; }
    .filter-group select, .filter-group input { padding: 0.45rem 0.7rem; border: 1.5px solid #d9e5f2; border-radius: 0.55rem; font-size: 0.88rem; color: #1e3a5a; outline: none; }
    .btn-reset { padding: 0.45rem 1rem; border: 1.5px solid #fca5a5; border-radius: 0.55rem; background: #fff5f5; color: #dc2626; font-weight: 600; font-size: 0.83rem; cursor: pointer; }

    .state-loading { display: flex; align-items: center; gap: 0.75rem; padding: 2rem; color: #5f7f9f; }
    .spinner { width: 1.5rem; height: 1.5rem; border: 2px solid #d9e5f2; border-top-color: #1a74c8; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .state-empty { padding: 2rem; text-align: center; color: #7fa3c8; background: #f8fbff; border: 1px solid #d9e5f2; border-radius: 1rem; }

    .results-table-wrap { overflow-x: auto; border: 1px solid #d9e5f2; border-radius: 1rem; }
    .results-table { width: 100%; border-collapse: collapse; }
    .results-table thead { background: #f4f9ff; }
    .results-table th { padding: 0.65rem 0.85rem; text-align: left; font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #5f7f9f; white-space: nowrap; border-bottom: 1px solid #d9e5f2; }
    .results-table td { padding: 0.65rem 0.85rem; font-size: 0.88rem; color: #1e3a5a; border-bottom: 1px solid #eef3fb; }
    .results-table tbody tr:last-child td { border-bottom: none; }
    .results-table tbody tr:hover td { background: #f8fbff; }
    .td-num { color: #7fa3c8; font-size: 0.78rem; }
    .td-learner code { font-size: 0.78rem; background: #f0f6ff; padding: 0.1rem 0.4rem; border-radius: 0.35rem; color: #1a74c8; }
    .td-title { max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .td-score { font-weight: 700; }
    .td-date { font-size: 0.8rem; color: #7fa3c8; white-space: nowrap; }

    .badge { display: inline-block; padding: 0.18rem 0.55rem; border-radius: 999px; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; }
    .badge--test { background: #e8f0fb; color: #1a74c8; }
    .badge--practice { background: #e0f2fe; color: #0284c7; }
    .badge--mock { background: #ede9fe; color: #7c3aed; }
    .badge--pass { background: #dcfce7; color: #16a34a; }
    .badge--fail { background: #fee2e2; color: #dc2626; }

    .btn-view { padding: 0.3rem 0.75rem; border: 1.5px solid #d9e5f2; border-radius: 0.45rem; color: #1a74c8; font-size: 0.8rem; font-weight: 600; text-decoration: none; }
    .btn-view:hover { background: #f0f6ff; }
  `],
})
export class InstructorListeningResultsTablePage implements OnInit {
  private testSvc = inject(ListeningTestService);
  readonly TARGET_TEST_LABELS = TARGET_TEST_LABELS;

  readonly loading = signal(true);
  readonly allResults = signal<ListeningTestResult[]>([]);
  readonly filtered = signal<ListeningTestResult[]>([]);

  filterTest = '';
  filterMode = '';
  filterStatus = '';
  filterLearner = '';

  readonly testOptions = Object.entries(TARGET_TEST_LABELS).map(([value, label]) => ({ value, label }));

  async ngOnInit(): Promise<void> {
    try {
      const results = await this.testSvc.getAllResults();
      this.allResults.set(results);
      this.filtered.set(results);
    } catch (e) {
      console.error(e);
    } finally {
      this.loading.set(false);
    }
  }

  applyFilters(): void {
    let r = this.allResults();
    if (this.filterTest) r = r.filter((x) => x.targetTest === this.filterTest);
    if (this.filterMode) r = r.filter((x) => x.mode === this.filterMode);
    if (this.filterStatus === 'passed') r = r.filter((x) => x.passed);
    if (this.filterStatus === 'failed') r = r.filter((x) => !x.passed);
    if (this.filterLearner) r = r.filter((x) => x.learnerId.includes(this.filterLearner));
    this.filtered.set(r);
  }

  resetFilters(): void {
    this.filterTest = '';
    this.filterMode = '';
    this.filterStatus = '';
    this.filterLearner = '';
    this.filtered.set(this.allResults());
  }

  formatDate(ts: unknown): string {
    if (!ts) return '—';
    if (ts instanceof Date) return ts.toLocaleDateString();
    if (typeof ts === 'object' && 'toDate' in (ts as object)) {
      return (ts as { toDate(): Date }).toDate().toLocaleDateString();
    }
    return '—';
  }
}
