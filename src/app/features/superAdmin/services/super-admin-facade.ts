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
}