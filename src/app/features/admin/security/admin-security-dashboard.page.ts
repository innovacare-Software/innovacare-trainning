import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe, Location } from '@angular/common';
import { Firestore, collection, collectionData, doc, query, orderBy, limit, updateDoc, serverTimestamp, where } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of, switchMap, combineLatest, Observable } from 'rxjs';
import { OrgContextService } from '../../../core/organization/org-context.service';
import { SecurityEvent, SecurityEventSeverity, SecurityEventType } from '../../../core/security/security-event.model';

interface RowVm extends SecurityEvent {
  id: string;
  ts: Date | null;
}

@Component({
  selector: 'admin-security-dashboard-page',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
    <section class="sec-page">
      <header class="sec-head">
        <div class="sec-head__nav">
          <button type="button" class="back-btn" (click)="goBack()" aria-label="Back">
            ← Back
          </button>
        </div>
        <div>
          <h2>Admin Security Center</h2>
          <p>Audit trail, intrusion alerts and abuse signals across your organizations.</p>
          <p class="sec-scope" *ngIf="scopeLabel() as label">Scope: <strong>{{ label }}</strong></p>
        </div>
      </header>

      <section class="kpi-grid">
        <div class="kpi crit"><span class="lbl">Critical (open)</span><span class="val">{{ kpis().critical }}</span></div>
        <div class="kpi high"><span class="lbl">High (open)</span><span class="val">{{ kpis().high }}</span></div>
        <div class="kpi"><span class="lbl">Today</span><span class="val">{{ kpis().today }}</span></div>
        <div class="kpi"><span class="lbl">Cross-tenant</span><span class="val">{{ kpis().crossTenant }}</span></div>
        <div class="kpi"><span class="lbl">Admin denied</span><span class="val">{{ kpis().adminDenied }}</span></div>
        <div class="kpi"><span class="lbl">Suspicious uploads</span><span class="val">{{ kpis().uploads }}</span></div>
      </section>

      <section class="filters">
        <label>App
          <select (change)="filterApp.set(asEvtTarget($event).value)">
            <option value="">All</option>
            <option value="innovacare_review">Innovacare Review</option>
            <option value="sygepec">SYGEPEC</option>
          </select>
        </label>
        <label>Severity
          <select (change)="filterSeverity.set(asEvtTarget($event).value)">
            <option value="">All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
        <label>Event type
          <select (change)="filterType.set(asEvtTarget($event).value)">
            <option value="">All</option>
            <option *ngFor="let t of allTypes" [value]="t">{{ t }}</option>
          </select>
        </label>
        <label>Status
          <select (change)="filterResolved.set(asEvtTarget($event).value)">
            <option value="">All</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
          </select>
        </label>
        <label>Search
          <input type="text" placeholder="user, route, resource…" (input)="filterText.set(asEvtTarget($event).value)" />
        </label>
      </section>

      <section class="table-wrap">
        <table class="alerts">
          <thead>
            <tr>
              <th>Date</th><th>App</th><th>Sev</th><th>Type</th><th>User</th><th>Org</th>
              <th>Route</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngIf="loading()" class="empty"><td colspan="9">Loading security events…</td></tr>
            <tr *ngIf="!loading() && filtered().length === 0" class="empty">
              <td colspan="9">No security events match these filters.</td>
            </tr>
            <tr *ngFor="let r of filtered()" [class]="'row ' + r.severity">
              <td>{{ r.ts | date:'short' }}</td>
              <td>{{ r.app }}</td>
              <td><span class="sev sev-{{r.severity}}">{{ r.severity }}</span></td>
              <td>{{ r.eventType }}</td>
              <td>{{ r.userEmail || r.userId || '—' }}</td>
              <td>{{ r.attemptedOrgId || r.orgId || '—' }}</td>
              <td class="route">{{ r.route || r.action || '—' }}</td>
              <td>
                <span *ngIf="r.resolved" class="status ok">Resolved</span>
                <span *ngIf="!r.resolved" class="status open">Open</span>
              </td>
              <td>
                <button type="button" class="btn-link" (click)="open(r)">Details</button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <aside class="drawer" *ngIf="selected() as ev">
        <header>
          <h3>{{ ev.eventType }} <span class="sev sev-{{ev.severity}}">{{ ev.severity }}</span></h3>
          <button type="button" class="btn-link" (click)="selected.set(null)">Close</button>
        </header>
        <dl class="meta">
          <dt>Time</dt><dd>{{ ev.ts | date:'medium' }}</dd>
          <dt>App</dt><dd>{{ ev.app }}</dd>
          <dt>User</dt><dd>{{ ev.userEmail || ev.userId || '—' }}</dd>
          <dt>Role</dt><dd>{{ ev.role || '—' }}</dd>
          <dt>Org</dt><dd>{{ ev.orgId || '—' }}</dd>
          <dt>Attempted org</dt><dd>{{ ev.attemptedOrgId || '—' }}</dd>
          <dt>Route</dt><dd>{{ ev.route || '—' }}</dd>
          <dt>Action</dt><dd>{{ ev.action || '—' }}</dd>
          <dt>Resource</dt><dd>{{ ev.resourceType || '—' }} / {{ ev.resourceId || '—' }}</dd>
          <dt>IP</dt><dd>{{ ev.ip || '—' }}</dd>
          <dt>User agent</dt><dd class="ua">{{ ev.userAgent || '—' }}</dd>
        </dl>
        <h4>Metadata</h4>
        <pre class="meta-json">{{ ev.metadata ? (ev.metadata | json) : '—' }}</pre>

        <section class="resolve" *ngIf="!ev.resolved">
          <h4>Resolve</h4>
          <textarea [value]="resolutionNote()" (input)="resolutionNote.set(asEvtTarget($event).value)" rows="3" placeholder="Resolution note (visible in audit trail)"></textarea>
          <div class="actions">
            <button type="button" class="btn primary" (click)="resolve(ev)" [disabled]="resolving()">
              {{ resolving() ? 'Saving…' : 'Mark as resolved' }}
            </button>
            <button type="button" class="btn" (click)="copySummary(ev)">Copy event summary</button>
          </div>
        </section>
        <section class="resolved-box" *ngIf="ev.resolved">
          <p><strong>Resolved by:</strong> {{ ev.resolvedBy || '—' }}</p>
          <p><strong>Note:</strong> {{ ev.resolutionNote || '—' }}</p>
        </section>
      </aside>
    </section>
  `,
  styles: [`
    .sec-page { padding: 1rem 1.25rem; display: grid; gap: 1rem; }
    .sec-head { display: grid; gap: .5rem; }
    .sec-head__nav { display: flex; }
    .back-btn { background: #fff; border: 1px solid #c9d9ea; color: #1f486c; padding: .35rem .8rem; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: .85rem; }
    .back-btn:hover { background: #f1f6fb; }
    .sec-head h2 { margin: 0; }
    .sec-head p { margin: .25rem 0; color: #44607a; }
    .sec-scope { font-size: .85rem; }
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px,1fr)); gap: .6rem; }
    .kpi { background: #fff; border: 1px solid #d8e2ec; border-radius: 10px; padding: .7rem .85rem; display: flex; flex-direction: column; gap: .25rem; }
    .kpi .lbl { font-size: .8rem; color: #5a7590; text-transform: uppercase; letter-spacing: .05em; }
    .kpi .val { font-size: 1.6rem; font-weight: 800; color: #102f4f; }
    .kpi.crit { background: linear-gradient(135deg,#fff5f5,#ffe8e8); border-color: #f5b3b3; }
    .kpi.crit .val { color: #a01313; }
    .kpi.high { background: #fff8ec; border-color: #f0d49c; }
    .kpi.high .val { color: #9a4d10; }
    .filters { display: flex; flex-wrap: wrap; gap: .6rem; align-items: end; }
    .filters label { display: flex; flex-direction: column; gap: .2rem; font-size: .8rem; color: #44607a; }
    .filters select, .filters input { padding: .35rem .5rem; border: 1px solid #c9d9ea; border-radius: 6px; min-width: 160px; }
    .table-wrap { overflow-x: auto; background: #fff; border: 1px solid #d8e2ec; border-radius: 10px; }
    table.alerts { width: 100%; border-collapse: collapse; font-size: .88rem; }
    .alerts th, .alerts td { padding: .55rem .7rem; text-align: left; border-bottom: 1px solid #eef2f7; vertical-align: top; }
    .alerts th { background: #f4f8fb; font-weight: 700; color: #355175; }
    .alerts tr.empty td { text-align: center; color: #6a7d92; padding: 1.5rem; }
    .alerts tr.row:hover { background: #fafcfe; }
    .alerts tr.row.critical { background: #fff5f5; }
    .alerts tr.row.high { background: #fffaf0; }
    .alerts .route { max-width: 280px; word-break: break-all; color: #475a73; }
    .sev { display: inline-block; padding: .1rem .45rem; border-radius: 999px; font-size: .72rem; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; }
    .sev-critical { background: #b21010; color: #fff; }
    .sev-high { background: #c9690b; color: #fff; }
    .sev-medium { background: #d9b34a; color: #2b1f00; }
    .sev-low { background: #cfd8e3; color: #1d2e44; }
    .status.ok { color: #2c7a3c; font-weight: 600; }
    .status.open { color: #b21010; font-weight: 700; }
    .btn-link { background: none; border: none; color: #1f486c; cursor: pointer; text-decoration: underline; padding: 0; font: inherit; }
    .drawer { position: fixed; top: 0; right: 0; width: min(440px, 92vw); height: 100vh; background: #fff; border-left: 1px solid #c9d9ea; box-shadow: -8px 0 18px rgba(20,40,60,.08); padding: 1rem 1.1rem; overflow-y: auto; z-index: 1000; }
    .drawer header { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
    .drawer h3 { margin: 0; font-size: 1.05rem; display: flex; align-items: center; gap: .5rem; }
    .drawer h4 { margin: 1rem 0 .35rem; font-size: .92rem; color: #355175; }
    .meta { display: grid; grid-template-columns: 130px 1fr; gap: .25rem .6rem; margin: .8rem 0; font-size: .85rem; }
    .meta dt { color: #5a7590; font-weight: 600; }
    .meta dd { margin: 0; word-break: break-all; }
    .meta dd.ua { font-family: ui-monospace, monospace; font-size: .78rem; color: #44607a; }
    .meta-json { background: #f6f9fc; border: 1px solid #e3ebf3; border-radius: 8px; padding: .55rem .7rem; font-size: .78rem; max-height: 200px; overflow: auto; }
    .resolve textarea { width: 100%; padding: .5rem; border: 1px solid #c9d9ea; border-radius: 6px; font: inherit; }
    .actions { display: flex; gap: .5rem; margin-top: .5rem; }
    .btn { padding: .45rem .8rem; border: 1px solid #c9d9ea; background: #fff; border-radius: 6px; cursor: pointer; font-weight: 600; }
    .btn.primary { background: #1f486c; color: #fff; border-color: #1f486c; }
    .btn:disabled { opacity: .6; cursor: not-allowed; }
    .resolved-box { background: #f1faf2; border: 1px solid #cdebd2; border-radius: 8px; padding: .55rem .7rem; }
  `],
})
export class AdminSecurityDashboardPage {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(Auth);
  private readonly ctx = inject(OrgContextService);
  private readonly location = inject(Location);

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
    } else {
      window.location.assign('/');
    }
  }

  readonly allTypes: SecurityEventType[] = [
    'LOGIN_FAILED', 'LOGIN_SUCCESS_NEW_DEVICE', 'ADMIN_ACCESS_DENIED',
    'CROSS_TENANT_ACCESS_DENIED', 'ROLE_CHANGE_ATTEMPT', 'ROLE_CHANGED',
    'MEMBERSHIP_CHANGED', 'MASS_EXPORT_ATTEMPT', 'MASS_DOWNLOAD_ATTEMPT',
    'STRIPE_WEBHOOK_INVALID', 'SUSPICIOUS_UPLOAD', 'API_RATE_LIMIT_TRIGGERED',
    'PASSWORD_RESET_REQUESTED', 'USER_SUSPENDED', 'SECURITY_ALERT_RESOLVED',
  ];

  readonly filterApp = signal('');
  readonly filterSeverity = signal('');
  readonly filterType = signal('');
  readonly filterResolved = signal('');
  readonly filterText = signal('');

  readonly selected = signal<RowVm | null>(null);
  readonly resolutionNote = signal('');
  readonly resolving = signal(false);

  // Firestore rules restrict reads to super_admin (all) or matching
  // org_admin (only events whose orgId/attemptedOrgId match an active
  // membership). A listen rejects the WHOLE query if any returned doc
  // would fail rules — so for non-super_admin we MUST filter by orgId.
  // We branch the query on the context, and for org_admins we run two
  // parallel queries (orgId + attemptedOrgId) and merge them client-side.
  private readonly events$: Observable<RowVm[]> = this.ctx.context$.pipe(
    switchMap((c) => {
      const mapDocs = (rows: any[]): RowVm[] =>
        rows.map((r) => {
          const ts = r?.timestamp;
          const date = ts?.toDate ? ts.toDate() : (ts instanceof Date ? ts : null);
          return { ...r, ts: date } as RowVm;
        });

      // super_admin → unrestricted listen
      if (c?.isSuperAdmin) {
        return collectionData(
          query(collection(this.firestore, 'securityEvents'), orderBy('timestamp', 'desc'), limit(200)),
          { idField: 'id' },
        ).pipe(map(mapDocs));
      }

      // org_admin / program_admin → only events scoped to the orgs they admin.
      const adminOrgIds = (c?.memberships || [])
        .filter((m) => m.status === 'active' && (m.role === 'org_admin' || m.role === 'program_admin'))
        .map((m) => m.orgId)
        .filter((v, i, a) => !!v && a.indexOf(v) === i)
        .slice(0, 10); // Firestore `in` accepts max 10 values

      if (adminOrgIds.length === 0) {
        this.errored.set(false);
        return of([] as RowVm[]);
      }

      const byOrg$ = collectionData(
        query(
          collection(this.firestore, 'securityEvents'),
          where('orgId', 'in', adminOrgIds),
          orderBy('timestamp', 'desc'),
          limit(200),
        ),
        { idField: 'id' },
      ).pipe(catchError((err) => { console.warn('[AdminSecurity] orgId query failed', err); return of([]); }));

      const byAttempted$ = collectionData(
        query(
          collection(this.firestore, 'securityEvents'),
          where('attemptedOrgId', 'in', adminOrgIds),
          orderBy('timestamp', 'desc'),
          limit(200),
        ),
        { idField: 'id' },
      ).pipe(catchError((err) => { console.warn('[AdminSecurity] attemptedOrgId query failed', err); return of([]); }));

      return combineLatest([byOrg$, byAttempted$]).pipe(
        map(([a, b]) => {
          const merged = new Map<string, any>();
          for (const r of [...a, ...b]) merged.set((r as any).id, r);
          return mapDocs(Array.from(merged.values())).sort(
            (x, y) => (y.ts?.getTime() || 0) - (x.ts?.getTime() || 0),
          );
        }),
      );
    }),
    catchError((err) => {
      console.warn('[AdminSecurity] read failed', err);
      this.errored.set(true);
      return of([] as RowVm[]);
    }),
  );

  readonly events = toSignal(this.events$, { initialValue: [] as RowVm[] });
  readonly loading = computed(() => this.events().length === 0 && !this.errored());
  readonly errored = signal(false);

  readonly scopeLabel = computed(() => {
    const ctx = this.ctxSnapshot();
    if (ctx?.isSuperAdmin) return 'Platform-wide (super_admin)';
    return ctx?.activeOrgId ? `Organization ${ctx.activeOrgId}` : null;
  });
  private ctxSnapshot(): { isSuperAdmin?: boolean; activeOrgId?: string | null } | null {
    let snap: any = null;
    this.ctx.context$.subscribe((c) => (snap = c)).unsubscribe();
    return snap;
  }

  readonly filtered = computed(() => {
    const text = this.filterText().trim().toLowerCase();
    return this.events().filter((r) => {
      if (this.filterApp() && r.app !== this.filterApp()) return false;
      if (this.filterSeverity() && r.severity !== this.filterSeverity()) return false;
      if (this.filterType() && r.eventType !== this.filterType()) return false;
      if (this.filterResolved() === 'open' && r.resolved) return false;
      if (this.filterResolved() === 'resolved' && !r.resolved) return false;
      if (text) {
        const blob = [r.userEmail, r.userId, r.orgId, r.attemptedOrgId, r.route, r.resourceId, r.action]
          .filter(Boolean).join(' ').toLowerCase();
        if (!blob.includes(text)) return false;
      }
      return true;
    });
  });

  readonly kpis = computed(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const list = this.events();
    return {
      critical: list.filter((r) => r.severity === 'critical' && !r.resolved).length,
      high: list.filter((r) => r.severity === 'high' && !r.resolved).length,
      today: list.filter((r) => r.ts && r.ts.getTime() >= today.getTime()).length,
      crossTenant: list.filter((r) => r.eventType === 'CROSS_TENANT_ACCESS_DENIED').length,
      adminDenied: list.filter((r) => r.eventType === 'ADMIN_ACCESS_DENIED').length,
      uploads: list.filter((r) => r.eventType === 'SUSPICIOUS_UPLOAD').length,
    };
  });

  asEvtTarget(ev: Event): HTMLInputElement {
    return ev.target as HTMLInputElement;
  }

  open(row: RowVm): void {
    this.selected.set(row);
    this.resolutionNote.set('');
  }

  async resolve(row: RowVm): Promise<void> {
    if (!row?.id) return;
    this.resolving.set(true);
    try {
      const ref = doc(this.firestore, `securityEvents/${row.id}`);
      const note = this.resolutionNote().trim().slice(0, 1000);
      await updateDoc(ref, {
        resolved: true,
        resolvedBy: this.auth.currentUser?.uid || null,
        resolvedAt: serverTimestamp(),
        resolutionNote: note || null,
      } as any);
      this.selected.set(null);
    } catch (err) {
      console.error('[AdminSecurity] resolve failed', err);
    } finally {
      this.resolving.set(false);
    }
  }

  async copySummary(row: RowVm): Promise<void> {
    const summary = [
      `[${row.severity?.toUpperCase()}] ${row.eventType}`,
      `time: ${row.ts?.toISOString() || ''}`,
      `app: ${row.app}`,
      `user: ${row.userEmail || row.userId || ''}`,
      `org: ${row.orgId || ''} attempted: ${row.attemptedOrgId || ''}`,
      `route: ${row.route || ''}`,
      `resource: ${row.resourceType || ''}/${row.resourceId || ''}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(summary);
    } catch { /* ignore */ }
  }
}
