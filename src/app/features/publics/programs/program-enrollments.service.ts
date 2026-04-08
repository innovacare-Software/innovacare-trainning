import { Injectable, inject } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import {
  Firestore,
  addDoc,
  collection,
  collectionData,
  doc,
  docData,
  getDoc,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { Observable, firstValueFrom, of, switchMap } from 'rxjs';
import {
  CreateProgramEnrollmentPayload,
  PaymentStatus,
  Program,
  ProgramEnrollment,
  ProgramEnrollmentStatus,
  ReviewStatus,
} from './program.models';

@Injectable({ providedIn: 'root' })
export class ProgramEnrollmentsService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(Auth);

  private readonly programsPath = 'programs';
  private readonly enrollmentsPath = 'programEnrollments';

  async createEnrollment(
    program: Program,
    payload: CreateProgramEnrollmentPayload
  ): Promise<string> {
    const currentUser = await this.requireCurrentUser();
    const programSnap = await getDoc(doc(this.firestore, `${this.programsPath}/${program.id}`));

    if (!programSnap.exists()) {
      throw new Error('Program not found or unavailable.');
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

  getMyEnrollments(): Observable<ProgramEnrollment[]> {
    return authState(this.auth).pipe(
      switchMap((user) => {
        if (!user?.uid) {
          return of([] as ProgramEnrollment[]);
        }

        const ref = collection(this.firestore, this.enrollmentsPath);
        const myQuery = query(ref, where('userId', '==', user.uid), orderBy('createdAt', 'desc'));

        return collectionData(myQuery, { idField: 'id' }) as Observable<ProgramEnrollment[]>;
      })
    );
  }

  getAllEnrollmentsForAdmin(): Observable<ProgramEnrollment[]> {
    const ref = collection(this.firestore, this.enrollmentsPath);
    const q = query(ref, orderBy('createdAt', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<ProgramEnrollment[]>;
  }

  getEnrollmentById(enrollmentId: string): Observable<ProgramEnrollment | undefined> {
    if (!enrollmentId?.trim()) {
      return of(undefined);
    }

    const ref = doc(this.firestore, `${this.enrollmentsPath}/${enrollmentId}`);
    return docData(ref, { idField: 'id' }) as Observable<ProgramEnrollment | undefined>;
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

  updatePaymentStatus(enrollmentId: string, paymentStatus: PaymentStatus): Promise<void> {
    return this.updateAdminState(enrollmentId, {
      paymentStatus,
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

  private async requireCurrentUser() {
    const currentUser = this.auth.currentUser;
    if (currentUser) {
      return currentUser;
    }

    const userFromState = await firstValueFrom(authState(this.auth));
    if (!userFromState) {
      throw new Error('Authentication required. Please sign in first.');
    }
    return userFromState;
  }
}
