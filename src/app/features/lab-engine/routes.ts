import { Routes } from '@angular/router';
import { authenticatedGuard } from '../../core/auth-guard';
import { roleCanMatch } from '../../core/role.canmatch';

export const LAB_ENGINE_ROUTES: Routes = [
  // ── Learner: Lab Catalog ────────────────────────────────────────────────────
  {
    path: '',
    canActivate: [authenticatedGuard],
    loadComponent: () =>
      import('./pages/lab-catalog-page/lab-catalog-page.component').then(
        (m) => m.LabCatalogPageComponent,
      ),
  },

  // ── Learner: Lab Player (session) ───────────────────────────────────────────
  {
    path: ':labId/session/:sessionId',
    canActivate: [authenticatedGuard],
    loadComponent: () =>
      import('./pages/lab-player-page/lab-player-page.component').then(
        (m) => m.LabPlayerPageComponent,
      ),
  },
];

export const LAB_ADMIN_ROUTES: Routes = [
  // ── Admin: Lab List ─────────────────────────────────────────────────────────
  {
    path: '',
    canMatch: [roleCanMatch(['super_admin', 'admin', 'manager'])],
    loadComponent: () =>
      import('./pages/lab-admin-list-page/lab-admin-list-page.component').then(
        (m) => m.LabAdminListPageComponent,
      ),
  },

  // ── Admin: Lab Editor ───────────────────────────────────────────────────────
  {
    path: ':labId',
    canMatch: [roleCanMatch(['super_admin', 'admin', 'manager'])],
    loadComponent: () =>
      import('./pages/lab-admin-editor-page/lab-admin-editor-page.component').then(
        (m) => m.LabAdminEditorPageComponent,
      ),
  },
];

export const INSTRUCTOR_LAB_ROUTES: Routes = [
  // ── Instructor: Submission Review ───────────────────────────────────────────
  {
    path: '',
    canMatch: [roleCanMatch(['instructor', 'tutor', 'staff', 'super_admin', 'admin', 'manager'])],
    loadComponent: () =>
      import('./pages/lab-submission-review-page/lab-submission-review-page.component').then(
        (m) => m.LabSubmissionReviewPageComponent,
      ),
  },
];
