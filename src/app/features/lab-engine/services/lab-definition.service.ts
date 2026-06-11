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
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  limit,
} from '@angular/fire/firestore';
import { Observable, from, of, combineLatest } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { LabDefinition, LabTask, LabFileDefinition, LabStatus } from '../models/lab-definition.model';

@Injectable({ providedIn: 'root' })
export class LabDefinitionService {
  private readonly firestore = inject(Firestore);

  // ── Collections ────────────────────────────────────────────────────────────

  private labsCol() {
    return collection(this.firestore, 'labDefinitions');
  }

  private tasksCol(labId: string) {
    return collection(this.firestore, `labDefinitions/${labId}/tasks`);
  }

  private filesCol(labId: string) {
    return collection(this.firestore, `labDefinitions/${labId}/fileDefs`);
  }

  // ── Public read operations ─────────────────────────────────────────────────

  /** List all PUBLISHED labs for a specific program. Learners only see their program's labs. */
  getLabsByProgram(programId: string): Observable<LabDefinition[]> {
    const q = query(
      this.labsCol(),
      where('programId', '==', programId),
      where('status', '==', 'PUBLISHED'),
      // orderBy removed: composite index (programId+status+order) may not exist yet.
      // Client-side sort avoids the index requirement while index is building.
    );
    return (collectionData(q, { idField: 'id' }) as Observable<LabDefinition[]>).pipe(
      map((labs) => labs.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0))),
      catchError((err) => { console.error('[Labs] getLabsByProgram error:', err); return of([]); }),
    );
  }

  /** List ALL labs (any status) for a specific program — admin use. */
  getLabsByProgramAdmin(programId: string): Observable<LabDefinition[]> {
    const q = query(
      this.labsCol(),
      where('programId', '==', programId),
      // orderBy removed: composite index (programId+order) may not exist yet.
    );
    return (collectionData(q, { idField: 'id' }) as Observable<LabDefinition[]>).pipe(
      map((labs) => labs.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0))),
      catchError((err) => { console.error('[Labs] getLabsByProgramAdmin error:', err); return of([]); }),
    );
  }

  /** @deprecated Use getLabsByProgram(programId) instead. Lists ALL published labs (global). */
  getPublishedLabs(): Observable<LabDefinition[]> {
    const q = query(
      this.labsCol(),
      where('status', '==', 'PUBLISHED'),
      orderBy('order', 'asc'),
    );
    return collectionData(q, { idField: 'id' }) as Observable<LabDefinition[]>;
  }

  /**
   * List all labs (any status) for admin use.
   */
  getAllLabs(): Observable<LabDefinition[]> {
    const q = query(this.labsCol(), orderBy('order', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<LabDefinition[]>;
  }

  /**
   * Get a single lab definition by ID.
   */
  getLab(labId: string): Observable<LabDefinition | null> {
    return docData(doc(this.firestore, `labDefinitions/${labId}`), { idField: 'id' }).pipe(
      map((d) => (d ? (d as LabDefinition) : null)),
      catchError(() => of(null)),
    );
  }

  /**
   * Get published labs by category.
   */
  getLabsByCategory(category: string): Observable<LabDefinition[]> {
    const q = query(
      this.labsCol(),
      where('status', '==', 'PUBLISHED'),
      where('category', '==', category),
      orderBy('order', 'asc'),
    );
    return collectionData(q, { idField: 'id' }) as Observable<LabDefinition[]>;
  }

  // ── Subcollections ─────────────────────────────────────────────────────────

  /**
   * Get all tasks for a lab, ordered by task order.
   */
  getTasks(labId: string): Observable<LabTask[]> {
    const q = query(this.tasksCol(labId), orderBy('order', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<LabTask[]>;
  }

  /**
   * Get all file definitions for a lab.
   */
  getFileDefinitions(labId: string): Observable<LabFileDefinition[]> {
    return collectionData(this.filesCol(labId), { idField: 'id' }) as Observable<LabFileDefinition[]>;
  }

  // ── Admin write operations ─────────────────────────────────────────────────

  /**
   * Create a new lab definition. Returns the new document ID.
   */
  async createLab(
    partial: Omit<LabDefinition, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<string> {
    const ref = await addDoc(this.labsCol(), {
      ...partial,
      status: 'DRAFT' as LabStatus,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  }

  /**
   * Update lab metadata. Admin only.
   */
  async updateLab(labId: string, partial: Partial<LabDefinition>): Promise<void> {
    await updateDoc(doc(this.firestore, `labDefinitions/${labId}`), {
      ...partial,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Publish or unpublish a lab.
   */
  async setLabStatus(labId: string, status: LabStatus): Promise<void> {
    await updateDoc(doc(this.firestore, `labDefinitions/${labId}`), {
      status,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Add a task to a lab definition.
   */
  async addTask(labId: string, task: Omit<LabTask, 'id'>): Promise<string> {
    const ref = await addDoc(this.tasksCol(labId), task);
    return ref.id;
  }

  /**
   * Update a task.
   */
  async updateTask(labId: string, taskId: string, partial: Partial<LabTask>): Promise<void> {
    await updateDoc(doc(this.firestore, `labDefinitions/${labId}/tasks/${taskId}`), partial);
  }

  /**
   * Add a file definition to a lab.
   */
  async addFileDefinition(labId: string, fileDef: Omit<LabFileDefinition, 'id'>): Promise<string> {
    const ref = await addDoc(this.filesCol(labId), fileDef);
    return ref.id;
  }

  /**
   * Seed a complete lab (used for local seeding + emulator setup).
   * This upserts by labId so it is idempotent.
   */
  async seedLab(
    labId: string,
    lab: Omit<LabDefinition, 'id' | 'createdAt' | 'updatedAt'>,
    tasks: Omit<LabTask, 'id'>[],
    fileDefs: Omit<LabFileDefinition, 'id'>[],
  ): Promise<void> {
    await setDoc(doc(this.firestore, `labDefinitions/${labId}`), {
      ...lab,
      id: labId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    for (const task of tasks) {
      const taskId = `task-${task.order.toString().padStart(2, '0')}`;
      await setDoc(doc(this.firestore, `labDefinitions/${labId}/tasks/${taskId}`), {
        ...task,
        id: taskId,
      });
    }

    for (const fileDef of fileDefs) {
      const fileId = fileDef.path.replace(/\//g, '_').replace(/\./g, '-');
      await setDoc(doc(this.firestore, `labDefinitions/${labId}/fileDefs/${fileId}`), {
        ...fileDef,
        id: fileId,
      });
    }
  }
}
