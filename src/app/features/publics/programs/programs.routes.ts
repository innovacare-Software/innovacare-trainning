import { Routes } from '@angular/router';
import { authenticatedGuard } from '../../../core/auth-guard';
import { programLearnerGuard } from '../../../core/program-learner.guard';

export const PROGRAMS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./programs-page.component').then((m) => m.ProgramsPageComponent),
  },
  {
    path: ':programId',
    loadComponent: () =>
      import('./program-detail-page.component').then(
        (m) => m.ProgramDetailPageComponent
      ),
  },
  {
    path: ':programId/enroll',
    canActivate: [authenticatedGuard],
    loadComponent: () =>
      import('./program-booking-page.component').then(
        (m) => m.ProgramBookingPageComponent
      ),
  },
  {
    path: ':programId/dashboard',
    canActivate: [authenticatedGuard, programLearnerGuard],
    loadComponent: () =>
      import('./user-program-dashboard.page').then(
        (m) => m.UserProgramDashboardPage
      ),
  },
];
