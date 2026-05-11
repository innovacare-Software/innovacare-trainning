import { EnvironmentInjector, Injectable, inject, runInInjectionContext } from '@angular/core';
import { Router } from '@angular/router';
import { Firestore, collection, collectionData, doc, docData, limit, query, where } from '@angular/fire/firestore';
import { BehaviorSubject, catchError, combineLatest, distinctUntilChanged, filter, map, of, shareReplay, switchMap } from 'rxjs';
import { AuthService, AppProfile, AppRole } from '../../core/auth';
import { ProfileService } from '../../core/profile.service';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  route: string;
  actionLabel: string;
  matchers: string[];
}

export interface OnboardingStepView extends OnboardingStep {
  completed: boolean;
}

export interface OnboardingViewModel {
  title: string;
  subtitle: string;
  roleLabel: string;
  isHidden: boolean;
  isMinimized: boolean;
  isCompleted: boolean;
  completionPct: number;
  completedCount: number;
  totalCount: number;
  nextStep: OnboardingStepView | null;
  steps: OnboardingStepView[];
  allCompleted: boolean;
}

interface OnboardingSignals {
  profileCompleted: boolean;
  hasOrders: boolean;
  hasBookings: boolean;
  hasEnrollments: boolean;
  hasRewards: boolean;
  hasOrganizations: boolean;
  hasGlobalUsers: boolean;
  hasBillingRecords: boolean;
  hasAdminLogs: boolean;
  hasPrograms: boolean;
  hasOrgUsers: boolean;
  hasOrgCourses: boolean;
  hasOrgProgress: boolean;
  hasOrgDocument: boolean;
}

const ROLE_LABELS: Record<AppRole, string> = {
  guest: 'Guest',
  learner: 'Learner',
  manager: 'Manager',
  admin: 'Admin',
  super_admin: 'Super Admin',
  instructor: 'Instructor',
  programAdmin: 'Program Admin',
  programStaff: 'Program Staff',
  programLearner: 'Program Learner',
};

const ONBOARDING_VERSION = 'v1';

