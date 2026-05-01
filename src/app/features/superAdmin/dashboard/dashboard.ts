import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SuperAdminDashboardStats, SuperAdminRegistration } from '../models/super-admin.models';
import { SuperAdminDashboardService } from '../services/super-admin-facade';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [ CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
})
export class Dashboard {

  cards = [
    { label: 'Organizations', value: 0 },
    { label: 'Users', value: 0 },
    { label: 'Courses', value: 0 },
    { label: 'Active Plans', value: 0 },
  ];

   private dashboardSvc = inject(SuperAdminDashboardService);

  loading = signal(true);
  stats = signal<SuperAdminDashboardStats>({
    organizations: 0,
    users: 0,
    activeOrganizations: 0,
    activeUsers: 0,
    billingActive: 0,
    criticalLogs: 0,
  });
  registrations = signal<SuperAdminRegistration[]>([]);
  healthIndicators = signal<any[]>([]);
  recentActivities = signal<any[]>([]);

  readonly chartRows = computed(() => {
    const s = this.stats();
    const orgRatio = s.organizations > 0 ? Math.round((s.activeOrganizations / s.organizations) * 100) : 0;
    const userRatio = s.users > 0 ? Math.round((s.activeUsers / s.users) * 100) : 0;
    const billingRatio = s.organizations > 0 ? Math.round((s.billingActive / s.organizations) * 100) : 0;
    const alertPressure = s.users > 0 ? Math.min(100, Math.round((s.criticalLogs / s.users) * 100)) : 0;
    return [
      { label: 'Active Orgs', value: orgRatio, color: 'linear-gradient(90deg, #177f63 0%, #24a87e 100%)' },
      { label: 'Active Users', value: userRatio, color: 'linear-gradient(90deg, #235f98 0%, #2f83c8 100%)' },
      { label: 'Billing Coverage', value: billingRatio, color: 'linear-gradient(90deg, #5b43ad 0%, #7f66d6 100%)' },
      { label: 'Critical Alert Pressure', value: alertPressure, color: 'linear-gradient(90deg, #9b3b3b 0%, #cf5454 100%)' },
    ];
  });

  async ngOnInit(): Promise<void> {
    try {
      const [stats, registrations] = await Promise.all([
        this.dashboardSvc.getStats(),
        this.dashboardSvc.getRecentRegistrations(),
      ]);
      this.stats.set(stats);
      this.registrations.set(registrations);
      this.healthIndicators.set([
        { name: 'Auth and onboarding', status: registrations.length ? 'healthy' : 'monitoring' },
        { name: 'Registration intake', status: 'healthy' },
        { name: 'Billing signal', status: stats.billingActive > 0 ? 'healthy' : 'monitoring' },
      ]);
      this.recentActivities.set([
        `${registrations.length} recent registrations available for review`,
        `${stats.activeOrganizations} organizations currently active`,
        `${stats.criticalLogs} critical alerts flagged across the platform`,
      ]);
    } finally {
      this.loading.set(false);
    }
  }

  formatTimestamp(value: any): string {
    const raw = typeof value?.toDate === 'function' ? value.toDate() : value;
    const date = raw instanceof Date ? raw : new Date(raw);
    return Number.isNaN(date.getTime()) ? 'Pending timestamp' : date.toLocaleString();
  }

}