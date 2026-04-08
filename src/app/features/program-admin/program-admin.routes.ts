import { Routes } from '@angular/router';

export const PROGRAM_ADMIN_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./program-admin-shell.component').then((m) => m.ProgramAdminShellComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/program-admin-dashboard.page').then(
            (m) => m.ProgramAdminDashboardPage
          ),
      },
      {
        path: 'programs',
        loadComponent: () =>
          import('./programs/programs-management.page').then(
            (m) => m.ProgramsManagementPage
          ),
      },
      {
        path: 'programs/new',
        loadComponent: () =>
          import('./programs/program-create.page').then((m) => m.ProgramCreatePage),
      },
      {
        path: 'programs/:id/edit',
        loadComponent: () =>
          import('./programs/program-edit.page').then((m) => m.ProgramEditPage),
      },
      {
        path: 'enrollments',
        loadComponent: () =>
          import('./enrollments/program-enrollments.page').then(
            (m) => m.ProgramEnrollmentsPage
          ),
      },
      {
        path: 'enrollments/:id',
        loadComponent: () =>
          import('./enrollments/program-enrollment-detail.page').then(
            (m) => m.ProgramEnrollmentDetailPage
          ),
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import('./analytics/program-analytics.page').then((m) => m.ProgramAnalyticsPage),
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
];
