import { Component, inject } from '@angular/core'; // TEST
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { Auth, authState } from '@angular/fire/auth';
import { Firestore, collection, collectionData, doc, docData, limit, query, where } from '@angular/fire/firestore';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map, of, switchMap } from 'rxjs';

type DueStats = { overdue: number; in7: number; in30: number; in90: number };
type EnrollmentStatus = 'assigned' | 'started' | 'completed';

interface EnrollmentDoc {
  courseId: string;
  status: EnrollmentStatus;
  // optional timestamps (Firestore Timestamp | number ms)
  assignedAt?: any;
  startedAt?: any;
  completedAt?: any;
  // optional per-learner deadline (ISO string)
  dueDate?: string;
}

interface CourseDoc {
  id?: string;
  title?: string;
  kind?: 'Course' | 'Text' | 'Module';
  durationMin?: number;
  url?: string;
  // optional global deadline (ISO string)
  dueDate?: string;
}

interface RecentItem {
  title: string;
  type: string;
  duration: string;
  date: string;
  link: string;
  ts: number;
}

interface AgenticRecommendation {
  title: string;
  body: string;
  cta: string;
  link: string;
  queryParams: Record<string, string>;
  tone: 'urgent' | 'focus' | 'growth';
  source: 'persisted' | 'derived';
}

interface PersistedRecommendationDoc {
  id: string;
  agentId?: string;
  title?: string;
  summary?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  createdAt?: any;
}

// ---- Helpers ----
const DAY = 24 * 60 * 60 * 1000;
const DEFAULT_DUE_DAYS = 30;

function epochMs(x: any): number | undefined {
  if (!x) return undefined;
  if (typeof x === 'number') return x;
  if (typeof x === 'string') { const t = Date.parse(x); return isNaN(t) ? undefined : t; }
  if (typeof x?.toMillis === 'function') return x.toMillis();
  return undefined;
}
function firstDefined<T>(...vals: (T | undefined | null)[]): T | undefined {
  for (const v of vals) if (v !== undefined && v !== null) return v as T;
  return undefined;
}

@Component({
  standalone: true,
  selector: 'app-learner-dashboard',
  imports: [CommonModule, RouterLink],
  templateUrl: './learner-dashboard.html',
  styleUrls: ['./learner-dashboard.css'],
})
export class LearnerDashboardComponent {
  private auth = inject(Auth);
  private afs = inject(Firestore);

  // ---------------- Display name ----------------
  private auth$ = authState(this.auth);
  private displayName$ = this.auth$.pipe(
    switchMap(user => {
      if (!user) return of('Learner');
      const fromAuth = user.displayName?.trim();
      if (fromAuth) return of(fromAuth);
      const uref = doc(this.afs, `users/${user.uid}`);
      return docData(uref).pipe(map((u: any) => u?.displayName || 'Learner'));
    })
  );
  private role$ = this.auth$.pipe(
    map(user => (user ? 'Learner' : 'Guest'))
  );
  displayName = toSignal(this.displayName$, { initialValue: 'Learner' });
  role = toSignal(this.role$, { initialValue: 'Learner' });

  // ------------- Enrollments joined with Courses -------------
  private rows$ = this.auth$.pipe(
    switchMap(user => {
      if (!user) return of([] as Array<{ enr: EnrollmentDoc; course: CourseDoc }>);
      const enrCol = collection(this.afs, `users/${user.uid}/enrollments`);
      return collectionData(enrCol, { idField: 'id' }).pipe(
        switchMap((enrs) => {
          const list = (enrs as EnrollmentDoc[]);
          if (!list.length) return of([] as Array<{ enr: EnrollmentDoc; course: CourseDoc }>);
          const perCourse$ = list.map(enr => {
            const cref = doc(this.afs, `courses/${enr.courseId}`);
            return docData(cref, { idField: 'id' }).pipe(
              map(c => ({ enr, course: (c || {}) as CourseDoc }))
            );
          });
          return combineLatest(perCourse$);
        })
      );
    })
  );

