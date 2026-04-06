import { Component, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { TranslocoModule } from '@jsverse/transloco';
import { NotificationBellPlainComponent } from '../../../../shared/components/notifications/notification-bell-plain/notification-bell-plain';
import { LanguageSwitcherComponent } from '../../../../shared/components/language-switcher/language-switcher.component';
import { AuthService } from '../../../../core/auth';

@Component({
  selector: 'app-learner-shell',
  imports: [CommonModule, RouterModule, TranslocoModule, NotificationBellPlainComponent, LanguageSwitcherComponent],
  templateUrl: './learner-shell.html',
  styleUrl: './learner-shell.css'
})
export class LearnerShell implements OnDestroy {
  private router = inject(Router);
  private auth = inject(AuthService);
  private mq = window.matchMedia('(max-width: 860px)');

  isMobile = signal(this.mq.matches);
  sidebarOpen = signal(!this.mq.matches); // open by default on desktop, closed on mobile

  private mediaHandler = (e: MediaQueryListEvent) => {
    this.isMobile.set(e.matches);

    // keep UX natural on breakpoint change
    if (e.matches) {
      this.sidebarOpen.set(false); // mobile => drawer closed by default
    } else {
      this.sidebarOpen.set(true); // desktop => sidebar visible by default
    }
  };

  constructor() {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        if (this.isMobile()) this.closeSidebar();
      });

    this.mq.addEventListener('change', this.mediaHandler);
  }

  ngOnDestroy(): void {
    this.mq.removeEventListener('change', this.mediaHandler);
  }

  toggleSidebar() {
    this.sidebarOpen.update(v => !v);
  }

  closeSidebar() {
    this.sidebarOpen.set(false);
  }

  openSidebar() {
    this.sidebarOpen.set(true);
  }

  onNavClick() {
    if (this.isMobile()) this.closeSidebar();
  }

  links = [
    { path: '/learner', labelKey: 'nav.dashboard' },
    { path: '/learner/assignments', labelKey: 'nav.assignments' },
    { path: '/learner/wound', labelKey: 'nav.woundLibrary' },
    { path: '/learner/profile', labelKey: 'nav.yourProfile' },
    { path: '/learner/policies', labelKey: 'nav.policies' }
  ];

  resources = [
    { path: '/learner/certifications', labelKey: 'nav.certifications' },
    { path: '/learner/library', labelKey: 'nav.library' },
    { path: '/learner/transcript', labelKey: 'nav.transcripts' },
    { path: '/learner/rewards', labelKey: 'nav.rewards' }
  ];

  async logout() {
    await this.auth.logout();
    this.router.navigate(['/login']);
  }
}