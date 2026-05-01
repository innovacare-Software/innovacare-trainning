import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, startWith } from 'rxjs';
import { LanguageService } from '../../core/language.service';
import { MarketingFooterComponent } from './marketing-footer.component';
import { MarketingNavbarComponent } from './marketing-navbar.component';
import { MarketingPopupsComponent } from './marketing-popups.component';
import { MarketingSeoPayload, MarketingSeoService } from './services/marketing-seo.service';

@Component({
  selector: 'app-marketing-shell',
  standalone: true,
  imports: [RouterOutlet, MarketingNavbarComponent, MarketingFooterComponent, MarketingPopupsComponent],
  template: `
    @if (isReady()) {
      <div class="marketing-shell">
        <app-marketing-navbar />
        <router-outlet />
        <app-marketing-footer />
        <app-marketing-popups />
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketingShellComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly seo = inject(MarketingSeoService);
  private readonly languageService = inject(LanguageService);
  readonly isReady = this.languageService.isReady;

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        startWith(null),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.applyRouteSeo());
  }

  @HostListener('click', ['$event'])
  onShellClick(event: MouseEvent): void {
    if (!this.router.url.startsWith('/fr')) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const anchor = target.closest('a[href]');
    if (!(anchor instanceof HTMLAnchorElement)) {
      return;
    }

    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      return;
    }

    const url = new URL(anchor.href, window.location.origin);
    if (url.origin !== window.location.origin || !this.isMarketingPath(url.pathname)) {
      return;
    }

    if (url.pathname.startsWith('/fr/')) {
      return;
    }

    event.preventDefault();
    void this.router.navigateByUrl(`/fr${url.pathname}${url.search}${url.hash}`);
  }

  private applyRouteSeo(): void {
    let activeRoute: ActivatedRoute | null = this.route;

    while (activeRoute?.firstChild) {
      activeRoute = activeRoute.firstChild;
    }

    const routeSeo = activeRoute?.snapshot?.data?.['seo'] as MarketingSeoPayload | undefined;
    if (!routeSeo) {
      return;
    }

    const path = this.router.url.split('?')[0] || '/';
    this.seo.setPageSeo({
      ...routeSeo,
      path,
    });
  }

  private isMarketingPath(path: string): boolean {
    return (
      path === '/home' ||
      path === '/courses' ||
      path === '/catalogue' ||
      path === '/blog' ||
      path.startsWith('/blog/') ||
      path === '/testimonials' ||
      path === '/medical-program' ||
      path === '/cme' ||
      path === '/pre-nursing' ||
      path === '/nclex-rn' ||
      path === '/nclex-pn' ||
      path === '/nurse-practitioner' ||
      path === '/nursing-school' ||
      path === '/ccrn' ||
      path === '/usmle' ||
      path === '/comlex' ||
      path === '/pance' ||
      path === '/educators-nclex' ||
      path === '/educators-nursing-school' ||
      path === '/it-courses' ||
      path === '/contact' ||
      path === '/social-learning' ||
      path === '/pricing' ||
      path === '/fonctionnalites' ||
      path === '/global-nurse-pack'
    );
  }
}