  // ---------------- KPIs (Overdue / 7 / 30 / 90) ----------------
  private dueStats$ = this.rows$.pipe(
    map(rows => {
      const now = Date.now();
      let overdue = 0, in7 = 0, in30 = 0, in90 = 0;

      for (const { enr, course } of rows) {
        if (enr.status === 'completed') continue;

        // Priority: enrollment.dueDate -> course.dueDate -> assignedAt + 30d
        const enrDue = epochMs(enr.dueDate);
        const courseDue = epochMs(course?.dueDate);
        const assignedTs = epochMs(enr.assignedAt) ?? now;
        const inferredDue = assignedTs + DEFAULT_DUE_DAYS * DAY;

        const dueTs = firstDefined(enrDue, courseDue, inferredDue);
        if (!dueTs) continue;

        if (dueTs < now) { overdue++; continue; }
        const delta = dueTs - now;
        if (delta <= 7 * DAY) in7++;
        else if (delta <= 30 * DAY) in30++;
        else if (delta <= 90 * DAY) in90++;
      }

      return { overdue, in7, in30, in90 } as DueStats;
    })
  );
  due = toSignal(this.dueStats$, { initialValue: { overdue: 0, in7: 0, in30: 0, in90: 0 } });

  // ---------------- Recent activity (top 5) ----------------
  private recent$ = this.rows$.pipe(
    map(rows => {
      const items: RecentItem[] = [];

      for (const { enr, course } of rows) {
        const ts =
          epochMs(enr.completedAt) ??
          epochMs(enr.startedAt) ??
          epochMs(enr.assignedAt) ??
          Date.now();

        const durationMin = course.durationMin ?? 0;
        const hrs = Math.floor(durationMin / 60);
        const mins = durationMin % 60;
        const duration = hrs > 0 ? `${hrs}h ${mins}min` : `${mins}min`;

        items.push({
          title: course.title ?? '(Untitled course)',
          type: course.kind ?? 'Course',
          duration,
          date: new Date(ts).toLocaleDateString(),
          link: `/learner/courses/${course.id ?? ''}`,
          ts
        });
      }

      return items.sort((a, b) => b.ts - a.ts).slice(0, 5);
    })
  );
  recent = toSignal(this.recent$, { initialValue: [] as RecentItem[] });

  private persistedRecommendations$ = this.auth$.pipe(
    switchMap((user) => {
      if (!user) return of([] as PersistedRecommendationDoc[]);
      const recommendationsRef = collection(this.afs, 'aiRecommendations');
      const recommendationsQuery = query(
        recommendationsRef,
        where('learnerUid', '==', user.uid),
        where('status', '==', 'open'),
        limit(6)
      );
      return collectionData(recommendationsQuery, { idField: 'id' }).pipe(
        map((docs) => (docs as PersistedRecommendationDoc[]).sort((a, b) => {
          return (epochMs(b.createdAt) ?? 0) - (epochMs(a.createdAt) ?? 0);
        }))
      );
    })
  );

