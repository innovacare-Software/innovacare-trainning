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
        path: 'videos',
        loadComponent: () =>
          import('./videos/video-library.page').then((m) => m.VideoLibraryPage),
      },
      {
        path: 'videos/:lessonId',
        loadComponent: () =>
          import('./videos/video-library-detail.page').then((m) => m.VideoLibraryDetailPage),
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
        path: 'assessments/classic/:assessmentId',
        loadComponent: () =>
          import('./assessments/assessment-runner.page').then((m) => m.AssessmentRunnerPage),
      },
      {
        path: 'assessments/:assessmentId',
        loadComponent: () =>
          import('./assessments/assessment-exam-redirect.page').then((m) => m.AssessmentExamRedirectPage),
      },
      {
        path: 'exam-prep',
        loadComponent: () =>
          import('./exam-prep/exam-prep-list.page').then((m) => m.ExamPrepListPage),
      },
      {
        path: 'exam-prep/timeout/:attemptId',
        loadComponent: () =>
          import('./exam-prep/exam-prep-timeout.page').then((m) => m.ExamPrepTimeoutPage),
      },
      {
        path: 'exam-prep/:assessmentId',
        loadComponent: () =>
          import('./exam-prep/exam-prep-launch.page').then((m) => m.ExamPrepLaunchPage),
      },
      {
        path: 'exam-prep/:assessmentId/rules',
        loadComponent: () =>
          import('./exam-prep/exam-prep-rules.page').then((m) => m.ExamPrepRulesPage),
      },
      {
        path: 'exam-prep/:assessmentId/session',
        loadComponent: () =>
          import('./exam-prep/exam-prep-session.page').then((m) => m.ExamPrepSessionPage),
      },
      {
        path: 'exam-prep/:assessmentId/archer',
        loadComponent: () =>
          import('../../../exam-engine/archer-exam-engine.component').then(
            (m) => m.ArcherExamEngineComponent
          ),
      },
      {
        path: 'exam-prep/:assessmentId/review',
        loadComponent: () =>
          import('./exam-prep/exam-prep-review.page').then((m) => m.ExamPrepReviewPage),
      },
      {
        path: 'exam-prep/results/:attemptId',
        loadComponent: () =>
          import('./exam-prep/exam-prep-results.page').then((m) => m.ExamPrepResultsPage),
      },
      {
        path: 'simulations',
        loadComponent: () =>
          import('./simulations/simulations-list.page').then((m) => m.SimulationsListPage),
      },
      {
        path: 'simulations/classic/:simulationId',
        loadComponent: () =>
          import('./simulations/simulation-runner.page').then((m) => m.SimulationRunnerPage),
      },
      {
        path: 'simulations/:simulationId',
        loadComponent: () =>
          import('./simulations/simulation-exam-redirect.page').then((m) => m.SimulationExamRedirectPage),
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
        path: 'labs',
        loadComponent: () =>
          import('./labs/program-labs.page').then((m) => m.ProgramLabsPage),
      },
      {
        path: 'study-calendar',
        loadComponent: () =>
          import('./study-calendar/study-calendar.page').then((m) => m.StudyCalendarPage),
      },
      {
        path: 'wallet/add-credits',
        loadComponent: () =>
          import('./wallet/add-credits.page').then((m) => m.AddCreditsPage),
      },
      {
        path: 'wallet',
        loadComponent: () =>
          import('./wallet/wallet.page').then((m) => m.WalletPage),
      },
      {
        path: 'order-history',
        loadComponent: () =>
          import('./order-history/order-history.page').then((m) => m.OrderHistoryPage),
      },
      {
        path: 'explore-products',
        loadComponent: () =>
          import('./explore-products/explore-products.page').then((m) => m.ExploreProductsPage),
      },
      {
        path: 'resources',
        loadComponent: () =>
          import('./resources/resources.page').then((m) => m.ResourcesPage),
      },
      {
        path: 'assistant',
        loadComponent: () =>
          import('../../../learner/assistant/learner-assistant.page').then((m) => m.LearnerAssistantPage),
      },
    ],
  },
];
