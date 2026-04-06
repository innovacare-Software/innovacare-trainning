import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/auth';
import { OrganizationAssignmentsService } from '../../../core/organization/services/organization-assignments.service';
import { OrganizationProgressService } from '../../../core/organization/services/organization-progress.service';
import { OrganizationUsersService } from '../../../core/organization/services/organization-users.service';
import { OrganizationCoursesService } from '../../../core/organization/services/organization-courses.service';

import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map, of, switchMap } from 'rxjs';

/* ----------------- Types ----------------- */
type KPI = { completion30: string; overdue: number; avgScore: string; totalLearners: number };

type AssignmentRow = {
  id: string; // courseId
  course: string;
  audience: string;
  due: string;
  status: 'Active' | 'Closed';
  dueTs?: number; // for sorting
};

type ResultRow = {
  uid: string;
  userName: string;
  userEmail: string;
  courseId: string;
  course: string;
  score: number;
  completedTs: number;
  date: string;
};

type EnrollmentStatus = 'assigned' | 'started' | 'completed';

interface EnrollmentDoc {
  id?: string;
  orgId: string;
  userId: string;
  courseId: string;
  status: EnrollmentStatus;
  assignedBy?: string;
  assignedAt?: any;
  startedAt?: any;
  completedAt?: any;
  dueDate?: any;
}

interface CourseDoc {
  courseId: string;
  title?: string;
  active?: boolean;
}

interface UserDoc {
  uid: string;
  displayName?: string;
  email?: string;
  role?: string;
  active?: boolean;
}

interface ProgressDoc {
  id?: string;
  orgId: string;
  userId: string;
  courseId: string;
  progressPct: number;
  status: 'not_started' | 'in_progress' | 'completed';
  score?: number;
  updatedAt?: any;
}

/* ----------------- Helpers ----------------- */
const DAY = 24 * 60 * 60 * 1000;
const DEFAULT_DUE_DAYS = 30;
const nowMs = () => Date.now();

function epochMs(x: any): number | undefined {
  if (!x) return undefined;
  if (typeof x === 'number') return x;
  if (typeof x === 'string') {
    const t = Date.parse(x);
    return isNaN(t) ? undefined : t;
  }
  if (typeof x?.toMillis === 'function') return x.toMillis();
  if (typeof x?.seconds === 'number') return x.seconds * 1000; // some Timestamp shapes
  return undefined;
}

function firstDefined<T>(...vals: (T | undefined | null)[]): T | undefined {
  for (const v of vals) if (v !== undefined && v !== null) return v as T;
  return undefined;
}

function fmtDateShort(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
}

function safeStr(x: any) {
  return (x ?? '').toString();
}

@Component({
  standalone: true,
  selector: 'app-manager-dashboard',
  imports: [CommonModule, RouterLink],
  templateUrl: './manager-dashboard.html',
  styleUrls: ['./manager-dashboard.css'],
})
export class ManagerDashboardComponent {
  private auth = inject(AuthService);
  private assignmentsSvc = inject(OrganizationAssignmentsService);
  private progressSvc = inject(OrganizationProgressService);
  private usersSvc = inject(OrganizationUsersService);
  private coursesSvc = inject(OrganizationCoursesService);
  private router = inject(Router);

  /* ----------- Feature flags for missing pages ----------- */
  // Set to true when you create those components/routes.
  hasReportsPage = true;
  hasResultDetailsPage = false;
  hasAssignmentDetailsPage = false;

  notice = '';

  /* ----------- Manager name ----------- */
  private readonly profile$ = this.auth.profile$;

  private managerName$ = this.profile$.pipe(
    map((profile) => {
      const fromProfile = safeStr(profile?.displayName).trim();
      return fromProfile || 'Manager';
    })
  );
  managerName = toSignal(this.managerName$, { initialValue: 'Manager' });

  private readonly orgId$ = this.profile$.pipe(
    map((profile) => {
      const orgId = safeStr(profile?.orgId).trim();
      return orgId || null;
    })
  );

