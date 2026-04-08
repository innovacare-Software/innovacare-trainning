import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { TranslocoModule } from '@jsverse/transloco';

import { NotificationBell } from '../../../shared/components/notifications/notification-bell/notification-bell';
import { NotificationBellPlainComponent } from '../../../shared/components/notifications/notification-bell-plain/notification-bell-plain';
import { LanguageSwitcherComponent } from '../../../shared/components/language-switcher/language-switcher.component';
import { AuthService } from '../../../core/auth';

@Component({
  selector: 'app-manager-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslocoModule, NotificationBellPlainComponent, LanguageSwitcherComponent],
  templateUrl: './manager-shell.html',
  styleUrl: './manager-shell.css'
})
export class ManagerShell {
  private router = inject(Router);
  private auth = inject(AuthService);

  sidebarOpen = signal(false);
  toggleSidebar() { this.sidebarOpen.update(v => !v); }
  closeSidebar()  { this.sidebarOpen.set(false); }

  nav = signal([
    { path: '/manager/dashboard', labelKey: 'nav.dashboard', active: true },
    { path: '/manager/org-users', labelKey: 'nav.orgUsers', active: false },
    { path: '/manager/assign',    labelKey: 'nav.assignments', active: false }
  ]);

  resources = signal([
    { path: '/manager/reports', labelKey: 'nav.reports' }
  ]);

  constructor() {
    // auto-close on route change for small screens
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      if (window.matchMedia('(max-width: 768px)').matches) this.closeSidebar();
    });
  }

  async logout() {
    await this.auth.logout();
    this.router.navigate(['/login']);
  }
}
