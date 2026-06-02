import { Routes } from '@angular/router';
import { isOrgAdminGuard } from '../../core/organization/org.guards';

export const ORG_ADMIN_ROUTES: Routes = [
  {
    path: '',
    canMatch: [isOrgAdminGuard],
    loadComponent: () => import('./org-admin-shell.component').then((m) => m.OrgAdminShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard/org-admin-dashboard.page').then((m) => m.OrgAdminDashboardPage) },
      {
        path: 'communication-center',
        loadChildren: () => import('../communication-center/communication-center.routes').then((m) => m.COMMUNICATION_CENTER_ROUTES),
      },
      { path: 'users', loadComponent: () => import('./pages/users/org-admin-users.page').then((m) => m.OrgAdminUsersPage) },
      { path: 'users/:uid', loadComponent: () => import('./pages/users/org-admin-user-detail.page').then((m) => m.OrgAdminUserDetailPage) },
      { path: 'courses', loadComponent: () => import('./pages/courses/org-admin-courses.page').then((m) => m.OrgAdminCoursesPage) },
      { path: 'assignments', loadComponent: () => import('./pages/assignments/org-admin-assignments.page').then((m) => m.OrgAdminAssignmentsPage) },
      { path: 'progress', loadComponent: () => import('./pages/progress/org-admin-progress.page').then((m) => m.OrgAdminProgressPage) },
      { path: 'overdue', loadComponent: () => import('./pages/overdue/org-admin-overdue.page').then((m) => m.OrgAdminOverduePage) },
      { path: 'policies', loadComponent: () => import('./pages/policies/org-admin-policies.page').then((m) => m.OrgAdminPoliciesPage) },
      { path: 'wound-library', loadComponent: () => import('./pages/wound-library/org-admin-wound-library.page').then((m) => m.OrgAdminWoundLibraryPage) },
      { path: 'reports', loadComponent: () => import('./pages/reports/org-admin-reports.page').then((m) => m.OrgAdminReportsPage) },
      { path: 'audit', loadComponent: () => import('./pages/audit/org-admin-audit.page').then((m) => m.OrgAdminAuditPage) },
      { path: 'alerts', loadComponent: () => import('./pages/alerts/org-admin-alerts.page').then((m) => m.OrgAdminAlertsPage) },
      { path: 'alerts/:id', loadComponent: () => import('./pages/alerts/org-admin-alerts.page').then((m) => m.OrgAdminAlertsPage) },
      { path: 'troubleshooting', loadComponent: () => import('./pages/troubleshooting/org-admin-troubleshooting.page').then((m) => m.OrgAdminTroubleshootingPage) },
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
];
