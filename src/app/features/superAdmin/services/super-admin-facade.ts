import { Injectable, inject } from '@angular/core';
import { Firestore, collection } from '@angular/fire/firestore';
import { getCountFromServer, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { SuperAdminDashboardStats, SuperAdminRegistration } from '../models/super-admin.models';


@Injectable({ providedIn: 'root' })
export class SuperAdminDashboardService {
  private afs = inject(Firestore);

  async getStats(): Promise<SuperAdminDashboardStats> {
    const orgsRef = collection(this.afs, 'organizations');
    const usersRef = collection(this.afs, 'users');
    const billingRef = collection(this.afs, 'billingRecords');
    const logsRef = collection(this.afs, 'adminLogs');

    const [
      orgsSnap,
      activeOrgsSnap,
      usersSnap,
      activeUsersSnap,
      billingActiveSnap,
      criticalLogsSnap,
    ] = await Promise.all([
      getCountFromServer(orgsRef),
      getCountFromServer(query(orgsRef, where('active', '==', true))),
      getCountFromServer(usersRef),
      getCountFromServer(query(usersRef, where('active', '==', true))),
      getCountFromServer(query(billingRef, where('status', '==', 'active'))),
      getCountFromServer(query(logsRef, where('severity', '==', 'critical'))),
    ]);

    return {
      organizations: orgsSnap.data().count,
      activeOrganizations: activeOrgsSnap.data().count,
      users: usersSnap.data().count,
      activeUsers: activeUsersSnap.data().count,
      billingActive: billingActiveSnap.data().count,
      criticalLogs: criticalLogsSnap.data().count,
    };
  }

  async getRecentRegistrations(maxRows = 8): Promise<SuperAdminRegistration[]> {
    const registerRef = collection(this.afs, 'register');
    const snapshot = await getDocs(
      query(registerRef, orderBy('createdAt', 'desc'), limit(maxRows))
    );

    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<SuperAdminRegistration, 'id'>),
    }));
  }

  /**
   * Live alerts feed: recent users, enrollments, audit logs, payments
   * across all organizations. Used on the Super Admin dashboard.
   */
  async getRecentAlerts(maxRows = 10): Promise<{
    recentUsers: any[];
    recentEnrollments: any[];
    recentAuditLogs: any[];
    recentPayments: any[];
    countsByOrg: Record<string, number>;
  }> {
    const usersRef = collection(this.afs, 'users');
    const enrollRef = collection(this.afs, 'programEnrollments');
    const auditRef = collection(this.afs, 'auditLogs');
    const paymentsRef = collection(this.afs, 'paymentIntents');

    const [usersSnap, enrollSnap, auditSnap, paymentsSnap] = await Promise.all([
      getDocs(query(usersRef, orderBy('createdAt', 'desc'), limit(maxRows))).catch(() => null),
      getDocs(query(enrollRef, orderBy('createdAt', 'desc'), limit(maxRows))).catch(() => null),
      getDocs(query(auditRef, orderBy('createdAt', 'desc'), limit(maxRows))).catch(() => null),
      getDocs(query(paymentsRef, orderBy('createdAt', 'desc'), limit(maxRows))).catch(() => null),
    ]);

    const recentUsers = usersSnap?.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) ?? [];
    const recentEnrollments = enrollSnap?.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) ?? [];
    const recentAuditLogs = auditSnap?.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) ?? [];
    const recentPayments = paymentsSnap?.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) ?? [];

    const countsByOrg: Record<string, number> = {};
    for (const u of recentUsers) {
      const org = u.orgId || 'unassigned';
      countsByOrg[org] = (countsByOrg[org] || 0) + 1;
    }
    for (const e of recentEnrollments) {
      const org = e.orgId || 'unassigned';
      countsByOrg[org] = (countsByOrg[org] || 0) + 1;
    }

    return { recentUsers, recentEnrollments, recentAuditLogs, recentPayments, countsByOrg };
  }
}