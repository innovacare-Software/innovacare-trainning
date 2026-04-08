import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  addDoc,
  collection,
  collectionData,
  serverTimestamp,
  query,
  where,
} from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { OrgFirestorePaths } from '../org-firestore-paths';
import { OrganizationAuditActionType, OrganizationAuditLog, OrganizationAuditSeverity } from '../org.models';

@Injectable({ providedIn: 'root' })
export class OrganizationAuditService {
  private readonly afs = inject(Firestore);

  list(orgId: string): Observable<OrganizationAuditLog[]> {
    if (!orgId?.trim()) return of([]);
    const ref = collection(this.afs, OrgFirestorePaths.auditLogs(orgId));
    return collectionData(ref, { idField: 'id' }) as Observable<OrganizationAuditLog[]>;
  }

  listCritical(orgId: string): Observable<OrganizationAuditLog[]> {
    if (!orgId?.trim()) return of([]);
    const ref = collection(this.afs, OrgFirestorePaths.auditLogs(orgId));
    const q = query(ref, where('severity', '==', 'critical'));
    return collectionData(q, { idField: 'id' }) as Observable<OrganizationAuditLog[]>;
  }

  async write(params: {
    orgId: string;
    actionType: OrganizationAuditActionType;
    severity?: OrganizationAuditSeverity;
    module: string;
    objectType: string;
    objectId: string;
    actorUid?: string;
    actorEmail?: string;
    message?: string;
    previousValue?: Record<string, unknown>;
    newValue?: Record<string, unknown>;
  }): Promise<void> {
    const ref = collection(this.afs, OrgFirestorePaths.auditLogs(params.orgId));
    await addDoc(ref, {
      orgId: params.orgId,
      actionType: params.actionType,
      severity: params.severity || 'info',
      module: params.module,
      objectType: params.objectType,
      objectId: params.objectId,
      actorUid: params.actorUid,
      actorEmail: params.actorEmail,
      message: params.message,
      previousValue: params.previousValue,
      newValue: params.newValue,
      createdAt: serverTimestamp(),
    } as any as OrganizationAuditLog);
  }
}
