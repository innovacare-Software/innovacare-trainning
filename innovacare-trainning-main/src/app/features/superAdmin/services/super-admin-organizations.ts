import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  setDoc,
} from '@angular/fire/firestore';
import { combineLatest, map, Observable } from 'rxjs';
import { SuperAdminLogsService } from './super-admin-logs';
import { OrganizationCoursesService } from '../../../core/organization/services/organization-courses.service';
import { SuperAdminOrganizationCoursesService } from './super-admin-organization-courses.service';
import {
  OrganizationAssignedCourse,
  OrganizationCourseAssignment,
  OrganizationDetailsViewModel,
  OrganizationListRowViewModel,
  OrganizationPolicy,
  OrganizationProgressSummary,
  OrganizationStatsViewModel,
  OrganizationWoundLibraryItem,
  OrgType,
  PlanType,
  SuperAdminOrganization,
  SuperAdminUser,
} from '../models/super-admin.models';


@Injectable({ providedIn: 'root' })
export class SuperAdminOrganizationsService {
  private afs = inject(Firestore);
  private logs = inject(SuperAdminLogsService);
  private orgCourses = inject(OrganizationCoursesService);
  private platformCourses = inject(SuperAdminOrganizationCoursesService);

  private colRef = collection(this.afs, 'organizations');
  private assignmentColRef = collection(this.afs, 'organizationCourseAssignments');
  private usersColRef = collection(this.afs, 'users');

