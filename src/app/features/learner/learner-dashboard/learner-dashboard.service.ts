import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  query,
  where,
  orderBy,
} from '@angular/fire/firestore';
import { Auth, authState } from '@angular/fire/auth';
import { Observable, of, switchMap, catchError, map } from 'rxjs';
import {
  Program,
  ProgramEnrollment,
  ProgramLiveSession,
} from '../../publics/programs/program.models';
import { ProgramEnrollmentsService } from '../../publics/programs/program-enrollments.service';

const MOCK_SESSIONS: ProgramLiveSession[] = [
  {
    id: 's1',
    programId: 'p1',
    title: 'NCLEX Q&A Live Review',
    sessionType: 'q_and_a' as any,
    startAt: new Date(Date.now() + 86_400_000),
    endAt: new Date(Date.now() + 86_400_000 + 7_200_000),
    instructorName: 'Dr. Sarah Johnson',
    active: true,
    required: false,
  },
  {
    id: 's2',
    programId: 'p1',
    title: 'Pharmacology Deep Dive',
    sessionType: 'live_lecture' as any,
    startAt: new Date(Date.now() + 172_800_000),
    endAt: new Date(Date.now() + 172_800_000 + 5_400_000),
    instructorName: 'Prof. Michael Chen',
    active: true,
    required: false,
  },
  {
    id: 's3',
    programId: 'p2',
    title: 'Med-Surg Clinical Review',
    sessionType: 'review_session' as any,
    startAt: new Date(Date.now() + 259_200_000),
    endAt: new Date(Date.now() + 259_200_000 + 3_600_000),
    instructorName: 'Nurse Practitioner Lisa Ray',
    active: true,
    required: true,
  },
];

const MOCK_PRODUCTS: Program[] = [
  {
    id: 'pr1',
    title: 'NCLEX-RN Complete Prep 2025',
    slug: 'nclex-rn-complete-2025',
    subtitle: 'The ultimate NCLEX preparation program',
    description: 'Comprehensive preparation for the NCLEX-RN examination.',
    category: 'NCLEX' as any,
    tags: ['nclex', 'nursing', 'rn'],
    imageUrl: '',
    durationText: '12 Weeks',
    scheduleText: 'Flexible',
    price: 299,
    discountPrice: 199,
    currency: 'USD',
    level: 'INTERMEDIATE' as any,
    deliveryMode: 'ONLINE' as any,
    isFeatured: true,
    active: true,
    status: 'PUBLISHED' as any,
    requirements: [],
    outcomes: ['1500+ Practice Questions', 'Live Q&A Sessions', 'Study Calendar', 'Personalized Analytics'],
    ownerId: 'system',
  },
  {
    id: 'pr2',
    title: 'Medical-Surgical Mastery',
    slug: 'medical-surgical-mastery',
    subtitle: 'Master Med-Surg for NCLEX success',
    description: 'Deep dive into medical-surgical nursing concepts.',
    category: 'NURSING_PREP' as any,
    tags: ['med-surg', 'nursing'],
    imageUrl: '',
    durationText: '8 Weeks',
    scheduleText: 'Flexible',
    price: 199,
    discountPrice: 149,
    currency: 'USD',
    level: 'BEGINNER' as any,
    deliveryMode: 'ONLINE' as any,
    isFeatured: false,
    active: true,
    status: 'PUBLISHED' as any,
    requirements: [],
    outcomes: ['450+ Cases', 'Video Explanations', 'Assessments', 'Certificate'],
    ownerId: 'system',
  },
  {
    id: 'pr3',
    title: 'DHA Examination Prep',
    slug: 'dha-exam-prep',
    subtitle: 'Get licensed to practice in Dubai',
    description: 'Complete preparation for the DHA licensing examination.',
    category: 'DHA' as any,
    tags: ['dha', 'dubai', 'licensing'],
    imageUrl: '',
    durationText: '10 Weeks',
    scheduleText: 'Flexible',
    price: 249,
    discountPrice: 179,
    currency: 'USD',
    level: 'INTERMEDIATE' as any,
    deliveryMode: 'ONLINE' as any,
    isFeatured: true,
    active: true,
    status: 'PUBLISHED' as any,
    requirements: [],
    outcomes: ['Full DHA Curriculum', 'Mock Exams', 'Expert Tutors', 'Guaranteed Pass'],
    ownerId: 'system',
  },
];

@Injectable({ providedIn: 'root' })
export class LearnerDashboardService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(Auth);
  private readonly enrollmentsService = inject(ProgramEnrollmentsService);

  getMyProgramEnrollments(): Observable<ProgramEnrollment[]> {
    return this.enrollmentsService.getMyEnrollments().pipe(
      catchError(() => of([] as ProgramEnrollment[]))
    );
  }

  getUpcomingLiveSessions(programIds: string[] = []): Observable<ProgramLiveSession[]> {
    if (!programIds.length) {
      return of(MOCK_SESSIONS);
    }

    return authState(this.auth).pipe(
      switchMap(() => {
        try {
          const ref = collection(this.firestore, 'programLiveSessions');
          const q = query(
            ref,
            where('programId', 'in', programIds.slice(0, 10)),
            where('active', '==', true),
            orderBy('startAt', 'asc')
          );
          return (collectionData(q, { idField: 'id' }) as Observable<ProgramLiveSession[]>).pipe(
            map(sessions => sessions.length ? sessions : MOCK_SESSIONS),
            catchError(() => of(MOCK_SESSIONS))
          );
        } catch {
          return of(MOCK_SESSIONS);
        }
      }),
      catchError(() => of(MOCK_SESSIONS))
    );
  }

  getProductsForUpsell(): Observable<Program[]> {
    return authState(this.auth).pipe(
      switchMap((user) => {
        if (!user) return of(MOCK_PRODUCTS);

        return this.enrollmentsService.getMyEnrollments().pipe(
          switchMap((enrollments) => {
            const enrolledIds = new Set(enrollments.map(e => e.programId));
            try {
              const ref = collection(this.firestore, 'programs');
              const q = query(
                ref,
                where('status', '==', 'PUBLISHED'),
                where('active', '==', true)
              );
              return (collectionData(q, { idField: 'id' }) as Observable<Program[]>).pipe(
                map(programs => {
                  const filtered = programs.filter(p => !enrolledIds.has(p.id)).slice(0, 6);
                  return filtered.length ? filtered : MOCK_PRODUCTS;
                }),
                catchError(() => of(MOCK_PRODUCTS))
              );
            } catch {
              return of(MOCK_PRODUCTS);
            }
          }),
          catchError(() => of(MOCK_PRODUCTS))
        );
      }),
      catchError(() => of(MOCK_PRODUCTS))
    );
  }

  getContinueLearning(): Observable<{
    programTitle: string;
    programId: string;
    programImage?: string;
    lastModule?: string;
    progress: number;
  } | null> {
    return this.enrollmentsService.getMyEnrollments().pipe(
      map(enrollments => {
        const active = enrollments.find(e => e.status === 'active') ??
                       enrollments.find(e => e.status === 'approved') ??
                       enrollments[0];
        if (!active) return null;
        return {
          programTitle: active.programTitle,
          programId: active.programId,
          programImage: active.programImage,
          lastModule: undefined,
          progress: 35,
        };
      }),
      catchError(() => of(null))
    );
  }
}