  private derivedRecommendations$ = this.rows$.pipe(
    map((rows): AgenticRecommendation[] => {
      const recommendations: AgenticRecommendation[] = [];
      const now = Date.now();
      const activeRows = rows.filter(({ enr }) => enr.status !== 'completed');

      const enriched = activeRows.map((row) => {
        const enrDue = epochMs(row.enr.dueDate);
        const courseDue = epochMs(row.course?.dueDate);
        const assignedTs = epochMs(row.enr.assignedAt) ?? now;
        const dueTs = firstDefined(enrDue, courseDue, assignedTs + DEFAULT_DUE_DAYS * DAY) ?? now;
        return { ...row, dueTs };
      });

      const overdue = enriched
        .filter((row) => row.dueTs < now)
        .sort((a, b) => a.dueTs - b.dueTs)[0];

      if (overdue) {
        recommendations.push({
          title: 'AI rescue plan',
          body: `You have an overdue assignment in ${overdue.course.title || 'your course'}. Ask the assistant for a catch-up plan.`,
          cta: 'Open rescue coach',
          link: '/learner/assistant',
          queryParams: {
            domain: 'general',
            courseId: overdue.course.id || overdue.enr.courseId,
            courseTitle: overdue.course.title || 'Overdue course',
            prompt: `Build me a catch-up plan for my overdue course ${overdue.course.title || overdue.enr.courseId}. Prioritize the first 3 actions for today.`,
          },
          tone: 'urgent',
          source: 'derived',
        });
      }

      const dueSoon = enriched
        .filter((row) => row.dueTs >= now && row.dueTs - now <= 7 * DAY)
        .sort((a, b) => a.dueTs - b.dueTs)[0];

      if (dueSoon) {
        recommendations.push({
          title: 'This week focus',
          body: `${dueSoon.course.title || 'One assignment'} is due soon. Let AI break it into a realistic 7-day plan.`,
          cta: 'Plan my week',
          link: '/learner/assistant',
          queryParams: {
            domain: 'general',
            courseId: dueSoon.course.id || dueSoon.enr.courseId,
            courseTitle: dueSoon.course.title || 'Upcoming assignment',
            prompt: `Create a 7-day study plan so I finish ${dueSoon.course.title || dueSoon.enr.courseId} before its deadline.`,
          },
          tone: 'focus',
          source: 'derived',
        });
      }

      const started = activeRows.find(({ enr }) => enr.status === 'started');
      if (started) {
        recommendations.push({
          title: 'Next best step',
          body: `You already started ${started.course.title || 'a course'}. Ask the coach what to do next instead of guessing.`,
          cta: 'Resume with AI',
          link: '/learner/assistant',
          queryParams: {
            domain: 'general',
            courseId: started.course.id || started.enr.courseId,
            courseTitle: started.course.title || 'Current course',
            prompt: `I already started ${started.course.title || started.enr.courseId}. What is the smartest next step to finish efficiently?`,
          },
          tone: 'growth',
          source: 'derived',
        });
      }

      if (!recommendations.length) {
        recommendations.push({
          title: 'Personal learning copilot',
          body: 'Use the assistant to build your study plan, revise faster, or prepare your next certification target.',
          cta: 'Open AI assistant',
          link: '/learner/assistant',
          queryParams: {
            domain: 'general',
            prompt: 'Review my current learner dashboard context and suggest the best next study action.',
          },
          tone: 'growth',
          source: 'derived',
        });
      }

      return recommendations.slice(0, 3);
    })
  );

  readonly aiRecommendations = toSignal(
    combineLatest([this.persistedRecommendations$, this.derivedRecommendations$]).pipe(
      map(([persisted, derived]): AgenticRecommendation[] => {
        if (persisted.length) {
          return persisted.slice(0, 3).map((item) => {
            const prompt = `Help me act on this AI recommendation: ${item.title || 'Recommendation'}. Summary: ${item.summary || 'No summary provided.'}. Give me the top 3 next actions.`;
            const tone: AgenticRecommendation['tone'] = item.priority === 'critical'
              ? 'urgent'
              : item.priority === 'high'
                ? 'focus'
                : 'growth';
            return {
              title: item.title || 'AI recommendation',
              body: item.summary || 'A platform agent generated a personalized next-best action for you.',
              cta: 'Open guided help',
              link: '/learner/assistant',
              queryParams: {
                domain: 'general',
                prompt,
              },
              tone,
              source: 'persisted',
            };
          });
        }
        return derived;
      })
    ),
    { initialValue: [] as AgenticRecommendation[] }
  );

  // ---------------- Static links/resources ----------------
  links = [
    { label: 'Home', path: '/learner', active: true },
    { label: 'Assignments', path: '/learner/assignments' },
    { label: 'Licenses & Certifications', path: '/learner/certifications' },
    { label: 'Course Library', path: '/learner/library' },
    { label: 'Transcript', path: '/learner/transcript' },
    { label: 'Rewards', path: '/learner/rewards' },
  ];

  resources = [
    { label: 'Policies & Procedures', path: '/resources/policies' },
  ];

  // learner-dashboard.ts (ajoute ces deux blocs à la fin de ta classe)
rows = toSignal(
  this.rows$, { initialValue: [] as Array<{ enr: EnrollmentDoc; course: CourseDoc }> }
);

// petit helper d’affichage
dueLabel(enr: EnrollmentDoc, course: CourseDoc): string {
  const now = Date.now();
  const enrDue = epochMs(enr.dueDate);
  const courseDue = epochMs(course?.dueDate);
  const assignedTs = epochMs(enr.assignedAt) ?? now;
  const dueTs = firstDefined(enrDue, courseDue, assignedTs + DEFAULT_DUE_DAYS * DAY);
  if (!dueTs) return 'No due date';
  const d = Math.ceil((dueTs - now) / DAY);
  if (d < 0) return 'Overdue';
  if (d === 0) return 'Due today';
  if (d === 1) return 'Due tomorrow';
  return `Due in ${d} days`;
}

}
