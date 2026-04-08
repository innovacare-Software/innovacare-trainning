import { Routes } from '@angular/router';

export const ADMIN_PROGRAMS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./admin-programs-shell.component').then(
        (m) => m.AdminProgramsShellComponent
      ),
    children: [
      {
        path: 'programs',
        loadComponent: () =>
          import('./admin-programs-dashboard.page').then(
            (m) => m.AdminProgramsDashboardPage
          ),
      },
      {
        path: 'programs/list',
        loadComponent: () =>
          import('./admin-programs-list.page').then((m) => m.AdminProgramsListPage),
      },
      {
        path: 'programs/new',
        loadComponent: () =>
          import('./admin-program-create.page').then((m) => m.AdminProgramCreatePage),
      },
      {
        path: 'programs/:id/edit',
        loadComponent: () =>
          import('./admin-program-edit.page').then((m) => m.AdminProgramEditPage),
      },
      {
        path: 'enrollments',
        loadComponent: () =>
          import('./admin-program-enrollments-list.page').then(
            (m) => m.AdminProgramEnrollmentsListPage
          ),
      },
      {
        path: 'enrollments/:id',
        loadComponent: () =>
          import('./admin-program-enrollment-detail.page').then(
            (m) => m.AdminProgramEnrollmentDetailPage
          ),
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import('./program-admin-analytics.page').then(
            (m) => m.ProgramAdminAnalyticsPage
          ),
      },
      { path: '', pathMatch: 'full', redirectTo: 'programs' },
    ],
  },
];