  private assignments$ = this.orgId$.pipe(
    switchMap((orgId) => {
      if (!orgId) return of([] as EnrollmentDoc[]);
      return this.assignmentsSvc.list(orgId).pipe(map((rows) => (rows || []) as EnrollmentDoc[]));
    })
  );

  private courses$ = this.orgId$.pipe(
    switchMap((orgId) => {
      if (!orgId) return of([] as CourseDoc[]);
      return this.coursesSvc.listAssigned(orgId).pipe(map((rows) => (rows || []) as CourseDoc[]));
    })
  );

  private users$ = this.orgId$.pipe(
    switchMap((orgId) => {
      if (!orgId) return of(new Map<string, UserDoc>());
      return this.usersSvc.list(orgId).pipe(
        map((list) => {
          const mapByUid = new Map<string, UserDoc>();
          (list || []).forEach((u: any) => mapByUid.set(u.uid, u as UserDoc));
          return mapByUid;
        })
      );
    })
  );

  private progress$ = this.orgId$.pipe(
    switchMap((orgId) => {
      if (!orgId) return of([] as ProgressDoc[]);
      return this.progressSvc.list(orgId).pipe(map((rows) => (rows || []) as ProgressDoc[]));
    })
  );

  /* ----------- KPI (survey-ready definitions) ----------- */
  private kpi$ = combineLatest([this.assignments$, this.progress$, this.users$]).pipe(
    map(([assignments, progressRows, users]: [EnrollmentDoc[], ProgressDoc[], Map<string, UserDoc>]) => {
      const now = nowMs();
      const from30 = now - 30 * DAY;

      const learners = Array.from(users.values()).filter((u) => (u.role || '').includes('learner')).length;

      let overdue = 0;
      for (const a of assignments) {
        const dueTs = epochMs((a as any).dueDate);
        if (a.status !== 'completed' && dueTs && dueTs < now) overdue++;
      }

      const completedLast30 = progressRows.filter((p) => p.status === 'completed' && (epochMs(p.updatedAt) || 0) >= from30).length;
      const touchedLast30 = progressRows.filter((p) => (epochMs(p.updatedAt) || 0) >= from30).length;
      const completionPct = touchedLast30 > 0 ? Math.round((completedLast30 / touchedLast30) * 100) : 0;

      const scored = progressRows.filter((p) => typeof p.score === 'number');
      const avgScorePct = scored.length
        ? Math.round(scored.reduce((sum, p) => sum + Number(p.score || 0), 0) / scored.length)
        : 0;

      return {
        completion30: `${completionPct}%`,
        overdue,
        avgScore: String(avgScorePct),
        totalLearners: learners,
      };
    })
  );

  kpi = toSignal(this.kpi$, {
    initialValue: { completion30: '0%', overdue: 0, avgScore: '0', totalLearners: 0 },
  });

  /* ----------- Open Assignments (group by course) ----------- */
  private openAssignments$ = combineLatest([this.assignments$, this.courses$]).pipe(
    map(([assignments, courses]: [EnrollmentDoc[], CourseDoc[]]) => {
      const titleByCourse = new Map<string, string>();
      courses.forEach((c) => titleByCourse.set(c.courseId, c.title || c.courseId));

      const grouped = new Map<string, EnrollmentDoc[]>();
      assignments.filter((a) => a.status !== 'completed').forEach((a) => {
        const arr = grouped.get(a.courseId) || [];
        arr.push(a);
        grouped.set(a.courseId, arr);
      });

      const rows: AssignmentRow[] = [];
      grouped.forEach((arr, courseId) => {
        const dueList = arr
          .map((x) => epochMs((x as any).dueDate))
          .filter((x): x is number => typeof x === 'number')
          .sort((a, b) => a - b);

        const dueTs = dueList[0];
        rows.push({
          id: courseId,
          course: titleByCourse.get(courseId) || courseId,
          audience: `${arr.length} learner${arr.length > 1 ? 's' : ''}`,
          due: dueTs ? fmtDateShort(dueTs) : '—',
          status: 'Active',
          dueTs: dueTs || Number.MAX_SAFE_INTEGER,
        });
      });

      return rows.sort((a, b) => (a.dueTs || 0) - (b.dueTs || 0)).slice(0, 10);
    })
  );

