import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, orderBy, query, where } from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { ProgramDocument } from '../../program.models';

@Injectable({ providedIn: 'root' })
export class LearnerDocumentsService {
  private readonly firestore = inject(Firestore);

  getDocuments(programId: string, moduleId?: string): Observable<ProgramDocument[]> {
    if (!programId) return of([]);
    const ref = collection(this.firestore, `programs/${programId}/documents`);
    const constraints = moduleId
      ? [where('active', '==', true), where('moduleId', '==', moduleId), orderBy('order', 'asc')]
      : [where('active', '==', true), orderBy('order', 'asc')];
    return collectionData(query(ref, ...constraints), { idField: 'id' }) as Observable<ProgramDocument[]>;
  }
}
