import { Routes } from '@angular/router';
import { ContentShellComponent } from './content-shell.component';

export const CONTENT_ROUTES: Routes = [
  {
    path: '',
    component: ContentShellComponent,
    children: [
      {
        path: 'content',
        loadComponent: () =>
          import('./dashboard/program-content-dashboard.page').then((m) => m.ProgramContentDashboardPage),
      },
      {
        path: 'modules',
        loadComponent: () =>
          import('./modules/modules-list.page').then((m) => m.ModulesListPage),
      },
      {
        path: 'modules/new',
        loadComponent: () =>
          import('./modules/module-form.page').then((m) => m.ModuleFormPage),
      },
      {
        path: 'modules/:moduleId/edit',
        loadComponent: () =>
          import('./modules/module-form.page').then((m) => m.ModuleFormPage),
      },
      {
        path: 'lessons',
        loadComponent: () =>
          import('./lessons/lessons-list.page').then((m) => m.LessonsListPage),
      },
      {
        path: 'lessons/new',
        loadComponent: () =>
          import('./lessons/lesson-form.page').then((m) => m.LessonFormPage),
      },
      {
        path: 'lessons/:lessonId/edit',
        loadComponent: () =>
          import('./lessons/lesson-form.page').then((m) => m.LessonFormPage),
      },
      {
        path: 'documents',
        loadComponent: () =>
          import('./documents/documents-list.page').then((m) => m.DocumentsListPage),
      },
      {
        path: 'documents/new',
        loadComponent: () =>
          import('./documents/document-form.page').then((m) => m.DocumentFormPage),
      },
      {
        path: 'documents/:documentId/edit',
        loadComponent: () =>
          import('./documents/document-form.page').then((m) => m.DocumentFormPage),
      },
      {
        path: 'live-sessions',
        loadComponent: () =>
          import('./live-sessions/live-sessions-list.page').then((m) => m.LiveSessionsListPage),
      },
      {
        path: 'live-sessions/new',
        loadComponent: () =>
          import('./live-sessions/live-session-form.page').then((m) => m.LiveSessionFormPage),
      },
      {
        path: 'live-sessions/:sessionId/edit',
        loadComponent: () =>
          import('./live-sessions/live-session-form.page').then((m) => m.LiveSessionFormPage),
      },
      {
        path: 'assessments',
        loadComponent: () =>
          import('./assessments/assessments-list.page').then((m) => m.AssessmentsListPage),
      },
      {
        path: 'assessments/new',
        loadComponent: () =>
          import('./assessments/assessment-form.page').then((m) => m.AssessmentFormPage),
      },
      {
        path: 'assessments/:assessmentId/edit',
        loadComponent: () =>
          import('./assessments/assessment-form.page').then((m) => m.AssessmentFormPage),
      },
      {
        path: 'simulations',
        loadComponent: () =>
          import('./simulations/simulations-list.page').then((m) => m.SimulationsListPage),
      },
      {
        path: 'simulations/new',
        loadComponent: () =>
          import('./simulations/simulation-form.page').then((m) => m.SimulationFormPage),
      },
      {
        path: 'simulations/:simulationId/edit',
        loadComponent: () =>
          import('./simulations/simulation-form.page').then((m) => m.SimulationFormPage),
      },
      {
        path: 'case-studies',
        loadComponent: () =>
          import('./case-studies/case-studies-list.page').then((m) => m.CaseStudiesListPage),
      },
      {
        path: 'case-studies/new',
        loadComponent: () =>
          import('./case-studies/case-study-form.page').then((m) => m.CaseStudyFormPage),
      },
      {
        path: 'case-studies/:caseStudyId/edit',
        loadComponent: () =>
          import('./case-studies/case-study-form.page').then((m) => m.CaseStudyFormPage),
      },
      {
        path: 'resources',
        loadComponent: () =>
          import('./resources/resources.page').then((m) => m.ResourcesPage),
      },
      {
        path: 'preview',
        loadComponent: () =>
          import('./preview/program-preview.page').then((m) => m.ProgramPreviewPage),
      },
      { path: '', pathMatch: 'full', redirectTo: 'content' },
    ],
  },
];
