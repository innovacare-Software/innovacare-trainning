import { Routes } from '@angular/router';
import { roleCanMatch } from '../../core/role.canmatch';

export const SUPER_ADMIN_ROUTES: Routes = [
  {
    path: '',
    canMatch: [roleCanMatch(['super_admin'])],
    loadComponent: () =>
      import('./shell/shell').then(m => m.Shell),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/dashboard').then(m => m.Dashboard),
      },
      {
        path: 'communication-center',
        loadChildren: () =>
          import('../communication-center/communication-center.routes').then(m => m.COMMUNICATION_CENTER_ROUTES),
      },
      {
        path: 'organizations',
        loadComponent: () =>
          import('./organizations/organizations').then(m => m.Organizations),
      },
      {
        path: 'setup',
        loadComponent: () =>
          import('./setup/setup').then(m => m.Setup),
      },
      {
  path: 'users',
  loadComponent: () =>
    import('./users/users').then(m => m.Users),
},
      {
        path: 'billing',
        loadComponent: () =>
          import('./billing/billing').then(m => m.Billing),
      },
      {
        path: 'logs',
        loadComponent: () =>
          import('./log/log').then(m => m.Log),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./settings/settings').then(m => m.Settings),
      },
      {
        path: 'organizations/create',
        loadComponent: () =>
          import('./organizationsPage/create/create').then(m => m.Create),
      },
      {
        path: 'organizations/:id/edit',
        loadComponent: () =>
          import('./organizationsPage/edit/edit').then(m => m.Edit),
      },
      {
        path: 'organizations/:id/delete',
        loadComponent: () =>
          import('./organizationsPage/delete/delete').then(m => m.Delete),
      },
      {
        path: 'organizations/:orgId',
        loadComponent: () =>
          import('./organizationsPage/org-details/org-details').then(m => m.OrgDetails),
      },
      {
        path: 'organizations/:orgId/assign-courses',
        loadComponent: () =>
          import('./organizationsPage/course-assign/course-assign').then(m => m.CourseAssign),
      },
      {
        path: 'organizations/:orgId/users',
        loadComponent: () =>
          import('./organizationsPage/org-users/org-users.page').then(m => m.OrgUsersPage),
      },
      {
        path: 'organizations/:orgId/progress',
        loadComponent: () =>
          import('./organizationsPage/org-progress/org-progress.page').then(m => m.OrgProgressPage),
      },
      {
        path: 'organizations/:orgId/policies',
        loadComponent: () =>
          import('./organizationsPage/org-policies/org-policies.page').then(m => m.OrgPoliciesPage),
      },
      {
        path: 'organizations/:orgId/wound-library',
        loadComponent: () =>
          import('./organizationsPage/org-wound-library/org-wound-library.page').then(m => m.OrgWoundLibraryPage),
      },
      {
        path: 'organizations/:orgId/reports',
        loadComponent: () =>
          import('./organizationsPage/org-reports/org-reports.page').then(m => m.OrgReportsPage),
      },
      {
        path: 'organizations/:orgId/audit',
        loadComponent: () =>
          import('./organizationsPage/org-audit/org-audit.page').then(m => m.OrgAuditPage),
      },
      {
        path: 'organizations/:orgId/troubleshooting',
        loadComponent: () =>
          import('./organizationsPage/org-troubleshooting/org-troubleshooting.page').then(m => m.OrgTroubleshootingPage),
      },
      {
        path: 'course-assignments',
        redirectTo: 'organizations',
        pathMatch: 'full',
      },
      {
        path: 'marketplace/publish',
        loadComponent: () =>
          import('../manager/marketplace-publish/marketplace-publish.component').then(m => m.MarketplacePublishComponent),
      },
      {
        path: 'policy/new',
        loadComponent: () =>
          import('../manager/policy-admin-editor.page/policy-admin-editor.page').then(m => m.PolicyAdminEditorPage),
      },
      {
        path: 'policy/create',
        redirectTo: 'policy/new',
        pathMatch: 'full',
      },
      {
        path: 'policy/:id/edit',
        loadComponent: () =>
          import('../manager/policy-admin-editor.page/policy-admin-editor.page').then(m => m.PolicyAdminEditorPage),
      },
      {
        path: 'courses/new',
        loadComponent: () =>
          import('../manager/courses/courses').then(m => m.Courses),
      },
      {
        path: 'courses/create',
        redirectTo: 'courses/new',
        pathMatch: 'full',
      },
      {
        path: 'courses/:id/edit',
        loadComponent: () =>
          import('../manager/courses/courses').then(m => m.Courses),
      },
      {
        path: 'wounds/new',
        loadComponent: () =>
          import('../manager/add-wound/add-wound').then(m => m.AddWound),
      },
      {
        path: 'wound-report',
        loadComponent: () =>
          import('../manager/reports/reports').then(m => m.Reports),
      },
      {
        path: '**',
        redirectTo: 'dashboard',
      },
    ],
  },
];