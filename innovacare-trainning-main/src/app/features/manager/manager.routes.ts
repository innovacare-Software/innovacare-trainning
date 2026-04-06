import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Assign } from './assign/assign';
import { Learners } from './learners/learners';
import { Reports } from './reports/reports';
import { ManagerShell } from './manager-shell/manager-shell';
import { OrgUsersComponent } from './org-users/org-users';
import { OrgDashboardComponent } from './org-dashboard/org-dashboard';
import { authCanMatch } from '../../core/auth.canmatch';
import { roleCanMatch } from '../../core/role.canmatch';
import { PolicyAckReportPage } from './policy-ack-report.page/policy-ack-report.page';

const routes: Routes = [
  {
    path: '',
    component: ManagerShell,
    canMatch: [authCanMatch, roleCanMatch(['manager','admin'])],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: OrgDashboardComponent },           // /manager
      { path: 'assign', component:  Assign },
      { path: 'org-users', component: OrgUsersComponent },
      { path: 'learners',  component: Learners },
      { path: 'reports',  component: Reports },
      { path: 'policy-report', component: PolicyAckReportPage },

    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ManagerRoutingModule {}