const STEP_LIBRARY: Record<AppRole, OnboardingStep[]> = {
  guest: [
    {
      id: 'guest-dashboard',
      title: 'Open your guest dashboard',
      description: 'Start from your personal hub to see courses, programs, and live sessions.',
      route: '/guest/dashboard',
      actionLabel: 'Open dashboard',
      matchers: ['/guest/dashboard'],
    },
    {
      id: 'guest-profile',
      title: 'Complete your profile',
      description: 'Add core identity details so your enrollment and checkout flow stays clean.',
      route: '/guest/profile',
      actionLabel: 'Edit profile',
      matchers: ['/guest/profile'],
    },
    {
      id: 'guest-courses',
      title: 'Browse your courses',
      description: 'Review the current learning catalog available from your guest workspace.',
      route: '/guest/courses',
      actionLabel: 'Browse courses',
      matchers: ['/guest/courses', '/guest/session/courses'],
    },
    {
      id: 'guest-programs',
      title: 'Check available programs',
      description: 'Explore multi-course pathways and premium bundles before purchase.',
      route: '/guest/programs',
      actionLabel: 'View programs',
      matchers: ['/guest/programs'],
    },
  ],
  learner: [
    {
      id: 'learner-dashboard',
      title: 'Review your dashboard',
      description: 'Use the learner hub to track deadlines, recent activity, and course progress.',
      route: '/learner',
      actionLabel: 'Open dashboard',
      matchers: ['/learner'],
    },
    {
      id: 'learner-assignments',
      title: 'Open assignments',
      description: 'Verify what is due first so the first week starts with the right priorities.',
      route: '/learner/assignments',
      actionLabel: 'View assignments',
      matchers: ['/learner/assignments'],
    },
    {
      id: 'learner-profile',
      title: 'Update your learner profile',
      description: 'Keep your profile current for certification records and platform support.',
      route: '/learner/profile',
      actionLabel: 'Update profile',
      matchers: ['/learner/profile'],
    },
    {
      id: 'learner-rewards',
      title: 'Discover rewards and certificates',
      description: 'See how completions convert into certificates, points, and transcript value.',
      route: '/learner/rewards',
      actionLabel: 'View rewards',
      matchers: ['/learner/rewards', '/learner/certifications', '/learner/transcript'],
    },
  ],
  manager: [
    {
      id: 'manager-dashboard',
      title: 'Open the org dashboard',
      description: 'Start with the KPI view to spot risk, completion, and upcoming workload.',
      route: '/manager/dashboard',
      actionLabel: 'Open dashboard',
      matchers: ['/manager/dashboard', '/manager'],
    },
    {
      id: 'manager-learners',
      title: 'Review learner roster',
      description: 'Check who is active, overdue, or needs intervention in the organization.',
      route: '/manager/learners',
      actionLabel: 'View learners',
      matchers: ['/manager/learners'],
    },
    {
      id: 'manager-assign',
      title: 'Assign a training flow',
      description: 'Use the assignment area to push the right content to the right cohort.',
      route: '/manager/assign',
      actionLabel: 'Assign training',
      matchers: ['/manager/assign'],
    },
    {
      id: 'manager-reports',
      title: 'Open reporting',
      description: 'Validate that reporting is available before scaling usage to a full cohort.',
      route: '/manager/reports',
      actionLabel: 'See reports',
      matchers: ['/manager/reports', '/manager/policy-report'],
    },
  ],
  admin: [
    {
      id: 'manager-dashboard',
      title: 'Open the org dashboard',
      description: 'Start with the KPI view to spot risk, completion, and upcoming workload.',
      route: '/manager/dashboard',
      actionLabel: 'Open dashboard',
      matchers: ['/manager/dashboard', '/manager'],
    },
    {
      id: 'manager-learners',
      title: 'Review learner roster',
      description: 'Check who is active, overdue, or needs intervention in the organization.',
      route: '/manager/learners',
      actionLabel: 'View learners',
      matchers: ['/manager/learners'],
    },
    {
      id: 'manager-assign',
      title: 'Assign a training flow',
      description: 'Use the assignment area to push the right content to the right cohort.',
      route: '/manager/assign',
      actionLabel: 'Assign training',
      matchers: ['/manager/assign'],
    },
    {
      id: 'manager-reports',
      title: 'Open reporting',
      description: 'Validate that reporting is available before scaling usage to a full cohort.',
      route: '/manager/reports',
      actionLabel: 'See reports',
      matchers: ['/manager/reports', '/manager/policy-report'],
    },
  ],
  instructor: [
    {
      id: 'instructor-dashboard',
      title: 'Open your teaching dashboard',
      description: 'Start from the teaching workspace to review assigned cohorts and active sessions.',
      route: '/manager/dashboard',
      actionLabel: 'Open dashboard',
      matchers: ['/instructor/dashboard', '/manager/dashboard', '/manager'],
    },
    {
      id: 'instructor-learners',
      title: 'Review learner roster',
      description: 'Check who needs support before your next session or evaluation cycle.',
      route: '/manager/learners',
      actionLabel: 'View learners',
      matchers: ['/manager/learners'],
    },
    {
      id: 'instructor-reports',
      title: 'Open learner reporting',
      description: 'Use reporting to validate readiness, intervention needs, and completion trends.',
      route: '/manager/reports',
      actionLabel: 'Open reports',
      matchers: ['/manager/reports', '/manager/policy-report'],
    },
  ],
  programAdmin: [
    {
      id: 'program-admin-dashboard',
      title: 'Open program dashboard',
      description: 'Start with platform analytics, enrollments, and program health indicators.',
      route: '/program-admin/dashboard',
      actionLabel: 'Open dashboard',
      matchers: ['/program-admin/dashboard'],
    },
    {
      id: 'program-admin-programs',
      title: 'Review programs',
      description: 'Validate your active program catalogue and editorial structure.',
      route: '/program-admin/programs',
      actionLabel: 'View programs',
      matchers: ['/program-admin/programs'],
    },
    {
      id: 'program-admin-enrollments',
      title: 'Check enrollments',
      description: 'Review the learner flow tied to programs before scaling delivery.',
      route: '/program-admin/enrollments',
      actionLabel: 'View enrollments',
      matchers: ['/program-admin/enrollments'],
    },
    {
      id: 'program-admin-analytics',
      title: 'Open program analytics',
      description: 'Use analytics to validate content performance and adoption trends.',
      route: '/program-admin/analytics',
      actionLabel: 'Open analytics',
      matchers: ['/program-admin/analytics'],
    },
  ],
  programStaff: [
    {
      id: 'program-staff-dashboard',
      title: 'Open program workspace',
      description: 'Start from the program operations view and validate current content activity.',
      route: '/program-admin/dashboard',
      actionLabel: 'Open workspace',
      matchers: ['/program-staff/dashboard', '/program-admin/dashboard'],
    },
    {
      id: 'program-staff-programs',
      title: 'Review program catalogue',
      description: 'Check which programs need updates, publishing, or learner support.',
      route: '/program-admin/programs',
      actionLabel: 'View programs',
      matchers: ['/program-admin/programs'],
    },
    {
      id: 'program-staff-enrollments',
      title: 'Review enrollments',
      description: 'Monitor learner intake and operational readiness across programs.',
      route: '/program-admin/enrollments',
      actionLabel: 'View enrollments',
      matchers: ['/program-admin/enrollments'],
    },
  ],
  programLearner: [
    {
      id: 'program-learner-home',
      title: 'Open my programs',
      description: 'Start from your program home to see active pathways and current status.',
      route: '/my-programs',
      actionLabel: 'Open my programs',
      matchers: ['/my-programs'],
    },
    {
      id: 'program-learner-dashboard',
      title: 'Open learner space',
      description: 'Use the learner space to continue modules, assessments, and simulations.',
      route: '/my-programs',
      actionLabel: 'Open learner space',
      matchers: ['/my-programs/'],
    },
    {
      id: 'program-learner-study',
      title: 'Open study content',
      description: 'Review modules, documents, and live sessions tied to your program.',
      route: '/my-programs',
      actionLabel: 'View study content',
      matchers: ['/my-programs/'],
    },
  ],
  super_admin: [
    {
      id: 'super-dashboard',
      title: 'Open platform dashboard',
      description: 'Start with global platform health, tenant activity, and operational visibility.',
      route: '/super-admin/dashboard',
      actionLabel: 'Open dashboard',
      matchers: ['/super-admin/dashboard'],
    },
    {
      id: 'super-organizations',
      title: 'Review organizations',
      description: 'Check tenant inventory before provisioning or troubleshooting a specific org.',
      route: '/super-admin/organizations',
      actionLabel: 'View organizations',
      matchers: ['/super-admin/organizations'],
    },
    {
      id: 'super-users',
      title: 'Review platform users',
      description: 'Validate user governance and cross-tenant access from the global user view.',
      route: '/super-admin/users',
      actionLabel: 'View users',
      matchers: ['/super-admin/users'],
    },
    {
      id: 'super-billing',
      title: 'Open billing controls',
      description: 'Confirm the billing area is reachable before scaling platform operations.',
      route: '/super-admin/billing',
      actionLabel: 'Open billing',
      matchers: ['/super-admin/billing'],
    },
  ],
};

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private readonly auth = inject(AuthService);
  private readonly profiles = inject(ProfileService);
  private readonly router = inject(Router);
  private readonly firestore = inject(Firestore);
  private readonly injector = inject(EnvironmentInjector);
  private readonly route$ = new BehaviorSubject<string>(this.router.url);

  private profileSnapshot: AppProfile | null = null;
  private writeInFlight = false;
  // SECURITY/UX: dedupe Firestore-permission-denied logs so the console isn't
  // flooded when the signed-in user lacks read access to the optional signal
  // collections (expected for guests / cross-tenant accounts).
  private readonly loggedSignalErrors = new Set<string>();
  // Cache the signals$() observable so multiple vm$ subscribers share a
  // single Firestore listener tree instead of multiplying listeners per
  // component subscription.
  private readonly signalsStream$ = this.signals$().pipe(
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly vm$ = combineLatest([this.auth.profile$, this.route$, this.signalsStream$]).pipe(
    map(([profile, currentRoute, signals]) => {
      this.profileSnapshot = profile;

      const resolvedRole = this.resolveRole(profile);
      if (!profile?.uid || !resolvedRole) {
        return null;
      }

      const state = profile.onboarding;
      const steps = STEP_LIBRARY[resolvedRole] ?? STEP_LIBRARY.guest;
      const completedIds = new Set(state?.completedStepIds ?? []);
      const stepViews = steps.map((step) => ({
        ...step,
        completed:
          completedIds.has(step.id) ||
          this.routeMatches(currentRoute, step.matchers) ||
          this.stepCompletedBySignals(step.id, resolvedRole, signals),
      }));
      const completedCount = stepViews.filter((step) => step.completed).length;
      const totalCount = stepViews.length;
      const nextStep = stepViews.find((step) => !step.completed) ?? null;
      const completionPct = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;
      const allCompleted = completedCount === totalCount;
      const isCompleted = !!state?.completedAt || allCompleted;
      const isHidden = isCompleted && !!state?.dismissedAt;

      return {
        title: 'Quick start checklist',
        subtitle: this.subtitleForRole(resolvedRole),
        roleLabel: ROLE_LABELS[resolvedRole],
        isHidden,
        isMinimized: !!state?.minimized || (!!state?.dismissedAt && !allCompleted),
        isCompleted,
        completionPct,
        completedCount,
        totalCount,
        nextStep,
        steps: stepViews,
        allCompleted,
      } as OnboardingViewModel;
    }),
    distinctUntilChanged((previous, current) => JSON.stringify(previous) === JSON.stringify(current)),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  constructor() {
    this.auth.profile$
      .pipe(filter((profile): profile is AppProfile => !!profile?.uid))
      .subscribe((profile) => {
        if (this.profileSnapshot?.uid !== profile.uid) {
          // Different account signed in: reset the dedupe set so legitimate
          // permission errors for the new user are reported once.
          this.loggedSignalErrors.clear();
        }
        this.profileSnapshot = profile;
      });
  }

  trackRoute(url: string): void {
    this.route$.next(url);

    const profile = this.profileSnapshot;
    const role = this.resolveRole(profile);
    if (!profile?.uid || !role || this.writeInFlight) {
      return;
    }

    const steps = STEP_LIBRARY[role] ?? STEP_LIBRARY.guest;
    const completedIds = new Set(profile.onboarding?.completedStepIds ?? []);
    const newlyCompleted = steps
      .filter((step) => this.routeMatches(url, step.matchers) && !completedIds.has(step.id))
      .map((step) => step.id);

    if (!newlyCompleted.length) {
      return;
    }

    this.persistState({
      completedStepIds: [...completedIds, ...newlyCompleted],
    });
  }

  completeStep(stepId: string): void {
    const profile = this.profileSnapshot;
    if (!profile?.uid) {
      return;
    }

    const completedIds = new Set(profile.onboarding?.completedStepIds ?? []);
    if (completedIds.has(stepId)) {
      return;
    }

    completedIds.add(stepId);
    this.persistState({ completedStepIds: [...completedIds] });
  }

  dismiss(): void {
    this.persistState({ dismissedAt: new Date().toISOString(), minimized: true });
  }

  completeAll(): void {
    const profile = this.profileSnapshot;
    const role = this.resolveRole(profile);
    if (!profile?.uid || !role) {
      return;
    }

    const steps = STEP_LIBRARY[role] ?? STEP_LIBRARY.guest;
    this.persistState({
      completedStepIds: steps.map((step) => step.id),
      minimized: true,
      completedAt: new Date().toISOString(),
    });
  }

  reopen(): void {
    this.persistState({
      minimized: false,
      dismissedAt: null,
    });
  }

  minimize(): void {
    this.persistState({ minimized: true });
  }

  private subtitleForRole(role: AppRole): string {
    switch (role) {
      case 'guest':
        return 'Finish the core setup so discovery, profile data, and buying flow are ready.';
      case 'learner':
        return 'Hit the core learner checkpoints before you start chasing deeper completion goals.';
      case 'manager':
      case 'admin':
        return 'Validate the operational surfaces you need before managing a cohort at scale.';
      case 'super_admin':
        return 'Open the global control surfaces needed for tenant operations and platform oversight.';
      default:
        return 'Complete the setup checklist to get productive faster.';
    }
  }

  private routeMatches(url: string, matchers: string[]): boolean {
    return matchers.some((matcher) => url === matcher || url.startsWith(`${matcher}/`));
  }

  private signals$() {
    return this.auth.profile$.pipe(
      switchMap((profile) => {
        if (!profile?.uid) {
          return of<OnboardingSignals>({
            profileCompleted: false,
            hasOrders: false,
            hasBookings: false,
            hasEnrollments: false,
            hasRewards: false,
            hasOrganizations: false,
            hasGlobalUsers: false,
            hasBillingRecords: false,
            hasAdminLogs: false,
            hasPrograms: false,
            hasOrgUsers: false,
            hasOrgCourses: false,
            hasOrgProgress: false,
            hasOrgDocument: false,
          });
        }

        const uid = profile.uid;
        const role = this.resolveRole(profile);
        const orgId = profile.orgId ?? null;

        if (role === 'super_admin') {
          return combineLatest([
            of(this.isProfileComplete(profile)),
            this.existsInCollection('organizations'),
            this.existsInCollection('users'),
            this.existsInCollection('billingRecords'),
            this.existsInCollection('adminLogs'),
            orgId ? this.existsByField('programs', 'orgId', orgId) : of(false),
          ]).pipe(
            map(([profileCompleted, hasOrganizations, hasGlobalUsers, hasBillingRecords, hasAdminLogs, hasPrograms]) => ({
              profileCompleted,
              hasOrders: false,
              hasBookings: false,
              hasEnrollments: false,
              hasRewards: false,
              hasOrganizations,
              hasGlobalUsers,
              hasBillingRecords,
              hasAdminLogs,
              hasPrograms,
              hasOrgUsers: false,
              hasOrgCourses: false,
              hasOrgProgress: false,
              hasOrgDocument: false,
            }))
          );
        }

        if ((role === 'manager' || role === 'admin') && orgId) {
          return combineLatest([
            of(this.isProfileComplete(profile)),
            this.existsDocument(`organizations/${orgId}`),
            this.existsByField('users', 'orgId', orgId),
            this.existsInCollection(`organizations/${orgId}/courses`),
            this.existsInCollection(`organizations/${orgId}/progress`),
            this.existsInCollection(`organizations/${orgId}/enrollments`),
            this.existsByField('adminNotifications', 'organizationId', orgId),
          ]).pipe(
            map(([
              profileCompleted,
              hasOrgDocument,
              hasOrgUsers,
              hasOrgCourses,
              hasOrgProgress,
              hasEnrollments,
              hasAdminLogs,
            ]) => ({
              profileCompleted,
              hasOrders: false,
              hasBookings: false,
              hasEnrollments,
              hasRewards: false,
              hasOrganizations: false,
              hasGlobalUsers: false,
              hasBillingRecords: false,
              hasAdminLogs,
              hasPrograms: false,
              hasOrgUsers,
              hasOrgCourses,
              hasOrgProgress,
              hasOrgDocument,
            }))
          );
        }

        if (role === 'programAdmin' || role === 'programStaff') {
          return combineLatest([
            of(this.isProfileComplete(profile)),
            orgId ? this.existsByField('programs', 'orgId', orgId) : of(false),
            orgId ? this.existsByField('programEnrollments', 'orgId', orgId) : of(false),
          ]).pipe(
            map(([profileCompleted, hasPrograms, hasEnrollments]) => ({
              profileCompleted,
              hasOrders: false,
              hasBookings: false,
              hasEnrollments,
              hasRewards: false,
              hasOrganizations: false,
              hasGlobalUsers: false,
              hasBillingRecords: false,
              hasAdminLogs: false,
              hasPrograms,
              hasOrgUsers: false,
              hasOrgCourses: false,
              hasOrgProgress: false,
              hasOrgDocument: false,
            }))
          );
        }

        if (role === 'programLearner') {
          return combineLatest([
            of(this.isProfileComplete(profile)),
            this.existsInCollection(`users/${uid}/programProgress`),
            this.existsInCollection(`users/${uid}/assessmentAttempts`),
          ]).pipe(
            map(([profileCompleted, hasEnrollments, hasRewards]) => ({
              profileCompleted,
              hasOrders: false,
              hasBookings: false,
              hasEnrollments,
              hasRewards,
              hasOrganizations: false,
              hasGlobalUsers: false,
              hasBillingRecords: false,
              hasAdminLogs: false,
              hasPrograms: false,
              hasOrgUsers: false,
              hasOrgCourses: false,
              hasOrgProgress: false,
              hasOrgDocument: false,
            }))
          );
        }

        return combineLatest([
          of(this.isProfileComplete(profile)),
          this.existsInCollection(`users/${uid}/orders`),
          this.existsInCollection(`users/${uid}/bookings`),
          this.existsInCollection(`users/${uid}/enrollments`),
          this.existsInCollection(`users/${uid}/rewards`),
        ]).pipe(
          map(([profileCompleted, hasOrders, hasBookings, hasEnrollments, hasRewards]) => ({
            profileCompleted,
            hasOrders,
            hasBookings,
            hasEnrollments,
            hasRewards,
            hasOrganizations: false,
            hasGlobalUsers: false,
            hasBillingRecords: false,
            hasAdminLogs: false,
            hasPrograms: false,
            hasOrgUsers: false,
            hasOrgCourses: false,
            hasOrgProgress: false,
            hasOrgDocument: false,
          }))
        );
      })
    );
  }

  // SDK builders (collection/collectionData/docData) must run inside the
  // Angular injection context. switchMap callbacks fire asynchronously, so we
  // re-enter the injector here to silence the runtime warning and prevent
  // Firestore internal assertion failures triggered by losing zone context.
  private existsInCollection(path: string) {
    return runInInjectionContext(this.injector, () => {
      const ref = query(collection(this.firestore, path), limit(1));
      return collectionData(ref, { idField: 'id' }).pipe(
        map((rows) => rows.length > 0),
        catchError((error) => {
          this.logSignalError(path, error);
          return of(false);
        })
      );
    });
  }

  private existsByField(path: string, field: string, value: string) {
    return runInInjectionContext(this.injector, () => {
      const ref = query(collection(this.firestore, path), where(field, '==', value), limit(1));
      return collectionData(ref, { idField: 'id' }).pipe(
        map((rows) => rows.length > 0),
        catchError((error) => {
          this.logSignalError(`${path}?${field}=${value}`, error);
          return of(false);
        })
      );
    });
  }

  private existsDocument(path: string) {
    return runInInjectionContext(this.injector, () => {
      return docData(doc(this.firestore, path)).pipe(
        map((value) => !!value),
        catchError((error) => {
          this.logSignalError(path, error);
          return of(false);
        })
      );
    });
  }

  private isProfileComplete(profile: AppProfile): boolean {
    const raw = profile as AppProfile & {
      phone?: string;
      bio?: string;
      streetAddress?: string;
      city?: string;
      photoURL?: string | null;
    };

    return [raw.displayName, raw.phone, raw.streetAddress || raw.city || raw.bio || raw.photoURL]
      .some((value) => String(value ?? '').trim().length > 0);
  }

  private stepCompletedBySignals(stepId: string, role: AppRole, signals: OnboardingSignals): boolean {
    if (stepId === 'guest-profile') {
      return signals.profileCompleted;
    }

    if (role === 'guest') {
      if (stepId === 'guest-courses') {
        return signals.hasOrders || signals.hasEnrollments;
      }
      if (stepId === 'guest-programs') {
        return signals.hasOrders || signals.hasBookings;
      }
    }

    if (role === 'learner') {
      if (stepId === 'learner-dashboard' || stepId === 'learner-assignments') {
        return signals.hasEnrollments;
      }
      if (stepId === 'learner-profile') {
        return signals.profileCompleted;
      }
      if (stepId === 'learner-rewards') {
        return signals.hasRewards;
      }
    }

    if (role === 'manager' || role === 'admin') {
      if (stepId === 'manager-dashboard') {
        return signals.hasOrgDocument || signals.hasEnrollments || signals.hasOrgProgress;
      }
      if (stepId === 'manager-learners') {
        return signals.hasOrgUsers;
      }
      if (stepId === 'manager-assign') {
        return signals.hasOrgCourses;
      }
      if (stepId === 'manager-reports') {
        return signals.hasOrgProgress || signals.hasAdminLogs;
      }
    }

    if (role === 'super_admin') {
      if (stepId === 'super-dashboard' || stepId === 'super-organizations') {
        return signals.hasOrganizations;
      }
      if (stepId === 'super-users') {
        return signals.hasGlobalUsers;
      }
      if (stepId === 'super-billing') {
        return signals.hasBillingRecords || signals.hasAdminLogs;
      }
    }

    if (role === 'programAdmin' || role === 'programStaff') {
      if (stepId === 'program-admin-dashboard' || stepId === 'program-staff-dashboard') {
        return signals.hasPrograms || signals.hasEnrollments;
      }
      if (stepId === 'program-admin-programs' || stepId === 'program-staff-programs') {
        return signals.hasPrograms;
      }
      if (stepId === 'program-admin-enrollments' || stepId === 'program-staff-enrollments') {
        return signals.hasEnrollments;
      }
      if (stepId === 'program-admin-analytics') {
        return signals.hasPrograms || signals.hasEnrollments;
      }
    }

    if (role === 'programLearner') {
      if (stepId === 'program-learner-home' || stepId === 'program-learner-dashboard') {
        return signals.hasEnrollments;
      }
      if (stepId === 'program-learner-study') {
        return signals.hasRewards;
      }
    }

    return false;
  }

  private persistState(patch: Partial<NonNullable<AppProfile['onboarding']>>): void {
    const profile = this.profileSnapshot;
    if (!profile?.uid || this.writeInFlight) {
      return;
    }

    const currentState = profile.onboarding ?? {
      version: ONBOARDING_VERSION,
      completedStepIds: [],
      minimized: false,
      dismissedAt: null,
      completedAt: null,
    };
    const role = this.resolveRole(profile);
    if (!role) {
      return;
    }
    const merged = {
      ...currentState,
      ...patch,
      version: ONBOARDING_VERSION,
    };

    const steps = STEP_LIBRARY[role] ?? STEP_LIBRARY.guest;
    const completedIds = new Set(merged.completedStepIds ?? []);
    if (steps.length > 0 && steps.every((step) => completedIds.has(step.id))) {
      merged.completedAt = merged.completedAt ?? new Date().toISOString();
      merged.minimized = merged.minimized ?? true;
    }

    this.writeInFlight = true;
    this.profileSnapshot = {
      ...profile,
      onboarding: merged,
    };

    this.profiles
      .updateOnboardingData(profile.uid, merged)
      .catch((error) => {
        console.error('[OnboardingService] Failed to persist onboarding state', error);
      })
      .finally(() => {
        this.writeInFlight = false;
      });
  }

  private resolveRole(profile: AppProfile | null): AppRole | null {
    return profile?.role ?? profile?.primaryRole ?? null;
  }

  private logSignalError(scope: string, error: unknown): void {
    // Dedupe per scope: a permission-denied on `programs?orgId=X` is the same
    // signal regardless of how many times the listener retries; we don't want
    // to spam the console.
    if (this.loggedSignalErrors.has(scope)) {
      return;
    }
    this.loggedSignalErrors.add(scope);
    console.warn('[OnboardingService] Firestore signal fallback', {
      scope,
      error,
      hint: 'A shell-level onboarding read was denied; fallback=false applied to keep the page rendering.',
    });
  }
}