  list(): Observable<SuperAdminOrganization[]> {
    const q = query(this.colRef, orderBy('createdAt', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<SuperAdminOrganization[]>;
  }

  listFiltered(
    search = '',
    type: OrgType | 'all' = 'all',
    plan: PlanType | 'all' = 'all'
  ): Observable<SuperAdminOrganization[]> {
    const term = search.trim().toLowerCase();

    return this.list().pipe(
      map((rows) =>
        rows.filter((org) => {
          const matchesType = type === 'all' ? true : org.type === type;
          const matchesPlan = plan === 'all' ? true : org.plan === plan;
          const blob = `${org.name ?? ''} ${org.ownerEmail ?? ''} ${org.id ?? ''}`.toLowerCase();
          const matchesSearch = !term || blob.includes(term);
          return matchesType && matchesPlan && matchesSearch;
        })
      )
    );
  }

  listPage(
    search = '',
    type: OrgType | 'all' = 'all',
    plan: PlanType | 'all' = 'all',
    page = 1,
    pageSize = 10
  ): Observable<{ total: number; items: SuperAdminOrganization[] }> {
    return this.listFiltered(search, type, plan).pipe(
      map((rows) => {
        const total = rows.length;
        const start = Math.max(0, (page - 1) * pageSize);
        const items = rows.slice(start, start + pageSize);
        return { total, items };
      })
    );
  }

  getById(id: string): Observable<SuperAdminOrganization | null> {
    const ref = doc(this.afs, `organizations/${id}`);
    return docData(ref, { idField: 'id' }) as Observable<SuperAdminOrganization | null>;
  }

  getOrganizationById(orgId: string): Observable<SuperAdminOrganization | null> {
    return this.getById(orgId);
  }

  private generateAccessCode(): string {
    return Math.random().toString(36).substring(2, 15).toUpperCase();
  }

  async create(
    payload: SuperAdminOrganization,
    actor?: { uid?: string; email?: string }
  ): Promise<string> {
    const accessCode = this.generateAccessCode();
    const ref = await addDoc(this.colRef, {
      ...payload,
      accessCode,
      active: payload.active ?? true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await this.logs.audit({
      action: 'CREATE_ORGANIZATION',
      targetType: 'organization',
      targetId: ref.id,
      actorUid: actor?.uid,
      actorEmail: actor?.email,
      message: `Organization created: ${payload.name}`,
      meta: { name: payload.name, type: payload.type, plan: payload.plan, accessCode },
    });

    return ref.id;
  }

  async createWithOwner(params: {
    organization: Omit<SuperAdminOrganization, 'id' | 'createdAt' | 'updatedAt' | 'ownerUid' | 'ownerEmail'>;
    owner: {
      uid: string;
      email: string;
      displayName?: string;
    };
    actor?: { uid?: string; email?: string };
  }): Promise<string> {
    const accessCode = this.generateAccessCode();

    const orgRef = await addDoc(this.colRef, {
      ...params.organization,
      accessCode,
      active: params.organization.active ?? true,
      ownerUid: params.owner.uid,
      ownerEmail: params.owner.email,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const userRef = doc(this.afs, `users/${params.owner.uid}`);
    const ownerUser: SuperAdminUser = {
      uid: params.owner.uid,
      email: params.owner.email,
      displayName: params.owner.displayName ?? '',
      role: 'admin',
      orgId: orgRef.id,
      orgType: params.organization.type,
      active: true,
    };

    await setDoc(
      userRef,
      {
        ...ownerUser,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    await this.logs.audit({
      action: 'CREATE_ORGANIZATION_WITH_OWNER',
      targetType: 'organization',
      targetId: orgRef.id,
      actorUid: params.actor?.uid,
      actorEmail: params.actor?.email,
      message: `Organization ${params.organization.name} created with owner ${params.owner.email}`,
      meta: {
        orgName: params.organization.name,
        orgType: params.organization.type,
        plan: params.organization.plan,
        ownerUid: params.owner.uid,
        ownerEmail: params.owner.email,
      },
    });

    return orgRef.id;
  }

  async update(
    id: string,
    payload: Partial<SuperAdminOrganization>,
    actor?: { uid?: string; email?: string }
  ): Promise<void> {
    const ref = doc(this.afs, `organizations/${id}`);
    await updateDoc(ref, {
      ...payload,
      updatedAt: serverTimestamp(),
    });

    await this.logs.audit({
      action: 'UPDATE_ORGANIZATION',
      targetType: 'organization',
      targetId: id,
      actorUid: actor?.uid,
      actorEmail: actor?.email,
      message: `Organization updated`,
      meta: payload,
    });
  }

  async editOrganization(
    id: string,
    payload: Partial<SuperAdminOrganization>,
    actor?: { uid?: string; email?: string }
  ): Promise<void> {
    return this.update(id, payload, actor);
  }

  async delete(
    id: string,
    actor?: { uid?: string; email?: string }
  ): Promise<void> {
    const ref = doc(this.afs, `organizations/${id}`);
    await deleteDoc(ref);

    await this.logs.audit({
      action: 'DELETE_ORGANIZATION',
      targetType: 'organization',
      targetId: id,
      actorUid: actor?.uid,
      actorEmail: actor?.email,
      message: `Organization deleted`,
      severity: 'warning',
    });
  }

  async assignCourseToOrganization(params: {
    orgId: string;
    courseId: string;
    actor?: { uid?: string; email?: string };
  }): Promise<string> {
    await this.platformCourses.assignCourseToOrganization(params.orgId, params.courseId, params.actor);
    const assignmentId = `${params.orgId}_${params.courseId}`;

    await this.logs.audit({
      action: 'ASSIGN_COURSE_TO_ORGANIZATION',
      targetType: 'organizationCourseAssignment',
      targetId: assignmentId,
      actorUid: params.actor?.uid,
      actorEmail: params.actor?.email,
      message: `Course assigned to organization`,
      meta: {
        orgId: params.orgId,
        courseId: params.courseId,
      },
    });

    return assignmentId;
  }

  listAssignmentsForOrg(orgId: string): Observable<OrganizationCourseAssignment[]> {
    const q = query(collection(this.afs, 'organizationCourseAssignments'));
    return collectionData(q, { idField: 'id' }).pipe(
      map((rows: any[]) => rows.filter((x) => x.orgId === orgId))
    ) as Observable<OrganizationCourseAssignment[]>;
  }

  getOrganizationUsers(orgId: string): Observable<SuperAdminUser[]> {
    const orgUsersRef = collection(this.afs, `organizations/${orgId}/users`);
    const globalUsersRef = collectionData(this.usersColRef, { idField: 'uid' }).pipe(
      map((rows: any[]) =>
        rows
          .filter((u) => u.orgId === orgId)
          .map((u) => ({ ...(u as SuperAdminUser), uid: u.uid || u.id }))
      )
    ) as Observable<SuperAdminUser[]>;

    const scopedUsersRef = collectionData(orgUsersRef, { idField: 'uid' }).pipe(
      map((rows: any[]) =>
        rows.map((u) => ({
          ...(u as SuperAdminUser),
          uid: u.uid || u.id,
          orgId,
        }))
      )
    ) as Observable<SuperAdminUser[]>;

    return combineLatest([globalUsersRef, scopedUsersRef]).pipe(
      map(([globalRows, scopedRows]) => {
        const byUid = new Map<string, SuperAdminUser>();
        for (const row of globalRows) byUid.set(row.uid, row);
        for (const row of scopedRows) {
          const prev = byUid.get(row.uid);
          byUid.set(row.uid, { ...prev, ...row });
        }
        return Array.from(byUid.values()).sort((a, b) =>
          (a.displayName || a.email || '').localeCompare(b.displayName || b.email || '')
        );
      })
    );
  }

  getAssignedCoursesForOrganization(orgId: string): Observable<OrganizationAssignedCourse[]> {
    return this.orgCourses.listAssigned(orgId);
  }

  getOrganizationPolicies(orgId: string): Observable<OrganizationPolicy[]> {
    const ref = collection(this.afs, `organizations/${orgId}/policies`);
    return collectionData(ref, { idField: 'id' }).pipe(
      map((rows: any[]) => rows.map((x) => ({ ...(x as OrganizationPolicy), id: x.id })))
    ) as Observable<OrganizationPolicy[]>;
  }

  getOrganizationWoundLibrary(orgId: string): Observable<OrganizationWoundLibraryItem[]> {
    const ref = collection(this.afs, `organizations/${orgId}/woundLibrary`);
    return collectionData(ref, { idField: 'id' }).pipe(
      map((rows: any[]) => rows.map((x) => ({ ...(x as OrganizationWoundLibraryItem), id: x.id })))
    ) as Observable<OrganizationWoundLibraryItem[]>;
  }

  getOrganizationProgressOverview(orgId: string): Observable<OrganizationProgressSummary> {
    const enrollmentsRef = collection(this.afs, `organizations/${orgId}/enrollments`);
    const progressRef = collection(this.afs, `organizations/${orgId}/progress`);

    const enrollments$ = collectionData(enrollmentsRef, { idField: 'id' });
    const progress$ = collectionData(progressRef, { idField: 'id' });

    return combineLatest([enrollments$, progress$]).pipe(
      map(([enrollments, progressRows]: any[]) => {
        const totalEnrollments = enrollments.length;
        const completedEnrollments = enrollments.filter((x: any) => x.status === 'completed').length;
        const inProgressEnrollments = enrollments.filter((x: any) => x.status === 'in-progress').length;

        const pctValues = progressRows
          .map((x: any) => Number(x.progressPct ?? x.percent ?? 0))
          .filter((x: number) => Number.isFinite(x));
        const avg = pctValues.length
          ? Math.round((pctValues.reduce((sum: number, x: number) => sum + x, 0) / pctValues.length) * 10) / 10
          : totalEnrollments
            ? Math.round((completedEnrollments / totalEnrollments) * 1000) / 10
            : 0;

        const completionRate = totalEnrollments
          ? Math.round((completedEnrollments / totalEnrollments) * 1000) / 10
          : 0;

        return {
          totalEnrollments,
          completedEnrollments,
          inProgressEnrollments,
          completionRate,
          progressCompletionAverage: avg,
        } as OrganizationProgressSummary & { progressCompletionAverage: number };
      }),
      map((x: any) => ({
        totalEnrollments: x.totalEnrollments,
        completedEnrollments: x.completedEnrollments,
        inProgressEnrollments: x.inProgressEnrollments,
        completionRate: x.completionRate,
      }))
    );
  }

  getOrganizationStats(orgId: string): Observable<OrganizationStatsViewModel> {
    return combineLatest([
      this.getOrganizationUsers(orgId),
      this.getAssignedCoursesForOrganization(orgId),
      collectionData(collection(this.afs, `organizations/${orgId}/enrollments`), { idField: 'id' }),
      collectionData(collection(this.afs, `organizations/${orgId}/progress`), { idField: 'id' }),
      this.getOrganizationPolicies(orgId),
      this.getOrganizationWoundLibrary(orgId),
    ]).pipe(
      map(([users, assignedCourses, enrollments, progressRows, policies, woundLibrary]: any[]) => {
        const activeUsers = users.filter((u: SuperAdminUser) => u.active !== false).length;
        const progressValues = progressRows
          .map((x: any) => Number(x.progressPct ?? x.percent ?? 0))
          .filter((x: number) => Number.isFinite(x));

        const progressCompletionAverage = progressValues.length
          ? Math.round((progressValues.reduce((sum: number, x: number) => sum + x, 0) / progressValues.length) * 10) / 10
          : 0;

        return {
          totalUsers: users.length,
          activeUsers,
          assignedCourses: assignedCourses.length,
          totalEnrollments: enrollments.length,
          progressCompletionAverage,
          policiesCount: policies.length,
          woundLibraryCount: woundLibrary.length,
        } satisfies OrganizationStatsViewModel;
      })
    );
  }

  getOrganizationDetailsViewModel(orgId: string): Observable<OrganizationDetailsViewModel | null> {
    return combineLatest([
      this.getOrganizationById(orgId),
      this.getOrganizationStats(orgId),
      this.getOrganizationUsers(orgId),
      this.getAssignedCoursesForOrganization(orgId),
      this.getOrganizationProgressOverview(orgId),
      this.getOrganizationPolicies(orgId),
      this.getOrganizationWoundLibrary(orgId),
    ]).pipe(
      map(([organization, stats, users, assignedCourses, progress, policies, woundLibrary]) => {
        if (!organization) return null;
        return {
          organization,
          stats,
          users,
          assignedCourses,
          progress,
          policies,
          woundLibrary,
        } satisfies OrganizationDetailsViewModel;
      })
    );
  }

  getOrganizationsWithStats(): Observable<OrganizationListRowViewModel[]> {
    return this.list().pipe(
      map((organizations) => organizations.filter((org) => !!org.id)),
      map((organizations) => {
        if (!organizations.length) return [];
        return organizations;
      }),
      map((organizations) => organizations as SuperAdminOrganization[]),
      map((organizations) =>
        organizations.map((organization) => ({
          organization,
          usersCount: 0,
          assignedCoursesCount: 0,
        }))
      ),
      map((rows) => rows.sort((a, b) => (a.organization.name || '').localeCompare(b.organization.name || '')))
    );
  }

  getOrganizationsWithStatsLive(): Observable<OrganizationListRowViewModel[]> {
    return combineLatest([
      this.list(),
      collectionData(this.usersColRef, { idField: 'uid' }),
      collectionData(this.assignmentColRef, { idField: 'id' }),
    ]).pipe(
      map(([organizations, usersRaw, assignmentsRaw]: any[]) => {
        const usersByOrg = new Map<string, number>();
        for (const user of usersRaw) {
          const orgId = String(user.orgId || '');
          if (!orgId) continue;
          usersByOrg.set(orgId, (usersByOrg.get(orgId) || 0) + 1);
        }

        const coursesByOrg = new Map<string, Set<string>>();
        for (const assignment of assignmentsRaw) {
          const orgId = String(assignment.orgId || '');
          const courseId = String(assignment.courseId || '');
          if (!orgId || !courseId) continue;
          if (!coursesByOrg.has(orgId)) coursesByOrg.set(orgId, new Set<string>());
          coursesByOrg.get(orgId)!.add(courseId);
        }

        return organizations.map((organization: SuperAdminOrganization) => {
          const orgId = organization.id || '';
          return {
            organization,
            usersCount: usersByOrg.get(orgId) || 0,
            assignedCoursesCount: coursesByOrg.get(orgId)?.size || 0,
          } satisfies OrganizationListRowViewModel;
        });
      })
    );
  }

  
}
