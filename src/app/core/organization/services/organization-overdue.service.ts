import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  query,
  where,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Observable, map, of } from 'rxjs';
import { OrgFirestorePaths } from '../org-firestore-paths';
import { OrganizationOverdueRecord } from '../org.models';

@Injectable({ providedIn: 'root' })
export class OrganizationOverdueService {
  private readonly afs = inject(Firestore);

  list(orgId: string): Observable<OrganizationOverdueRecord[]> {
    if (!orgId?.trim()) return of([]);
    const ref = collection(this.afs, OrgFirestorePaths.overdue(orgId));
    return collectionData(ref, { idField: 'id' }) as Observable<OrganizationOverdueRecord[]>;
  }

  listOpen(orgId: string): Observable<OrganizationOverdueRecord[]> {
    if (!orgId?.trim()) return of([]);
    const ref = collection(this.afs, OrgFirestorePaths.overdue(orgId));
    const q = query(ref, where('status', 'in', ['open', 'contacted']));
    return collectionData(q, { idField: 'id' }) as Observable<OrganizationOverdueRecord[]>;
  }

  listByUser(orgId: string, userId: string): Observable<OrganizationOverdueRecord[]> {
    if (!orgId?.trim() || !userId?.trim()) return of([]);
    const ref = collection(this.afs, OrgFirestorePaths.overdue(orgId));
    const q = query(ref, where('userId', '==', userId));
    return collectionData(q, { idField: 'id' }) as Observable<OrganizationOverdueRecord[]>;
  }

  async create(orgId: string, payload: Omit<OrganizationOverdueRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const ref = collection(this.afs, OrgFirestorePaths.overdue(orgId));
    await addDoc(ref, {
      ...payload,
      orgId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  async markContacted(orgId: string, recordId: string, note?: string): Promise<void> {
    await updateDoc(doc(this.afs, OrgFirestorePaths.overdueRecord(orgId, recordId)), {
      status: 'contacted',
      note: note || null,
      updatedAt: serverTimestamp(),
    });
  }

  async markResolved(orgId: string, recordId: string, note?: string): Promise<void> {
    await updateDoc(doc(this.afs, OrgFirestorePaths.overdueRecord(orgId, recordId)), {
      status: 'resolved',
      note: note || null,
      updatedAt: serverTimestamp(),
    });
  }

  overdueTrend(orgId: string): Observable<Array<{ label: string; value: number }>> {
    return this.list(orgId).pipe(
      map((rows) => {
        const buckets = new Map<string, number>();
        for (const row of rows) {
          const days = Math.max(0, Number(row.overdueDays || 0));
          const label = days >= 30 ? '30+j' : days >= 14 ? '14-29j' : days >= 7 ? '7-13j' : '0-6j';
          buckets.set(label, (buckets.get(label) || 0) + 1);
        }
        return ['0-6j', '7-13j', '14-29j', '30+j'].map((label) => ({ label, value: buckets.get(label) || 0 }));
      })
    );
  }
}
