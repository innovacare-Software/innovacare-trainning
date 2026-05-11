import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe, Location } from '@angular/common';
import {
  Firestore,
  collection,
  collectionData,
  query,
  orderBy,
  limit,
  where,
} from '@angular/fire/firestore';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, switchMap, Observable, combineLatest } from 'rxjs';
import { OrgContextService } from '../../../core/organization/org-context.service';
import {
  ShareApp,
  ShareEvent,
  SharePlatform,
  ShareSourcePage,
} from '../../../core/analytics/share-event.model';

interface RowVm extends ShareEvent {
  id: string;
  ts: Date | null;
}

const PLATFORMS: SharePlatform[] = [
  'whatsapp', 'telegram', 'facebook', 'x', 'linkedin', 'email', 'copy', 'native_share',
];
const SOURCES: ShareSourcePage[] = [
  'programs_page', 'program_detail', 'course_detail', 'catalogue_page',
];

@Component({
  selector: 'admin-share-analytics-page',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
    <section class="sec-page">
      <header class="sec-head">
        <div class="sec-head__nav">
          <button type="button" class="back-btn" (click)="goBack()" aria-label="Back">← Back</button>
        </div>
        <div>
          <h2>Share Analytics</h2>
          <p>Viral-loop tracking — which courses, programs and channels drive the most reach.</p>
          <p class="sec-scope" *ngIf="scopeLabel() as label">Scope: <strong>{{ label }}</strong></p>
        </div>
      </header>

      <section class="kpi-grid">
        <div class="kpi"><span class="lbl">Total (7d)</span><span class="val">{{ kpis().total }}</span></div>
        <div class="kpi"><span class="lbl">Today</span><span class="val">{{ kpis().today }}</span></div>
        <div class="kpi"><span class="lbl">Top platform</span><span class="val">{{ kpis().topPlatform || '—' }}</span></div>
        <div class="kpi"><span class="lbl">Top course</span><span class="val">{{ kpis().topCourse || '—' }}</span></div>
        <div class="kpi"><span class="lbl">Top program</span><span class="val">{{ kpis().topProgram || '—' }}</span></div>
        <div class="kpi"><span class="lbl">Mobile / Desktop</span><span class="val">{{ kpis().mobile }} / {{ kpis().desktop }}</span></div>
      </section>

      <section class="filters">
        <label>App
          <select (change)="filterApp.set(asTarget($event).value)">
            <option value="">All</option>
            <option value="innovacare_review">Innovacare Review</option>
            <option value="sygepec">SYGEPEC</option>
          </select>
        </label>
        <label>Platform
          <select (change)="filterPlatform.set(asTarget($event).value)">
            <option value="">All</option>
            <option *ngFor="let p of platforms" [value]="p">{{ p }}</option>
          </select>
        </label>
        <label>Source page
          <select (change)="filterSource.set(asTarget($event).value)">
            <option value="">All</option>
            <option *ngFor="let s of sources" [value]="s">{{ s }}</option>
          </select>
        </label>
        <label>Days
          <select (change)="filterDays.set(+asTarget($event).value)">
            <option value="1">Last 24h</option>
            <option value="7" selected>Last 7 days</option>
            <option value="30">Last 30 days</option>
          </select>
        </label>
      </section>

      <section class="grid-2">
        <div class="card">
          <h3>Shares by platform</h3>
          <table class="mini">
            <tr *ngFor="let r of byPlatform()">
              <td>{{ r.key }}</td>
              <td class="num">{{ r.count }}</td>
              <td class="bar"><span [style.width.%]="pct(r.count, kpis().total)"></span></td>
            </tr>
            <tr *ngIf="byPlatform().length === 0"><td colspan="3" class="empty">No data</td></tr>
          </table>
        </div>

        <div class="card">
          <h3>Shares by source page</h3>
          <table class="mini">
            <tr *ngFor="let r of bySource()">
              <td>{{ r.key }}</td>
              <td class="num">{{ r.count }}</td>
              <td class="bar"><span [style.width.%]="pct(r.count, kpis().total)"></span></td>
            </tr>
            <tr *ngIf="bySource().length === 0"><td colspan="3" class="empty">No data</td></tr>
          </table>
        </div>

        <div class="card">
          <h3>Top shared courses</h3>
          <table class="mini">
            <tr *ngFor="let r of topCourses()">
              <td class="ellipsis" [title]="r.key">{{ r.key }}</td>
              <td class="num">{{ r.count }}</td>
            </tr>
            <tr *ngIf="topCourses().length === 0"><td colspan="2" class="empty">No data</td></tr>
          </table>
        </div>

        <div class="card">
          <h3>Top shared programs</h3>
          <table class="mini">
            <tr *ngFor="let r of topPrograms()">
              <td class="ellipsis" [title]="r.key">{{ r.key }}</td>
              <td class="num">{{ r.count }}</td>
            </tr>
            <tr *ngIf="topPrograms().length === 0"><td colspan="2" class="empty">No data</td></tr>
          </table>
        </div>
      </section>

      <section class="table-wrap">
        <h3 class="recent-title">Recent share events</h3>
        <table class="alerts">
          <thead>
            <tr>
              <th>Date</th><th>App</th><th>Platform</th><th>Source</th>
              <th>Course</th><th>Program</th><th>Org</th><th>Device</th><th>User</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngIf="loading()" class="empty"><td colspan="9">Loading…</td></tr>
            <tr *ngIf="!loading() && filtered().length === 0" class="empty">
              <td colspan="9">No share events match these filters.</td>
            </tr>
            <tr *ngFor="let r of recent()">
              <td>{{ r.ts | date:'short' }}</td>
              <td>{{ r.app }}</td>
              <td>{{ r.platform }}</td>
              <td>{{ r.sourcePage }}</td>
              <td class="ellipsis">{{ r.courseId || '—' }}</td>
              <td class="ellipsis">{{ r.programId || '—' }}</td>
              <td>{{ r.orgId || '—' }}</td>
              <td>{{ r.deviceType || '—' }}</td>
              <td>{{ r.userId || 'anon' }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <p class="err" *ngIf="errored()">⚠ Failed to load share events. Check Firestore rules / indexes.</p>
    </section>
  `,
  styles: [`
    .sec-page { padding: 1.25rem 1.5rem; max-width: 1300px; margin: 0 auto; color: #1f2d3d; }
    .sec-head { display: flex; gap: 1rem; align-items: flex-start; margin-bottom: 1rem; }
    .sec-head__nav { padding-top: .25rem; }
    .back-btn { background: #fff; border: 1px solid #c9d9ea; color: #1f486c; border-radius: 6px;
      padding: .35rem .75rem; cursor: pointer; font-weight: 600; }
    .back-btn:hover { background: #f1f6fb; }
    .sec-head h2 { margin: 0 0 .15rem; font-size: 1.25rem; }
    .sec-head p { margin: 0; color: #56708b; font-size: .88rem; }
    .sec-scope { margin-top: .25rem !important; }

    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: .65rem; margin: 1rem 0; }
    .kpi { background: #fff; border: 1px solid #e1e9f1; border-radius: 8px; padding: .8rem .9rem;
      display: grid; gap: .25rem; }
    .kpi .lbl { color: #56708b; font-size: .75rem; text-transform: uppercase; letter-spacing: .04em; }
    .kpi .val { font-size: 1.4rem; font-weight: 700; color: #163251; }

    .filters { display: flex; flex-wrap: wrap; gap: .85rem; margin: .5rem 0 1rem;
      background: #fff; padding: .8rem; border-radius: 8px; border: 1px solid #e1e9f1; }
    .filters label { display: grid; gap: .2rem; font-size: .78rem; color: #56708b; }
    .filters select { padding: .35rem .45rem; border: 1px solid #cdd9e6; border-radius: 5px;
      background: #fff; color: #1f2d3d; font: inherit; }

    .grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: .85rem; margin-bottom: 1rem; }
    .card { background: #fff; border: 1px solid #e1e9f1; border-radius: 8px; padding: .9rem 1rem; }
    .card h3 { margin: 0 0 .55rem; font-size: .95rem; color: #163251; }
    table.mini { width: 100%; border-collapse: collapse; font-size: .82rem; }
    table.mini td { padding: .3rem .25rem; border-bottom: 1px solid #f1f5f9; }
    table.mini td.num { width: 50px; text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; }
    table.mini td.bar { width: 35%; padding-left: .5rem; }
    table.mini td.bar span { display: block; height: 6px; background: #4a8fc4; border-radius: 3px; }
    .ellipsis { max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .empty { text-align: center; color: #889bb0; font-style: italic; }

    .table-wrap { background: #fff; border: 1px solid #e1e9f1; border-radius: 8px; padding: .8rem 1rem; }
    .recent-title { margin: 0 0 .55rem; font-size: .95rem; color: #163251; }
    table.alerts { width: 100%; border-collapse: collapse; font-size: .82rem; }
    table.alerts th { text-align: left; color: #56708b; font-weight: 600; padding: .35rem .4rem;
      border-bottom: 1px solid #e1e9f1; font-size: .72rem; text-transform: uppercase; letter-spacing: .04em; }
    table.alerts td { padding: .35rem .4rem; border-bottom: 1px solid #f1f5f9; }

    .err { color: #b13a3a; background: #fbeaea; border: 1px solid #f5c8c8; border-radius: 6px;
      padding: .55rem .75rem; margin-top: 1rem; font-size: .85rem; }
  `],
})
export class AdminShareAnalyticsPage {
  private readonly firestore = inject(Firestore);
  private readonly ctx = inject(OrgContextService);
  private readonly location = inject(Location);

  readonly platforms = PLATFORMS;
  readonly sources = SOURCES;

  readonly filterApp = signal<string>('');
  readonly filterPlatform = signal<string>('');
  readonly filterSource = signal<string>('');
  readonly filterDays = signal<number>(7);

  readonly errored = signal(false);
  readonly loading = signal(true);

  readonly scope = toSignal(this.ctx.context$, { initialValue: null as any });

  scopeLabel(): string | null {
    const c = this.scope();
    if (!c) return null;
    if (c.isSuperAdmin) return 'All organizations (super_admin)';
    const ids = (c.memberships || [])
      .filter((m: any) => m.status === 'active' && (m.role === 'org_admin' || m.role === 'program_admin'))
      .map((m: any) => m.orgId);
    return ids.length ? `${ids.length} organization${ids.length > 1 ? 's' : ''}` : null;
  }

  private readonly events$: Observable<RowVm[]> = this.ctx.context$.pipe(
    switchMap((c) => {
      this.loading.set(true);
      this.errored.set(false);
      const col = collection(this.firestore, 'shareEvents');

      if (c.isSuperAdmin) {
        return collectionData(query(col, orderBy('createdAt', 'desc'), limit(500)), { idField: 'id' }).pipe(
          map((rows) => this.toVm(rows as any[])),
          catchError(() => { this.errored.set(true); return of([] as RowVm[]); }),
        );
      }

      const adminOrgIds = Array.from(new Set(
        (c.memberships || [])
          .filter((m: any) => m.status === 'active' && (m.role === 'org_admin' || m.role === 'program_admin'))
          .map((m: any) => m.orgId)
          .filter((id: any) => typeof id === 'string' && id.length > 0)
      )).slice(0, 10) as string[];

      if (!adminOrgIds.length) return of([] as RowVm[]);

      const q = query(col, where('orgId', 'in', adminOrgIds), orderBy('createdAt', 'desc'), limit(500));
      return collectionData(q, { idField: 'id' }).pipe(
        map((rows) => this.toVm(rows as any[])),
        catchError(() => { this.errored.set(true); return of([] as RowVm[]); }),
      );
    }),
  );

  readonly events = toSignal(this.events$, { initialValue: [] as RowVm[] });

  private toVm(rows: any[]): RowVm[] {
    this.loading.set(false);
    return rows.map((r) => ({
      ...r,
      ts: r.createdAt?.toDate ? r.createdAt.toDate() : (r.createdAt instanceof Date ? r.createdAt : null),
    } as RowVm));
  }

  readonly filtered = computed<RowVm[]>(() => {
    const cutoff = Date.now() - this.filterDays() * 24 * 3600 * 1000;
    const fa = this.filterApp(), fp = this.filterPlatform(), fs = this.filterSource();
    return this.events().filter((r) => {
      if (r.ts && r.ts.getTime() < cutoff) return false;
      if (fa && r.app !== fa) return false;
      if (fp && r.platform !== fp) return false;
      if (fs && r.sourcePage !== fs) return false;
      return true;
    });
  });

  readonly recent = computed(() => this.filtered().slice(0, 100));

  readonly kpis = computed(() => {
    const list = this.filtered();
    const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
    let today = 0, mobile = 0, desktop = 0;
    const platformC = new Map<string, number>();
    const courseC = new Map<string, number>();
    const programC = new Map<string, number>();
    for (const r of list) {
      if (r.ts && r.ts.getTime() >= startToday.getTime()) today++;
      if (r.deviceType === 'mobile') mobile++;
      else if (r.deviceType === 'desktop') desktop++;
      platformC.set(r.platform, (platformC.get(r.platform) || 0) + 1);
      if (r.courseId) courseC.set(r.courseId, (courseC.get(r.courseId) || 0) + 1);
      if (r.programId) programC.set(r.programId, (programC.get(r.programId) || 0) + 1);
    }
    const top = (m: Map<string, number>) =>
      Array.from(m.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
    return {
      total: list.length,
      today,
      mobile,
      desktop,
      topPlatform: top(platformC),
      topCourse: top(courseC),
      topProgram: top(programC),
    };
  });

  readonly byPlatform = computed(() => this.bucket((r) => r.platform));
  readonly bySource = computed(() => this.bucket((r) => r.sourcePage));
  readonly topCourses = computed(() =>
    this.bucket((r) => r.courseId ?? '').filter((b) => b.key).slice(0, 10));
  readonly topPrograms = computed(() =>
    this.bucket((r) => r.programId ?? '').filter((b) => b.key).slice(0, 10));

  private bucket(keyFn: (r: RowVm) => string): { key: string; count: number }[] {
    const m = new Map<string, number>();
    for (const r of this.filtered()) {
      const k = keyFn(r);
      m.set(k, (m.get(k) || 0) + 1);
    }
    return Array.from(m.entries())
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count);
  }

  pct(n: number, total: number): number {
    return total > 0 ? Math.round((n / total) * 100) : 0;
  }

  asTarget(ev: Event): HTMLSelectElement | HTMLInputElement {
    return ev.target as HTMLSelectElement;
  }

  goBack(): void {
    try {
      this.location.back();
    } catch {
      window.location.href = '/';
    }
  }
}
