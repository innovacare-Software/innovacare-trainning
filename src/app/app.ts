import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { ChatbotComponent } from './shared/components/chatbot/chatbot.component';
import { GlobalSearchPanelComponent } from './shared/global-search/global-search-panel.component';
import { OnboardingPanelComponent } from './shared/onboarding/onboarding-panel.component';
import { LanguageService } from './core/language.service';
import { MobileBottomNavComponent } from './shared/components/mobile-bottom-nav/mobile-bottom-nav.component';

interface DeferredInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    ChatbotComponent,
    GlobalSearchPanelComponent,
    OnboardingPanelComponent,
    MobileBottomNavComponent,
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly languageService = inject(LanguageService);
  private readonly router = inject(Router);

  readonly isReady = this.languageService.isReady;
  readonly isOffline = signal(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  readonly deferredInstallPrompt = signal<DeferredInstallPromptEvent | null>(null);

  readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  readonly showInstallPrompt = computed(() => this.deferredInstallPrompt() !== null);
  readonly showMobileNav = computed(() => {
    const url = this.currentUrl();
    return !/^\/(login|register|reset|exam|learner\/courses\/)/.test(url);
  });

  constructor() {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('online', () => this.isOffline.set(false));
    window.addEventListener('offline', () => this.isOffline.set(true));
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.deferredInstallPrompt.set(event as DeferredInstallPromptEvent);
    });
    window.addEventListener('appinstalled', () => {
      this.deferredInstallPrompt.set(null);
    });
  }

  async installApp(): Promise<void> {
    const deferred = this.deferredInstallPrompt();
    if (!deferred) {
      return;
    }

    await deferred.prompt();
    await deferred.userChoice;
    this.deferredInstallPrompt.set(null);
  }

  dismissInstallPrompt(): void {
    this.deferredInstallPrompt.set(null);
  }
}
