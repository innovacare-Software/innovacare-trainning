import { Routes } from '@angular/router';

export const EXAM_PREP_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/exam-prep-dashboard.page').then((m) => m.ExamPrepDashboardPage),
  },
  {
    path: 'question-bank',
    loadComponent: () => import('./pages/question-bank-manager.page').then((m) => m.QuestionBankManagerPage),
  },
  {
    path: 'question-bank/new',
    loadComponent: () => import('./pages/question-bank-editor.page').then((m) => m.QuestionBankEditorPage),
  },
  {
    path: 'question-bank/:itemId/edit',
    loadComponent: () => import('./pages/question-bank-editor.page').then((m) => m.QuestionBankEditorPage),
  },
  {
    path: 'case-studies/new',
    loadComponent: () => import('./pages/case-study-editor.page').then((m) => m.CaseStudyEditorPage),
  },
  {
    path: 'case-studies/:caseStudyId/edit',
    loadComponent: () => import('./pages/case-study-editor.page').then((m) => m.CaseStudyEditorPage),
  },
  {
    path: 'blueprints',
    loadComponent: () => import('./pages/blueprint-manager.page').then((m) => m.BlueprintManagerPage),
  },
  {
    path: 'blueprints/new',
    loadComponent: () => import('./pages/blueprint-editor.page').then((m) => m.BlueprintEditorPage),
  },
  {
    path: 'blueprints/:blueprintId/edit',
    loadComponent: () => import('./pages/blueprint-editor.page').then((m) => m.BlueprintEditorPage),
  },
  {
    path: 'assessments',
    loadComponent: () => import('./pages/assessment-manager.page').then((m) => m.AssessmentManagerPage),
  },
  {
    path: 'library-preview',
    loadComponent: () => import('./pages/exam-prep-library-preview.page').then((m) => m.ExamPrepLibraryPreviewPage),
  },
  {
    path: 'runtime',
    loadComponent: () => import('./pages/exam-prep-runtime-inspector.page').then((m) => m.ExamPrepRuntimeInspectorPage),
  },
  {
    path: 'assessments/new',
    loadComponent: () => import('./pages/assessment-editor.page').then((m) => m.AssessmentEditorPage),
  },
  {
    path: 'assessments/:assessmentId/edit',
    loadComponent: () => import('./pages/assessment-editor.page').then((m) => m.AssessmentEditorPage),
  },
];