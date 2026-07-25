import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  docData,
  query,
  where,
  collectionData,
  serverTimestamp,
  setDoc,
} from '@angular/fire/firestore';
import { Observable, firstValueFrom, of } from 'rxjs';
import { Organization } from '../org.models';

export interface CreateRegionInput {
  parentOrgId: string;
  name: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
}

/**
 * Client-side half of the org-hierarchy feature (see docs/organization-architecture.md §10).
 * Every write here relies on firestore.rules' isCouncilAdmin/create-time
 * ancestorOrgIds check to actually enforce who may do this — this service
 * computes the same materialized path the rule expects, but the rule is
 * the real boundary, not this code.
 */
@Injectable({ providedIn: 'root' })
export class OrganizationHierarchyService {
  private readonly afs = inject(Firestore);

  getOrg(orgId: string): Observable<Organization | null> {
    if (!orgId?.trim()) return of(null);
    const ref = doc(this.afs, `organizations/${orgId}`);
    return docData(ref, { idField: 'id' }) as Observable<Organization | null>;
  }

  /** Direct children only — regions in this design don't nest further (canCreateSubOrgs is false on every region). */
  listChildren(parentOrgId: string): Observable<Organization[]> {
    if (!parentOrgId?.trim()) return of([]);
    const ref = query(collection(this.afs, 'organizations'), where('parentOrgId', '==', parentOrgId));
    return collectionData(ref, { idField: 'id' }) as Observable<Organization[]>;
  }

  private generateAccessCode(): string {
    return Math.random().toString(36).substring(2, 15).toUpperCase();
  }

  /**
   * Creates a child region under `input.parentOrgId`. Only succeeds if the
   * caller is that org's own admin/manager AND the org has canCreateSubOrgs
   * true — enforced by firestore.rules, not here.
   */
  async createRegion(input: CreateRegionInput): Promise<string> {
    const parent = await firstValueFrom(this.getOrg(input.parentOrgId));
    if (!parent) {
      throw new Error('Parent organization not found.');
    }

    const ancestorOrgIds = [...(parent.ancestorOrgIds ?? []), input.parentOrgId];

    // Pre-generate the doc ref so `orgId` can be set to match the doc ID in
    // the same write as the hierarchy fields — a follow-up updateDoc would
    // hit the (Super-Admin-only) update rule instead of the create rule.
    const ref = doc(collection(this.afs, 'organizations'));

    await setDoc(ref, {
      orgId: ref.id,
      name: input.name,
      status: 'active',
      active: true,
      contactName: input.contactName ?? null,
      contactEmail: input.contactEmail ?? null,
      contactPhone: input.contactPhone ?? null,
      accessCode: this.generateAccessCode(),
      parentOrgId: input.parentOrgId,
      ancestorOrgIds,
      canCreateSubOrgs: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return ref.id;
  }

  /** All descendants (currently == direct children, single-level hierarchy) with their live Organization doc. */
  descendants(rootOrgId: string): Observable<Organization[]> {
    return this.listChildren(rootOrgId);
  }
}
