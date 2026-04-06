import { Component, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { NotificationBellPlainComponent } from '../../../../shared/components/notifications/notification-bell-plain/notification-bell-plain';
import { LanguageSwitcherComponent } from '../../../../shared/components/language-switcher/language-switcher';
import { AuthService } from '../../../../core/auth';

@Component({
  selector: 'app-learner-shell',
  imports: [CommonModule, RouterModule, TranslateModule, NotificationBellPlainComponent, LanguageSwitcherComponent],
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
    { path: '/learner', labelKey: 'learner.nav.dashboard' },
    { path: '/learner/assignments', labelKey: 'learner.nav.assignments' },
    { path: '/learner/wound', labelKey: 'learner.nav.woundLibrary' },
    { path: '/learner/profile', labelKey: 'learner.nav.yourProfile' },
    { path: '/learner/policies', labelKey: 'learner.nav.policies' }
  ];

  resources = [
    { path: '/learner/certifications', labelKey: 'learner.nav.certifications' },
    { path: '/learner/library', labelKey: 'learner.nav.library' },
    { path: '/learner/transcript', labelKey: 'learner.nav.transcripts' },
    { path: '/learner/rewards', labelKey: 'learner.nav.rewards' }
  ];

  async logout() {
    await this.auth.logout();
    this.router.navigate(['/login']);
  }
}