  openAssignments = toSignal(this.openAssignments$, {
    initialValue: [] as AssignmentRow[],
  });

  /* ----------- Recent Results (top 10) ----------- */
  private recentResults$ = combineLatest([this.progress$, this.users$, this.courses$]).pipe(
    map(([rows, users, courses]: [ProgressDoc[], Map<string, UserDoc>, CourseDoc[]]) => {
      const titleByCourse = new Map<string, string>();
      courses.forEach((c) => titleByCourse.set(c.courseId, c.title || c.courseId));
      const items: ResultRow[] = [];

      for (const enr of rows) {
        if (enr.status !== 'completed') continue;

        const completedTs = epochMs(enr.updatedAt);
        if (!completedTs) continue;

        const uid = safeStr(enr.userId);

        const userDoc = uid ? users.get(uid) : undefined;
        const userName = safeStr(userDoc?.displayName) || (uid ? uid : '(unknown)');
        const userEmail = safeStr(userDoc?.email);

        items.push({
          uid: uid || '(unknown)',
          userName,
          userEmail,
          courseId: enr.courseId,
          course: titleByCourse.get(enr.courseId) || enr.courseId,
          score: typeof enr.score === 'number' ? enr.score : 0,
          completedTs,
          date: fmtDateShort(completedTs),
        });
      }

      return items
        .sort((a, b) => b.completedTs - a.completedTs)
        .slice(0, 10);
    })
  );

  recentResults = toSignal(this.recentResults$, {
    initialValue: [] as ResultRow[],
  });

  /* ----------- Overdue notifications panel (UI only) ----------- */
  private overdueAlerts$ = combineLatest([this.assignments$, this.users$, this.courses$]).pipe(
    map(([rows, users, courses]: [EnrollmentDoc[], Map<string, UserDoc>, CourseDoc[]]) => {
      const titleByCourse = new Map<string, string>();
      courses.forEach((c) => titleByCourse.set(c.courseId, c.title || c.courseId));
      const now = nowMs();
      const alerts: Array<{ uid: string; user: string; email: string; course: string; due: string; dueTs: number; overdueDays: number }> = [];

      for (const enr of rows) {
        if (enr.status === 'completed') continue;

        const dueTs = epochMs(enr.dueDate);

        if (!dueTs || dueTs >= now) continue;

        const uid = safeStr(enr.userId);
        const u = uid ? users.get(uid) : undefined;
        const overdueDays = Math.floor((now - dueTs) / DAY);

        alerts.push({
          uid: uid || '(unknown)',
          user: safeStr(u?.displayName) || (uid || '(unknown)'),
          email: safeStr(u?.email),
          course: titleByCourse.get(enr.courseId) || enr.courseId,
          due: fmtDateShort(dueTs),
          dueTs,
          overdueDays,
        });
      }

      return alerts.sort((a, b) => a.dueTs - b.dueTs).slice(0, 8);
    })
  );

  overdueAlerts = toSignal(this.overdueAlerts$, { initialValue: [] as any[] });

  /* ----------- Buttons / Navigation ----------- */
  onAssignTraining() { this.router.navigate(['/manager/assign']); }
  onExportCSV() { this.notice = 'Export CSV not implemented yet.'; }

  onCreateAssign() { this.router.navigate(['/manager/assign']); }

  onCreateReport() {
    if (!this.hasReportsPage) {
      this.notice = 'Reports page is not implemented yet.';
      return;
    }
    this.router.navigate(['/manager/reports']);
  }

  onPolicyReport() { this.router.navigate(['/manager/policy-report']); }

  openAssignment(courseId: string) {
    if (!this.hasAssignmentDetailsPage) {
      this.notice = 'Assignment details page is not implemented yet.';
      return;
    }
    this.router.navigate(['/manager/assign', courseId]);
  }

  openResultDetails(uid: string) {
    if (!this.hasResultDetailsPage) {
      this.notice = 'Result details page is not implemented yet.';
      return;
    }
    this.router.navigate(['/manager/results', uid]);
  }

  clearNotice() { this.notice = ''; }
}
