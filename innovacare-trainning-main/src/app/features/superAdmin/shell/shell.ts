import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { AuthService } from '../../../core/auth';
import { LanguageSwitcherComponent } from '../../../shared/components/language-switcher/language-switcher.component';

@Component({
  selector: 'app-shell',
  imports: [
    CommonModule,
    RouterModule,
    TranslocoModule,
    LanguageSwitcherComponent,
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
})
export class Shell {
  sidebarOpen = signal(true);

 nav = [
  { labelKey: 'nav.dashboard', path: '/super-admin/dashboard' },
  { labelKey: 'Communication Center', path: '/super-admin/communication-center' },
  { labelKey: 'nav.organizations', path: '/super-admin/organizations' },
  { labelKey: 'nav.createCourse', path: '/super-admin/courses/create' },
  { labelKey: 'nav.createPolicy', path: '/super-admin/policy/create' },
  { labelKey: 'nav.wounds', path: '/super-admin/wounds/new' },
  { labelKey: 'nav.woundReport', path: '/super-admin/wound-report' },
  { labelKey: 'nav.setup', path: '/super-admin/setup' },
  { labelKey: 'nav.users', path: '/super-admin/users' },
  { labelKey: 'nav.billing', path: '/super-admin/billing' },
  { labelKey: 'nav.logs', path: '/super-admin/logs' },
  { labelKey: 'nav.settings', path: '/super-admin/settings' },
  { labelKey: 'nav.orgContext', path: '/super-admin/organizations' },
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