import { Routes } from '@angular/router';
import { authenticatedGuard } from '../../../../core/auth-guard';

export const LEARNER_SPACE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./learner-space-shell.component').then((m) => m.LearnerSpaceShellComponent),
    canActivate: [authenticatedGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/learner-dashboard.page').then((m) => m.LearnerDashboardPage),
      },
      {
        path: 'modules',
        loadComponent: () =>
          import('./modules/modules-list.page').then((m) => m.ModulesListPage),
      },
      {
        path: 'modules/:moduleId',
        loadComponent: () =>
          import('./modules/module-detail.page').then((m) => m.ModuleDetailPage),
      },
      {
        path: 'lessons/:lessonId',
        loadComponent: () =>
          import('./lessons/lesson-player.page').then((m) => m.LessonPlayerPage),
      },
      {
        path: 'documents',
        loadComponent: () =>
          import('./documents/documents.page').then((m) => m.DocumentsPage),
      },
      {
        path: 'live-sessions',
        loadComponent: () =>
          import('./live-sessions/live-sessions.page').then((m) => m.LiveSessionsPage),
      },
      {
        path: 'assessments',
        loadComponent: () =>
          import('./assessments/assessments-list.page').then((m) => m.AssessmentsListPage),
      },
      {
        path: 'assessments/:assessmentId',
        loadComponent: () =>
          import('./assessments/assessment-runner.page').then((m) => m.AssessmentRunnerPage),
      },
      {
        path: 'simulations',
        loadComponent: () =>
          import('./simulations/simulations-list.page').then((m) => m.SimulationsListPage),
      },
      {
        path: 'simulations/:simulationId',
        loadComponent: () =>
          import('./simulations/simulation-runner.page').then((m) => m.SimulationRunnerPage),
      },
      {
        path: 'case-studies',
        loadComponent: () =>
          import('./case-studies/case-studies-list.page').then((m) => m.CaseStudiesListPage),
      },
      {
        path: 'case-studies/:caseStudyId',
        loadComponent: () =>
          import('./case-studies/case-study-detail.page').then((m) => m.CaseStudyDetailPage),
      },
      {
        path: 'resources',
        loadComponent: () =>
          import('./resources/resources.page').then((m) => m.ResourcesPage),
      },
    ],
  },
];
