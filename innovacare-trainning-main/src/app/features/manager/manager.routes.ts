import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Assign } from './assign/assign';
import { Courses } from './courses/courses';
import { Learners } from './learners/learners';
import { Reports } from './reports/reports';
import { ManagerDashboardComponent } from './manager-dashboard/manager-dashboard';
import { ManagerShell } from './manager-shell/manager-shell';
import { OrgUsersComponent } from './org-users/org-users';
import { OrgDashboardComponent } from './org-dashboard/org-dashboard';
import { authCanMatch } from '../../core/auth.canmatch';
import { roleCanMatch } from '../../core/role.canmatch';
import { ManagerSettings } from './manager-settings/manager-settings';
import { AddWound } from './add-wound/add-wound';
import { PolicyAckReportPage } from './policy-ack-report.page/policy-ack-report.page';
import { AdminNotify} from './admin-notify/admin-notify';

const routes: Routes = [
  {
    path: '',
    component: ManagerShell,
    canMatch: [authCanMatch, roleCanMatch(['manager','admin'])],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: OrgDashboardComponent },           // /manager
      { path: 'assign', component:  Assign },
      { path: 'notify', component:  AdminNotify },
      { path: 'courses', component: Courses },
      { path: 'org-users', component: OrgUsersComponent },
      { path: 'learners',  component: Learners },
      { path: 'wounds',  component: AddWound },
      { path: 'reports',  component: Reports },
      { path: 'setting',  component: ManagerSettings },
      {
        path: 'marketplace/publish',
        redirectTo: '/super-admin/marketplace/publish',
        pathMatch: 'full'
      },
      { path: 'policy/new', redirectTo: '/super-admin/policy/new', pathMatch: 'full' },
      { path: 'policy/:id/edit', redirectTo: '/super-admin/policy/:id/edit', pathMatch: 'full' },
      { path: 'policy-report', component: PolicyAckReportPage },

      {
        path: 'courses/new',
        redirectTo: '/super-admin/courses/new',
        pathMatch: 'full'
      },

      {
        path: 'courses/:id/edit',
        redirectTo: '/super-admin/courses/:id/edit',
        pathMatch: 'full'
      },
      {
        path: 'courses/:id/extras',
        loadComponent: () =>
          import('./courses-editor/courses-editor').then(m => m.CoursesEditor)
      }

    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ManagerRoutingModule {}

