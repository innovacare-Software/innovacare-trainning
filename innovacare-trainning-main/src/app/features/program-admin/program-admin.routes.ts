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
      // ---- Content Builder Routes ----
      {
        path: 'programs/:programId/content',
        loadComponent: () =>
          import('./content/dashboard/program-content-dashboard.page').then(
            (m) => m.ProgramContentDashboardPage
          ),
      },
      {
        path: 'programs/:programId/modules',
        loadComponent: () =>
          import('./content/modules/modules-list.page').then((m) => m.ModulesListPage),
      },
      {
        path: 'programs/:programId/modules/new',
        loadComponent: () =>
          import('./content/modules/module-form.page').then((m) => m.ModuleFormPage),
      },
      {
        path: 'programs/:programId/modules/:moduleId/edit',
        loadComponent: () =>
          import('./content/modules/module-form.page').then((m) => m.ModuleFormPage),
      },
      {
        path: 'programs/:programId/lessons',
        loadComponent: () =>
          import('./content/lessons/lessons-list.page').then((m) => m.LessonsListPage),
      },
      {
        path: 'programs/:programId/lessons/new',
        loadComponent: () =>
          import('./content/lessons/lesson-form.page').then((m) => m.LessonFormPage),
      },
      {
        path: 'programs/:programId/lessons/:lessonId/edit',
        loadComponent: () =>
          import('./content/lessons/lesson-form.page').then((m) => m.LessonFormPage),
      },
      {
        path: 'programs/:programId/documents',
        loadComponent: () =>
          import('./content/documents/documents-list.page').then((m) => m.DocumentsListPage),
      },
      {
        path: 'programs/:programId/documents/new',
        loadComponent: () =>
          import('./content/documents/document-form.page').then((m) => m.DocumentFormPage),
      },
      {
        path: 'programs/:programId/documents/:documentId/edit',
        loadComponent: () =>
          import('./content/documents/document-form.page').then((m) => m.DocumentFormPage),
      },
      {
        path: 'programs/:programId/live-sessions',
        loadComponent: () =>
          import('./content/live-sessions/live-sessions-list.page').then(
            (m) => m.LiveSessionsListPage
          ),
      },
      {
        path: 'programs/:programId/live-sessions/new',
        loadComponent: () =>
          import('./content/live-sessions/live-session-form.page').then(
            (m) => m.LiveSessionFormPage
          ),
      },
      {
        path: 'programs/:programId/live-sessions/:sessionId/edit',
        loadComponent: () =>
          import('./content/live-sessions/live-session-form.page').then(
            (m) => m.LiveSessionFormPage
          ),
      },
      {
        path: 'programs/:programId/assessments',
        loadComponent: () =>
          import('./content/assessments/assessments-list.page').then(
            (m) => m.AssessmentsListPage
          ),
      },
      {
        path: 'programs/:programId/assessments/new',
        loadComponent: () =>
          import('./content/assessments/assessment-form.page').then((m) => m.AssessmentFormPage),
      },
      {
        path: 'programs/:programId/assessments/:assessmentId/edit',
        loadComponent: () =>
          import('./content/assessments/assessment-form.page').then((m) => m.AssessmentFormPage),
      },
      {
        path: 'programs/:programId/simulations',
        loadComponent: () =>
          import('./content/simulations/simulations-list.page').then(
            (m) => m.SimulationsListPage
          ),
      },
      {
        path: 'programs/:programId/simulations/new',
        loadComponent: () =>
          import('./content/simulations/simulation-form.page').then((m) => m.SimulationFormPage),
      },
      {
        path: 'programs/:programId/simulations/:simulationId/edit',
        loadComponent: () =>
          import('./content/simulations/simulation-form.page').then((m) => m.SimulationFormPage),
      },
      {
        path: 'programs/:programId/case-studies',
        loadComponent: () =>
          import('./content/case-studies/case-studies-list.page').then(
            (m) => m.CaseStudiesListPage
          ),
      },
      {
        path: 'programs/:programId/case-studies/new',
        loadComponent: () =>
          import('./content/case-studies/case-study-form.page').then((m) => m.CaseStudyFormPage),
      },
      {
        path: 'programs/:programId/case-studies/:caseStudyId/edit',
        loadComponent: () =>
          import('./content/case-studies/case-study-form.page').then((m) => m.CaseStudyFormPage),
      },
      {
        path: 'programs/:programId/resources',
        loadComponent: () =>
          import('./content/resources/resources.page').then((m) => m.ResourcesPage),
      },
      {
        path: 'programs/:programId/preview',
        loadComponent: () =>
          import('./content/preview/program-preview.page').then((m) => m.ProgramPreviewPage),
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
];
