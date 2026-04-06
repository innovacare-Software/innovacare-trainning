import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageSwitcherComponent } from '../../../shared/components/language-switcher/language-switcher';
import { AuthService } from '../../../core/auth';

@Component({
  selector: 'app-shell',
  imports: [
    CommonModule,
    RouterModule,
    TranslateModule,
    LanguageSwitcherComponent,
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
})
export class Shell {
  sidebarOpen = signal(true);

 nav = [
  { labelKey: 'superAdmin.nav.dashboard', path: '/super-admin/dashboard' },
  { labelKey: 'superAdmin.nav.organizations', path: '/super-admin/organizations' },
  { labelKey: 'superAdmin.nav.createCourse', path: '/super-admin/courses/create' },
  { labelKey: 'superAdmin.nav.createPolicy', path: '/super-admin/policy/create' },
  { labelKey: 'superAdmin.nav.wounds', path: '/super-admin/wounds/new' },
  { labelKey: 'superAdmin.nav.woundReport', path: '/super-admin/wound-report' },
  { labelKey: 'superAdmin.nav.setup', path: '/super-admin/setup' },
  { labelKey: 'superAdmin.nav.users', path: '/super-admin/users' },
  { labelKey: 'superAdmin.nav.billing', path: '/super-admin/billing' },
  { labelKey: 'superAdmin.nav.logs', path: '/super-admin/logs' },
  { labelKey: 'superAdmin.nav.settings', path: '/super-admin/settings' },
  { labelKey: 'superAdmin.nav.orgContext', path: '/super-admin/organizations' },
];

  constructor(
    private router: Router,
    private auth: AuthService
  ) {}

  toggleSidebar() {
    this.sidebarOpen.update(v => !v);
  }

  async logout() {
    await this.auth.logout();
    this.router.navigate(['/login']);
  }
}