import { Injectable, inject } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import {
  Firestore,
  addDoc,
  collection,
  collectionData,
  doc,
  docData,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { Observable, firstValueFrom, of, switchMap } from 'rxjs';
import {
  CreateProgramPayload,
  Program,
  ProgramCategory,
  ProgramStatus,
} from './program.models';

@Injectable({ providedIn: 'root' })
export class ProgramsService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(Auth);

  private readonly programsPath = 'programs';

  getPublishedPrograms(): Observable<Program[]> {
    const programsRef = collection(this.firestore, this.programsPath);
    const publishedQuery = query(
      programsRef,
      where('active', '==', true),
      where('status', '==', ProgramStatus.PUBLISHED),
      orderBy('isFeatured', 'desc'),
      orderBy('updatedAt', 'desc')
    );

    return collectionData(publishedQuery, { idField: 'id' }) as Observable<Program[]>;
  }

  getFeaturedPrograms(limitCount = 6): Observable<Program[]> {
    const programsRef = collection(this.firestore, this.programsPath);
    const featuredQuery = query(
      programsRef,
      where('active', '==', true),
      where('status', '==', ProgramStatus.PUBLISHED),
      where('isFeatured', '==', true),
      orderBy('updatedAt', 'desc'),
      limit(Math.max(1, limitCount))
    );

    return collectionData(featuredQuery, { idField: 'id' }) as Observable<Program[]>;
  }

  getProgramsByCategory(category: ProgramCategory): Observable<Program[]> {
    const programsRef = collection(this.firestore, this.programsPath);
    const categoryQuery = query(
      programsRef,
      where('active', '==', true),
      where('status', '==', ProgramStatus.PUBLISHED),
      where('category', '==', category),
      orderBy('updatedAt', 'desc')
    );

    return collectionData(categoryQuery, { idField: 'id' }) as Observable<Program[]>;
  }

  getProgramById(programId: string): Observable<Program | undefined> {
    if (!programId?.trim()) {
      return of(undefined);
    }

    const programDoc = doc(this.firestore, `${this.programsPath}/${programId}`);
    return docData(programDoc, { idField: 'id' }) as Observable<Program | undefined>;
  }

  async createProgram(payload: CreateProgramPayload): Promise<string> {
    const currentUser = await this.requireCurrentUser();
    const ownerId = payload.ownerId ?? currentUser.uid;
    const slug = this.ensureSlug(payload.slug || payload.title);
    const seatsValue = payload.seats ?? null;

    const programToCreate = {
      ...payload,
      slug,
      ownerId,
      linkedCourseIds: Array.isArray(payload.linkedCourseIds)
        ? payload.linkedCourseIds.filter(Boolean)
        : [],
      seats: seatsValue,
      seatsRemaining:
        payload.seatsRemaining != null
          ? payload.seatsRemaining
          : seatsValue != null
          ? seatsValue
          : null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const ref = await addDoc(collection(this.firestore, this.programsPath), programToCreate);
    return ref.id;
  }

  async updateProgram(programId: string, payload: Partial<CreateProgramPayload>): Promise<void> {
    if (!programId?.trim()) {
      throw new Error('programId is required.');
    }

    const updatePayload: Record<string, unknown> = {
      ...payload,
      updatedAt: serverTimestamp(),
    };

    if (typeof payload.slug === 'string' && payload.slug.trim()) {
      updatePayload['slug'] = this.ensureSlug(payload.slug);
    } else if (typeof payload.title === 'string' && payload.title.trim()) {
      updatePayload['slug'] = this.ensureSlug(payload.title);
    }

    if (payload.seats != null && payload.seatsRemaining == null) {
      updatePayload['seatsRemaining'] = payload.seats;
    }

    if (Array.isArray(payload.linkedCourseIds)) {
      updatePayload['linkedCourseIds'] = payload.linkedCourseIds.filter(Boolean);
    }

    await updateDoc(doc(this.firestore, `${this.programsPath}/${programId}`), updatePayload);
  }

  async archiveProgram(programId: string): Promise<void> {
    if (!programId?.trim()) {
      throw new Error('programId is required.');
    }

    await updateDoc(doc(this.firestore, `${this.programsPath}/${programId}`), {
      active: false,
      status: ProgramStatus.ARCHIVED,
      updatedAt: serverTimestamp(),
    });
  }

  async publishProgram(programId: string): Promise<void> {
    if (!programId?.trim()) {
      throw new Error('programId is required.');
    }

    await updateDoc(doc(this.firestore, `${this.programsPath}/${programId}`), {
      active: true,
      status: ProgramStatus.PUBLISHED,
      updatedAt: serverTimestamp(),
    });
  }

  getAdminPrograms(): Observable<Program[]> {
    return authState(this.auth).pipe(
      switchMap((user) => {
        if (!user?.uid) {
          return of([] as Program[]);
        }

        const programsRef = collection(this.firestore, this.programsPath);
        const adminProgramsQuery = query(programsRef, orderBy('updatedAt', 'desc'));
        return collectionData(adminProgramsQuery, { idField: 'id' }) as Observable<Program[]>;
      })
    );
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

  private ensureSlug(input: string): string {
    return input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }
}
