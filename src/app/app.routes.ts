import { Routes } from '@angular/router';
import { roleCanMatch } from './core/role.canmatch';
import { authenticatedGuard } from './core/auth-guard';
import { programLearnerGuard } from './core/program-learner.guard';
import { programAdminAreaCanMatch } from './features/program-admin/guards/program-admin.guard';
import { isOrgAdminGuard } from './core/organization/org.guards';


export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: '/home' },

  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login').then(m => m.LoginComponent)
  },

  {
    path: 'learner/courses/:courseId/exam/:examId',
    loadComponent: () =>
      import('./features/learner/exam-runner/exam-runner')
        .then(m => m.ExamRunnerComponent),
  },

  {
    path: 'reset',
    loadComponent: () =>
      import('./features/auth/reset/reset').then(m => m.ResetComponent)
  },

  {
    path: 'learner',
    canMatch: [roleCanMatch(['learner'])],
    loadChildren: () =>
      import('./features/learner/learner.routes').then(m => m.learnerRoutes)
  },

  {
    path: 'manager',
    canMatch: [roleCanMatch(['admin', 'manager'])],
    loadChildren: () =>
      import('./features/manager/manager.routes').then(m => m.ManagerRoutingModule)
  },

  {
    path: 'super-admin',
    canMatch: [roleCanMatch(['super_admin'])],
    loadChildren: () =>
        import('./features/superAdmin/super-admin.routes').then(m => m.SUPER_ADMIN_ROUTES)
    },

  {
    path: 'org-admin',
    canMatch: [isOrgAdminGuard],
    loadChildren: () =>
      import('./features/org-admin/org-admin.routes').then((m) => m.ORG_ADMIN_ROUTES),
  },

  {
    path: 'home',
    loadComponent: () =>
      import('./features/publics/training-landing/training-landing').then(
        (m) => m.TrainingLandingComponent
      ),
  },
   {
    path: 'fonctionnalites',
    loadComponent: () =>
      import('./features/publics/features/features-page').then(
        (m) => m.FeaturesPage
      ),
  },
   {
    path: 'pricing',
    loadComponent: () =>
      import('./features/publics/pricing/pricing-page').then(
        (m) => m.PricingPage
      ),
  },
  {
    path: 'catalogue',
    loadComponent: () =>
      import('./features/publics/catalogue-page/catalogue-page').then(
        (m) => m.CataloguePage 
      ),
  },
  {
    path: 'programs',
    loadChildren: () =>
      import('./features/publics/programs/programs.routes').then(
        (m) => m.PROGRAMS_ROUTES
      ),
  },
  {
    path: 'my-programs',
    canActivate: [authenticatedGuard, programLearnerGuard],
    loadComponent: () =>
      import('./features/publics/programs/my-program-enrollments-page.component').then(
        (m) => m.MyProgramEnrollmentsPageComponent
      ),
  },
  {
    path: 'my-programs/:programId',
    canActivate: [authenticatedGuard, programLearnerGuard],
    loadChildren: () =>
      import('./features/publics/programs/learner-space/learner-space.routes').then(
        (m) => m.LEARNER_SPACE_ROUTES
      ),
  },
  {
    path: 'program-admin',
    canMatch: [programAdminAreaCanMatch],
    loadChildren: () =>
      import('./features/program-admin/program-admin.routes').then(
        (m) => m.PROGRAM_ADMIN_ROUTES
      ),
  },
  {
    path: 'admin',
    canMatch: [roleCanMatch(['super_admin', 'admin', 'manager'])],
    loadChildren: () =>
      import('./features/manager/manager.routes').then((m) => m.ManagerRoutingModule),
  },
   {
    path: 'catalogue/:id',
    loadComponent: () =>
      import('./features/publics/course-detail-page/course-detail-page').then(
        (m) => m.CourseDetailPage
      ),
  },
 {
  path: 'guest',
  loadChildren: () =>
    import('./features/guest/guest.routes').then((m) => m.GUEST_ROUTES),
},
{
  path: 'checkout/success',
  loadComponent: () =>
    import('./features/publics/checkout/checkout-success.component').then(m => m.CheckoutSuccessComponent),
},
{
  path: 'checkout/cancel',
  loadComponent: () =>
    import('./features/publics/checkout/checkout-cancel.component').then(m => m.CheckoutCancelComponent),
},
{
  path: 'cart',
  canActivate: [authenticatedGuard],
  loadComponent: () =>
    import('./features/publics/cart/cart-page.component').then(m => m.CartPageComponent),
},

  { path: '**', redirectTo: '/home' }
];