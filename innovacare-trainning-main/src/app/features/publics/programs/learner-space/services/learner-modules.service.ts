import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, doc, docData, orderBy, query, where } from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { ProgramModule } from '../../program.models';

@Injectable({ providedIn: 'root' })
export class LearnerModulesService {
  private readonly firestore = inject(Firestore);

  getModules(programId: string): Observable<ProgramModule[]> {
    if (!programId) return of([]);
    const ref = collection(this.firestore, `programs/${programId}/modules`);
    const q = query(ref, where('active', '==', true), orderBy('order', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<ProgramModule[]>;
  }

  getModule(programId: string, moduleId: string): Observable<ProgramModule | undefined> {
    if (!programId || !moduleId) return of(undefined);
    const ref = doc(this.firestore, `programs/${programId}/modules/${moduleId}`);
    return docData(ref, { idField: 'id' }) as Observable<ProgramModule | undefined>;
  }
}
