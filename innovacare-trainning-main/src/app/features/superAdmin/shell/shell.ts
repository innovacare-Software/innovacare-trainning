import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/auth';

@Component({
  selector: 'app-shell',
  imports: [
    CommonModule,
    RouterModule,
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
})
export class Shell {
  sidebarOpen = signal(true);

 nav = [
  { label: 'Dashboard', path: '/super-admin/dashboard' },
  { label: 'Organizations', path: '/super-admin/organizations' },
  { label: 'Create Course', path: '/super-admin/courses/create' },
  { label: 'Create Policy', path: '/super-admin/policy/create' },
  { label: 'Wounds', path: '/super-admin/wounds/new' },
  { label: 'Wound Report', path: '/super-admin/wound-report' },
  { label: 'Setup', path: '/super-admin/setup' },
  { label: 'Users', path: '/super-admin/users' },
  { label: 'Billing', path: '/super-admin/billing' },
  { label: 'Logs', path: '/super-admin/logs' },
  { label: 'Settings', path: '/super-admin/settings' },
  { label: 'Org Context', path: '/super-admin/organizations' },
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