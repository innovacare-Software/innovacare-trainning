import { Injectable, Injector, inject, runInInjectionContext } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  orderBy,
  query,
  where,
} from '@angular/fire/firestore';
import {
  addDoc,
  deleteDoc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { Observable, catchError, firstValueFrom, of, switchMap } from 'rxjs';
import {
  CreateProgramEnrollmentPayload,
  PaymentStatus,
  Program,
  ProgramEnrollment,
  ProgramEnrollmentStatus,
  ReviewStatus,
} from './program.models';
import { AppProfile, AuthService } from '../../../core/auth';

@Injectable({ providedIn: 'root' })
export class ProgramEnrollmentsService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(Auth);
  private readonly authService = inject(AuthService);
  private readonly injector = inject(Injector);

  private readonly programsPath = 'programs';
  private readonly enrollmentsPath = 'programEnrollments';

  private inContext<T>(factory: () => T): T {
    return runInInjectionContext(this.injector, factory);
  }

  async createEnrollment(
    program: Program,
    payload: CreateProgramEnrollmentPayload
  ): Promise<string> {
    const currentUser = await this.requireCurrentUser();
    const programSnap = await getDoc(doc(this.firestore, `${this.programsPath}/${program.id}`));

    if (!programSnap.exists()) {
      throw new Error('Program not found or unavailable.');
    }

    const existingEnrollmentsSnap = await getDocs(
      query(
        collection(this.firestore, this.enrollmentsPath),
        where('userId', '==', currentUser.uid),
        where('programId', '==', program.id)
      )
    );

    const existingEnrollments = existingEnrollmentsSnap.docs.map((snapshot) => ({
      ...(snapshot.data() as ProgramEnrollment),
      id: snapshot.id,
    }));

    const primaryEnrollment = this.selectPrimaryEnrollment(existingEnrollments, program.id);
    if (primaryEnrollment && this.canAccessLearnerSpace(primaryEnrollment)) {
      throw new Error('You already have access to this program.');
    }

    const reusableEnrollment = existingEnrollments.find((row) => this.canResumeCheckout(row));
    if (reusableEnrollment?.id) {
      await updateDoc(doc(this.firestore, `${this.enrollmentsPath}/${reusableEnrollment.id}`), {
        learnerName: payload.learnerName.trim(),
        learnerEmail: payload.learnerEmail.trim().toLowerCase(),
        learnerPhone: payload.learnerPhone.trim(),
        notes: payload.notes?.trim() || '',
        updatedAt: serverTimestamp(),
      });
      return reusableEnrollment.id;
    }

    const enrollment = {
      userId: currentUser.uid,
      programId: program.id,
      programTitle: program.title,
      category: program.category,
      learnerName: payload.learnerName.trim(),
      learnerEmail: payload.learnerEmail.trim().toLowerCase(),
      learnerPhone: payload.learnerPhone.trim(),
      notes: payload.notes?.trim() || '',
      status: ProgramEnrollmentStatus.PENDING,
      paymentStatus: PaymentStatus.UNPAID,
      reviewStatus: ReviewStatus.PENDING_REVIEW,
      amount: Number(program.discountPrice ?? program.price ?? 0),
      currency: program.currency,
      orgId: program.orgId ?? null,
      enrolledAt: serverTimestamp(),
      activatedAt: null,
      completedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const ref = await addDoc(collection(this.firestore, this.enrollmentsPath), enrollment);
    return ref.id;
  }

  getMyEnrollmentForProgram(programId: string): Observable<ProgramEnrollment | undefined> {
    if (!programId?.trim()) {
      return of(undefined);
    }

    return this.getMyEnrollments().pipe(
      switchMap((enrollments) => of(this.selectPrimaryEnrollment(enrollments, programId)))
    );
  }

  selectPrimaryEnrollment(
    enrollments: ProgramEnrollment[],
    programId: string
  ): ProgramEnrollment | undefined {
    const matches = enrollments.filter((row) => row.programId === programId);
    if (!matches.length) {
      return undefined;
    }

    return matches
      .slice()
      .sort((left, right) => this.rankEnrollment(right) - this.rankEnrollment(left))[0];
  }

  canAccessLearnerSpace(enrollment: ProgramEnrollment | undefined): boolean {
    if (!enrollment) {
      return false;
    }

    return enrollment.paymentStatus === PaymentStatus.PAID && [
      ProgramEnrollmentStatus.ACTIVE,
      ProgramEnrollmentStatus.COMPLETED,
      ProgramEnrollmentStatus.CONFIRMED,
    ].includes(enrollment.status);
  }

  canResumeCheckout(enrollment: ProgramEnrollment | undefined): boolean {
    if (!enrollment) {
      return false;
    }

    return !this.canAccessLearnerSpace(enrollment) &&
      ![ProgramEnrollmentStatus.CANCELLED, ProgramEnrollmentStatus.REJECTED, ProgramEnrollmentStatus.COMPLETED].includes(enrollment.status) &&
      enrollment.amount > 0 &&
      enrollment.paymentStatus !== PaymentStatus.PAID;
  }

  private rankEnrollment(enrollment: ProgramEnrollment): number {
    const paymentBonus = enrollment.paymentStatus === PaymentStatus.PAID ? 100 : 0;
    const statusScore = (() => {
      switch (enrollment.status) {
        case ProgramEnrollmentStatus.ACTIVE:
          return 50;
        case ProgramEnrollmentStatus.COMPLETED:
          return 45;
        case ProgramEnrollmentStatus.CONFIRMED:
          return 40;
        case ProgramEnrollmentStatus.APPROVED:
          return 30;
        case ProgramEnrollmentStatus.PENDING:
          return 20;
        case ProgramEnrollmentStatus.CANCELLED:
          return 10;
        case ProgramEnrollmentStatus.REJECTED:
        default:
          return 0;
      }
    })();

    return paymentBonus + statusScore;
  }

  getMyEnrollments(): Observable<ProgramEnrollment[]> {
    return this.inContext(() => authState(this.auth)).pipe(
      switchMap((user) => {
        if (!user?.uid) {
          return of([] as ProgramEnrollment[]);
        }

        const ref = collection(this.firestore, this.enrollmentsPath);
        const myQuery = query(ref, where('userId', '==', user.uid), orderBy('createdAt', 'desc'));

        return this.inContext(() => collectionData(myQuery, { idField: 'id' }) as Observable<ProgramEnrollment[]>);
      })
    );
  }

  getAllEnrollmentsForAdmin(): Observable<ProgramEnrollment[]> {
    return this.authService.profile$.pipe(
      switchMap((profile) => {
        if (!profile?.uid) {
          return of([] as ProgramEnrollment[]);
        }

        const scopedOrgId = this.normalizeOrgId(profile.orgId);
        if (!this.isSuperAdmin(profile) && !scopedOrgId) {
          return of([] as ProgramEnrollment[]);
        }

        const ref = collection(this.firestore, this.enrollmentsPath);
        const q = this.isSuperAdmin(profile)
          ? query(ref, orderBy('createdAt', 'desc'))
          : query(ref, where('orgId', '==', scopedOrgId), orderBy('createdAt', 'desc'));
        return this.inContext(() => collectionData(q, { idField: 'id' }) as Observable<ProgramEnrollment[]>);
      })
    );
  }

  getEnrollmentById(enrollmentId: string): Observable<ProgramEnrollment | undefined> {
    if (!enrollmentId?.trim()) {
      return of(undefined);
    }

    const ref = doc(this.firestore, `${this.enrollmentsPath}/${enrollmentId}`);
    return (this.inContext(
      () => docData(ref, { idField: 'id' }) as Observable<ProgramEnrollment | undefined>
    )).pipe(
      catchError(() => of(undefined))
    );
  }

  approveEnrollment(enrollmentId: string): Promise<void> {
    return this.updateAdminState(enrollmentId, {
      status: ProgramEnrollmentStatus.APPROVED,
      reviewStatus: ReviewStatus.APPROVED,
    });
  }

  rejectEnrollment(enrollmentId: string): Promise<void> {
    return this.updateAdminState(enrollmentId, {
      status: ProgramEnrollmentStatus.REJECTED,
      reviewStatus: ReviewStatus.DENIED,
    });
  }

  activateEnrollment(enrollmentId: string): Promise<void> {
    return this.updateAdminState(enrollmentId, {
      status: ProgramEnrollmentStatus.ACTIVE,
      activatedAt: serverTimestamp(),
    });
  }

  completeEnrollment(enrollmentId: string): Promise<void> {
    return this.updateAdminState(enrollmentId, {
      status: ProgramEnrollmentStatus.COMPLETED,
      completedAt: serverTimestamp(),
    });
  }

  cancelEnrollment(enrollmentId: string): Promise<void> {
    return this.updateAdminState(enrollmentId, {
      status: ProgramEnrollmentStatus.CANCELLED,
    });
  }

  async deleteEnrollment(enrollmentId: string): Promise<void> {
    if (!enrollmentId?.trim()) {
      throw new Error('enrollmentId is required.');
    }
    await this.requireCurrentUser();
    await deleteDoc(doc(this.firestore, `${this.enrollmentsPath}/${enrollmentId}`));
  }

  updatePaymentStatus(enrollmentId: string, paymentStatus: PaymentStatus): Promise<void> {
    return this.updateAdminState(enrollmentId, {
      paymentStatus,
    });
  }

  markManualPaymentPending(enrollmentId: string): Promise<void> {
    return this.updateAdminState(enrollmentId, {
      status: ProgramEnrollmentStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      paymentMethod: 'manual',
      paymentProvider: 'manual',
    });
  }

  private async updateAdminState(
    enrollmentId: string,
    payload: Partial<ProgramEnrollment>
  ): Promise<void> {
    if (!enrollmentId?.trim()) {
      throw new Error('enrollmentId is required.');
    }

    await this.requireCurrentUser();

    await updateDoc(doc(this.firestore, `${this.enrollmentsPath}/${enrollmentId}`), {
      ...payload,
      updatedAt: serverTimestamp(),
    });
  }

  private normalizeOrgId(value: unknown): string | null {
    const orgId = String(value || '').trim();
    return orgId ? orgId : null;
  }

  private isSuperAdmin(profile: AppProfile | null): boolean {
    return profile?.role === 'super_admin';
  }

  private async requireCurrentUser() {
    const currentUser = this.auth.currentUser;
    if (currentUser) {
      return currentUser;
    }

    const userFromState = await firstValueFrom(this.inContext(() => authState(this.auth)));
    if (!userFromState) {
      throw new Error('Authentication required. Please sign in first.');
    }
    return userFromState;
  }
}
