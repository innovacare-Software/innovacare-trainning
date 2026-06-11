import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { LabDefinition, LabTask, LabFileDefinition, LabStatus } from '../../../lab-engine/models/lab-definition.model';
import { AuthService } from '../../../../core/auth';

@Injectable({ providedIn: 'root' })
export class ProgramLabsAdminService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(AuthService);

  private labsCol() {
    return collection(this.firestore, 'labDefinitions');
  }

  /** All labs for a program (any status) — admin view */
  getLabsForProgram(programId: string): Observable<LabDefinition[]> {
    const q = query(
      this.labsCol(),
      where('programId', '==', programId),
      // NOTE: orderBy removed — composite index (programId+order) takes time to build.
      // Client-side sort is used until the index is active.
    );
    return (collectionData(q, { idField: 'id' }) as Observable<LabDefinition[]>).pipe(
      map((labs) => labs.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0))),
      catchError((err) => { console.error('[Labs] getLabsForProgram error:', err); return of([]); }),
    );
  }

  /** Single lab by ID */
  getLab(labId: string): Observable<LabDefinition | null> {
    return (docData(doc(this.firestore, `labDefinitions/${labId}`), { idField: 'id' }) as Observable<LabDefinition | null>).pipe(
      catchError(() => of(null)),
    );
  }

  /** Create a new lab scoped to a program */
  async createLab(programId: string, moduleId: string, data: Partial<LabDefinition>): Promise<string> {
    const uid = this.auth.currentUid ?? 'system';
    const payload: Record<string, unknown> = {
      ...(data as Record<string, unknown>),
      programId,
      moduleId,
      status: 'DRAFT',
      createdBy: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const ref = await addDoc(this.labsCol(), payload);
    return ref.id;
  }

  /** Update lab fields */
  async updateLab(labId: string, partial: Partial<LabDefinition>): Promise<void> {
    const payload: Record<string, unknown> = {
      ...(partial as Record<string, unknown>),
      updatedAt: serverTimestamp(),
    };
    await updateDoc(doc(this.firestore, `labDefinitions/${labId}`), payload);
  }

  /** Change lab status (DRAFT / PUBLISHED / ARCHIVED) */
  async setStatus(labId: string, status: LabStatus): Promise<void> {
    await updateDoc(doc(this.firestore, `labDefinitions/${labId}`), {
      status,
      updatedAt: serverTimestamp(),
    });
  }

  /** Delete a lab */
  async deleteLab(labId: string): Promise<void> {
    await deleteDoc(doc(this.firestore, `labDefinitions/${labId}`));
  }

  // ── Tasks sub-collection ────────────────────────────────────────────────────

  /** Get tasks for a lab (ordered by order field) */
  getTasks(labId: string): Observable<LabTask[]> {
    const q = query(
      collection(this.firestore, `labDefinitions/${labId}/tasks`),
      orderBy('order', 'asc'),
    );
    return (collectionData(q, { idField: 'id' }) as Observable<LabTask[]>).pipe(
      catchError(() => of([])),
    );
  }

  /** Add a new task to a lab's sub-collection */
  async addTask(labId: string, task: Omit<LabTask, 'id'>): Promise<string> {
    const ref = await addDoc(
      collection(this.firestore, `labDefinitions/${labId}/tasks`),
      task as Record<string, unknown>,
    );
    return ref.id;
  }

  /** Update an existing task */
  async updateTask(labId: string, taskId: string, partial: Partial<LabTask>): Promise<void> {
    await updateDoc(
      doc(this.firestore, `labDefinitions/${labId}/tasks/${taskId}`),
      partial as Record<string, unknown>,
    );
  }

  /** Delete a task */
  async deleteTask(labId: string, taskId: string): Promise<void> {
    await deleteDoc(doc(this.firestore, `labDefinitions/${labId}/tasks/${taskId}`));
  }

  // ── File Definitions sub-collection ────────────────────────────────────────

  /** Get file definitions for a lab */
  getFileDefs(labId: string): Observable<LabFileDefinition[]> {
    return (collectionData(
      collection(this.firestore, `labDefinitions/${labId}/fileDefs`),
      { idField: 'id' },
    ) as Observable<LabFileDefinition[]>).pipe(
      catchError(() => of([])),
    );
  }

  /** Add a new file definition */
  async addFileDef(labId: string, fileDef: Omit<LabFileDefinition, 'id'>): Promise<string> {
    const ref = await addDoc(
      collection(this.firestore, `labDefinitions/${labId}/fileDefs`),
      fileDef as Record<string, unknown>,
    );
    return ref.id;
  }

  /** Update a file definition */
  async updateFileDef(labId: string, fileId: string, partial: Partial<LabFileDefinition>): Promise<void> {
    await updateDoc(
      doc(this.firestore, `labDefinitions/${labId}/fileDefs/${fileId}`),
      partial as Record<string, unknown>,
    );
  }

  /** Delete a file definition */
  async deleteFileDef(labId: string, fileId: string): Promise<void> {
    await deleteDoc(doc(this.firestore, `labDefinitions/${labId}/fileDefs/${fileId}`));
  }
}
