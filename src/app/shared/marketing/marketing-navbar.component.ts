import { CommonModule, DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, computed, effect, inject, signal } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { MatIconModule } from '@angular/material/icon';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';
import { AccessCapabilitiesService } from '../../core/access-capabilities.service';
import { AuthService, type AppProfile, type AppRole } from '../../core/auth';
import { resolveDefaultRoute } from '../../core/auth-redirect.util';
import { LanguageService } from '../../core/language.service';
import { DOMAIN_PRESETS } from './marketing-site.data';
import { LanguageSwitcherComponent } from '../components/language-switcher/language-switcher.component';

interface AccountMenuItem {
  label: string;
  description: string;
  icon: string;
  path: string;
  fragment?: string;
}

interface NavDropdownItem {
  icon: string;
  label: string;
  desc: string;
  path: string;
  fragment?: string;
}

@Component({
  selector: 'app-marketing-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, LanguageSwitcherComponent, TranslocoModule],
  template: `
    @if (isReady()) {
      <header class="marketing-header" [class.scrolled]="isScrolled()">
        <div class="marketing-header__inner">
          <a [routerLink]="localizedPath('/home')" class="marketing-brand" [attr.aria-label]="t('nav.home')" (click)="closeMobileMenu()">
            <img class="marketing-brand__logo" [src]="logoUrl" alt="Innovacare logo" />
            <div>
              <strong>Innovacare Review</strong>
              <span>{{ brandLabel() }}</span>
            </div>
          </a>

          <nav class="marketing-nav" [class.open]="mobileOpen()" [attr.aria-hidden]="!mobileOpen() && isCompactViewport() ? 'true' : 'false'">
          <div class="marketing-nav__mobile-head">
            <strong>{{ t('NAV.menu') }}</strong>
            <button type="button" class="marketing-nav__close" (click)="closeMobileMenu()" [attr.aria-label]="t('COMMON.close')">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <!-- ── Home dropdown ───────────────────────────────────────── -->
          <div class="nav-dd" [class.open]="activeDD() === 'home'" (mouseenter)="openDD('home')" (mouseleave)="closeDD()">
            <button type="button" class="nav-dd__trigger" [class.active]="activeDD() === 'home'" (click)="toggleDD('home')">
              {{ t('NAV.home') }} <mat-icon class="nav-dd__chevron">expand_more</mat-icon>
            </button>
            <div class="nav-dd__panel nav-dd__panel--simple" *ngIf="activeDD() === 'home'">
              <div class="nav-dd__items nav-dd__items--col">
                <a
                  *ngFor="let item of homeItems()"
                  [routerLink]="localizedPath(item.path)"
                  [fragment]="item.fragment"
                  (click)="closeAllMenus()"
                  class="nav-dd__item"
                >
                  <span class="nav-dd__item-emoji">{{ item.icon }}</span>
                  <span><strong>{{ item.label }}</strong><small>{{ item.desc }}</small></span>
                </a>
              </div>
            </div>
          </div>

          <!-- ── Nursing dropdown ─────────────────────────────────────── -->
          <div class="nav-dd" [class.open]="activeDD() === 'nursing'" (mouseenter)="openDD('nursing')" (mouseleave)="closeDD()">
            <button type="button" class="nav-dd__trigger" [class.active]="activeDD() === 'nursing'" (click)="toggleDD('nursing')">
              {{ t('NAV.nursing_school') }} <mat-icon class="nav-dd__chevron">expand_more</mat-icon>
            </button>
            <div class="nav-dd__panel nav-dd__panel--nursing" *ngIf="activeDD() === 'nursing'">
              <div class="nav-dd__columns">
                <div class="nav-dd__items">
                  <a *ngFor="let item of nursingItems()" [routerLink]="localizedPath(item.path)" (click)="closeAllMenus()" class="nav-dd__item">
                    <span class="nav-dd__item-emoji">{{ item.icon }}</span>
                    <span><strong>{{ item.label }}</strong><small>{{ item.desc }}</small></span>
                  </a>
                </div>
                <div class="nav-dd__aside">
                  <div class="nav-dd__promo nav-dd__promo--light">
                    <strong>{{ t('MARKETING_NAV.promo.discover_title') }}</strong>
                    <a [routerLink]="localizedPath('/courses')" (click)="closeAllMenus()" class="nav-dd__promo-cta">{{ t('MARKETING_NAV.promo.discover_cta') }} &rarr;</a>
                  </div>
                  <div class="nav-dd__promo nav-dd__promo--navy">
                    <span class="nav-dd__free-badge">{{ t('COMMON.free') }}</span>
                    <strong>{{ t('MARKETING_NAV.promo.foreign_title') }}</strong>
                    <a [routerLink]="localizedPath('/nclex-rn')" (click)="closeAllMenus()" class="nav-dd__apply-btn">{{ t('MARKETING_NAV.promo.apply_now') }}</a>
                  </div>
                  <div class="nav-dd__promo nav-dd__promo--dark">
                    <strong>{{ t('MARKETING_NAV.account.refer') }}</strong>
                    <p>{{ t('MARKETING_NAV.promo.refer_body') }}</p>
                    <a [routerLink]="localizedPath('/social-learning')" fragment="nclex" (click)="closeAllMenus()" class="nav-dd__share-link">{{ t('MARKETING_NAV.promo.share_earn') }}</a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ── Medical dropdown ─────────────────────────────────────── -->
          <div class="nav-dd" [class.open]="activeDD() === 'medical'" (mouseenter)="openDD('medical')" (mouseleave)="closeDD()">
            <button type="button" class="nav-dd__trigger" [class.active]="activeDD() === 'medical'" (click)="toggleDD('medical')">
              {{ t('MARKETING_NAV.medical') }} <mat-icon class="nav-dd__chevron">expand_more</mat-icon>
            </button>
            <div class="nav-dd__panel nav-dd__panel--simple" *ngIf="activeDD() === 'medical'">
              <div class="nav-dd__items nav-dd__items--col">
                <a *ngFor="let item of medicalItems()" [routerLink]="localizedPath(item.path)" (click)="closeAllMenus()" class="nav-dd__item">
                  <span class="nav-dd__item-emoji">{{ item.icon }}</span>
                  <span><strong>{{ item.label }}</strong><small>{{ item.desc }}</small></span>
                </a>
              </div>
            </div>
          </div>

          <!-- ── For Educators dropdown ───────────────────────────────── -->
          <div class="nav-dd" [class.open]="activeDD() === 'educators'" (mouseenter)="openDD('educators')" (mouseleave)="closeDD()">
            <button type="button" class="nav-dd__trigger" [class.active]="activeDD() === 'educators'" (click)="toggleDD('educators')">
              {{ t('NAV.for_educators') }} <mat-icon class="nav-dd__chevron">expand_more</mat-icon>
            </button>
            <div class="nav-dd__panel nav-dd__panel--simple" *ngIf="activeDD() === 'educators'">
              <div class="nav-dd__items nav-dd__items--col">
                <a *ngFor="let item of educatorsItems()" [routerLink]="localizedPath(item.path)" (click)="closeAllMenus()" class="nav-dd__item">
                  <span class="nav-dd__item-emoji">{{ item.icon }}</span>
                  <span><strong>{{ item.label }}</strong><small>{{ item.desc }}</small></span>
                </a>
              </div>
            </div>
          </div>
          <a [routerLink]="localizedPath('/programs')" (click)="closeMobileMenu()">{{ t('MARKETING_NAV.programs') }}</a>
          <a [routerLink]="localizedPath('/social-learning')" (click)="closeMobileMenu()">{{ t('MARKETING_NAV.social_learning') }}</a>
          <a [routerLink]="localizedPath('/testimonials')" (click)="closeMobileMenu()">{{ t('MARKETING_NAV.testimonials') }}</a>
          <a [routerLink]="localizedPath('/blog')" (click)="closeMobileMenu()">{{ t('MARKETING_NAV.blogs') }}</a>
          <a [routerLink]="localizedPath('/contact')" (click)="closeMobileMenu()">{{ t('MARKETING_NAV.contact_us') }}</a>

          <button
            *ngIf="isAuthenticated() && isCompactViewport()"
            type="button"
            class="marketing-nav__mobile-account"
            (click)="logoutFromMarketingMenu()"
          >
            {{ t('actions.logout') }}
          </button>
          </nav>

          <div class="marketing-header__actions">
            <app-language-switcher></app-language-switcher>

          <a routerLink="/cart" class="icon-button cart-button" [attr.aria-label]="t('nav.cart')" (click)="closeMobileMenu()">
            <span class="cart-button__ripple cart-button__ripple--outer" aria-hidden="true"></span>
            <span class="cart-button__ripple cart-button__ripple--inner" aria-hidden="true"></span>
            <mat-icon>shopping_cart</mat-icon>
            <span class="cart-button__spark" aria-hidden="true"></span>
          </a>

          <div class="account-menu" [class.account-menu--authenticated]="isAuthenticated()">
            <a
              [routerLink]="primaryAccountLink()"
              class="account-trigger"
              [class.account-trigger--authenticated]="isAuthenticated()"
              [attr.aria-label]="isAuthenticated() ? t('MARKETING_NAV.account.open_account') : t('MARKETING_NAV.account.open_login')"
              (click)="closeMobileMenu()"
            >
              <span class="account-trigger__avatar" [class.account-trigger__avatar--icon]="!isAuthenticated()">
                {{ isAuthenticated() ? initials() : 'IN' }}
              </span>
              <span class="account-trigger__copy">
                <strong>{{ isAuthenticated() ? t('MARKETING_NAV.account.title') : t('actions.login') }}</strong>
                <small>{{ isAuthenticated() ? accountSubtitle() : t('MARKETING_NAV.account.subtitle_guest') }}</small>
              </span>
              <mat-icon class="account-trigger__chevron">expand_more</mat-icon>
            </a>

            <div class="account-dropdown" *ngIf="!isCompactViewport()">
              <div class="account-dropdown__hero">
                <span class="account-dropdown__eyebrow">{{ t('MARKETING_NAV.account.quick_access') }}</span>
                <strong>{{ isAuthenticated() ? t('MARKETING_NAV.account.jump_back') : t('MARKETING_NAV.account.preview') }}</strong>
                <small>
                  {{
                    isAuthenticated()
                      ? t('MARKETING_NAV.account.hero_auth')
                      : t('MARKETING_NAV.account.hero_guest')
                  }}
                </small>
              </div>

              <div class="account-dropdown__list">
                <a
                  *ngFor="let item of accountMenuItems()"
                  class="account-dropdown__item"
                  [routerLink]="item.path"
                  [fragment]="item.fragment"
                  (click)="closeAllMenus()"
                >
                  <span class="account-dropdown__icon">{{ item.icon }}</span>
                  <span class="account-dropdown__content">
                    <strong>{{ item.label }}</strong>
                    <small>{{ item.description }}</small>
                  </span>
                </a>
              </div>

              <div class="account-dropdown__footer">
                <span class="account-dropdown__footer-label">{{ isAuthenticated() ? t('MARKETING_NAV.account.session_control') : t('MARKETING_NAV.account.premium_access') }}</span>
                <div class="account-dropdown__footer-actions">
                  <a [routerLink]="localizedPath('/home')" fragment="quiz" class="account-dropdown__footer-link" (click)="closeAllMenus()">
                    {{ t('MARKETING_NAV.account.best_fit') }}
                  </a>
                  <button
                    *ngIf="isAuthenticated()"
                    type="button"
                    class="account-dropdown__logout"
                    (click)="logoutFromMarketingMenu()"
                  >
                    {{ t('actions.logout') }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button type="button" class="mobile-toggle" (click)="toggleMobileMenu()" [attr.aria-expanded]="mobileOpen()" [attr.aria-label]="t('MARKETING_NAV.toggle_menu')">
            <mat-icon>{{ mobileOpen() ? 'close' : 'menu' }}</mat-icon>
          </button>
          </div>
        </div>

        <button type="button" class="marketing-backdrop" *ngIf="mobileOpen()" (click)="closeMobileMenu()" [attr.aria-label]="t('COMMON.close')"></button>
      </header>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketingNavbarComponent {
  private readonly auth = inject(Auth);
  private readonly authService = inject(AuthService);
  private readonly capabilities = inject(AccessCapabilitiesService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly lang = inject(LanguageService);
  private readonly transloco = inject(TranslocoService);
  readonly logoUrl = 'https://res.cloudinary.com/dtdpx59sc/image/upload/q_auto/f_auto/v1775625663/142F3705-07E3-43F3-BD40-F5556DD88AEC_uemn1w.png';
  readonly isReady = this.lang.isReady;
  private readonly activeTranslationLang = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });

  readonly brand = signal(DOMAIN_PRESETS['nclex']);
  readonly brandLabel = computed(() => {
    this.lang.currentLang();
    return this.brand().label[this.lang.currentLang()];
  });
  readonly activeDD = signal<string>('');

  readonly homeItems = computed<NavDropdownItem[]>(() => {
    const french = this.lang.currentLang() === 'fr';
    return [
      {
        icon: '📚',
        label: french ? 'Programmes' : 'Programs',
        desc: french ? 'Soins infirmiers & parcours médicaux' : 'Nursing & medical tracks',
        path: '/home',
        fragment: 'nursing',
      },
      {
        icon: '🧪',
        label: 'Quiz',
        desc: french ? 'Diagnostic rapide' : 'Quick diagnostic quiz',
        path: '/home',
        fragment: 'quiz',
      },
      {
        icon: '⭐',
        label: french ? 'Témoignages' : 'Testimonials',
        desc: french ? 'Success stories apprenants' : 'Learner success stories',
        path: '/testimonials',
      },
      {
        icon: '🌍',
        label: french ? 'Tests de langue' : 'Language Tests',
        desc: french ? 'IELTS · TEF · OET' : 'IELTS · TEF · OET',
        path: '/tests-langue',
      },
      {
        icon: '💻',
        label: french ? 'Cours IT' : 'IT Courses',
        desc: french ? 'Cloud, DevOps & cybersécurité' : 'Cloud, DevOps and cybersecurity',
        path: '/it-courses',
      },
    ];
  });

  readonly nursingItems = computed(() => [
    { icon: '🎓', label: this.t('MARKETING_NAV.nursing.pre_nursing'), desc: this.t('MARKETING_NAV.nursing.pre_nursing_desc'), path: '/pre-nursing' },
    { icon: '🩺', label: 'NCLEX-RN®', desc: this.t('MARKETING_NAV.nursing.nclex_rn_desc'), path: '/nclex-rn' },
    { icon: '👩‍⚕️', label: this.t('MARKETING_NAV.nursing.np'), desc: this.t('MARKETING_NAV.nursing.np_desc'), path: '/nurse-practitioner' },
    { icon: '🏫', label: this.t('MARKETING_NAV.nursing.nursing_school'), desc: this.t('MARKETING_NAV.nursing.nursing_school_desc'), path: '/nursing-school' },
    { icon: '📋', label: 'NCLEX-PN®', desc: this.t('MARKETING_NAV.nursing.nclex_pn_desc'), path: '/nclex-pn' },
    { icon: '💓', label: 'CCRN®', desc: this.t('MARKETING_NAV.nursing.ccrn_desc'), path: '/ccrn' },
    { icon: '👨‍🏫', label: this.t('MARKETING_NAV.nursing.private_tutors'), desc: this.t('MARKETING_NAV.nursing.private_tutors_desc'), path: '/private-tutors' },
  ]);

  readonly medicalItems = computed(() => [
    { icon: '🩻', label: 'USMLE®', desc: this.t('MARKETING_NAV.medical_items.usmle'), path: '/usmle' },
    { icon: '🦴', label: 'COMLEX-USA®', desc: this.t('MARKETING_NAV.medical_items.comlex'), path: '/comlex' },
    { icon: '🫁', label: 'PANCE / PANRE®', desc: this.t('MARKETING_NAV.medical_items.pance'), path: '/pance' },
  ]);

  readonly educatorsItems = computed(() => [
    { icon: '🏢', label: this.t('MARKETING_NAV.educators.overview'), desc: this.t('MARKETING_NAV.educators.overview_desc'), path: '/for-educators' },
    { icon: '📖', label: this.t('MARKETING_NAV.educators.for_nclex'), desc: this.t('MARKETING_NAV.educators.for_nclex_desc'), path: '/educators-nclex' },
    { icon: '🏛️', label: this.t('MARKETING_NAV.educators.for_school'), desc: this.t('MARKETING_NAV.educators.for_school_desc'), path: '/educators-nursing-school' },
    { icon: '📅', label: this.t('MARKETING_NAV.educators.demo'), desc: this.t('MARKETING_NAV.educators.demo_desc'), path: '/for-educators/request-demo' },
  ]);
  readonly mobileOpen = signal(false);
  readonly isScrolled = signal(false);
  readonly isCompactViewport = signal(typeof window !== 'undefined' ? window.innerWidth <= 1240 : false);
  readonly profile = toSignal(this.authService.profile$, { initialValue: null });
  readonly currentRole = computed(() => this.profile()?.role ?? this.profile()?.primaryRole ?? 'guest');
  readonly hasProgramAdminWorkspace = computed(() => this.capabilities.canAccessProgramAdmin(this.profile()));
  readonly isAuthenticated = computed(() => !!this.auth.currentUser);
  readonly userName = computed(() => this.auth.currentUser?.displayName?.trim() || this.profile()?.displayName?.trim() || '');
  readonly initials = computed(() => {
    const parts = this.userName().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'IN';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  });
  readonly accountSubtitle = computed(() => {
    const profile = this.profile();
    if (profile?.role === 'super_admin') {
      return 'Platform governance and cross-tenant control';
    }
    if (String(profile?.orgId || '').trim() && (profile?.role === 'admin' || profile?.role === 'manager')) {
      return 'Organization admin workspace';
    }
    if (this.hasProgramAdminWorkspace()) {
      return 'Program operations workspace';
    }

    switch (this.currentRole()) {
      case 'guest':
        return 'Guest dashboard and bookings';
      case 'learner':
        return 'Courses, rewards and transcript';
      case 'programLearner':
        return 'Learner dashboard and purchases';
      case 'manager':
      case 'admin':
      case 'instructor':
        return 'Organization dashboard shortcuts';
      case 'super_admin':
        return 'Platform controls and reports';
      case 'programAdmin':
      case 'programStaff':
        return 'Program operations shortcuts';
      default:
        return 'Quick account links';
    }
  });
  readonly accountMenuItems = computed<AccountMenuItem[]>(() => {
    const role = this.currentRole();
    return [
      {
        label: this.t('DASHBOARD.title'),
        description: this.dashboardDescription(role),
        icon: 'DB',
        path: this.dashboardPath(this.profile()),
      },
      {
        label: this.t('WALLET.title'),
        description: this.walletDescription(role),
        icon: 'WL',
        path: this.walletPath(role),
      },
      {
        label: this.t('MARKETING_NAV.account.order_history'),
        description: this.orderHistoryDescription(role),
        icon: 'OH',
        path: this.orderHistoryPath(role),
      },
      {
        label: this.t('MARKETING_NAV.account.refer'),
        description: this.t('MARKETING_NAV.account.refer_desc'),
        icon: 'RF',
        path: '/social-learning',
        fragment: 'nclex',
      },
      
    ];
  });

  constructor() {
    effect(() => {
      this.document.body.classList.toggle('marketing-menu-open', this.mobileOpen());
    });

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => this.closeAllMenus());
  }

  @HostListener('window:scroll')
  onScroll(): void {
    this.isScrolled.set(window.scrollY > 14);
  }

  @HostListener('window:resize')
  onResize(): void {
    const compact = window.innerWidth <= 1240;
    this.isCompactViewport.set(compact);
    if (!compact) {
      this.closeMobileMenu();
    }
  }

  toggleMobileMenu(): void {
    this.mobileOpen.update((value) => !value);
  }

  closeMobileMenu(): void {
    this.mobileOpen.set(false);
  }

  closeAllMenus(): void {
    this.activeDD.set('');
    this.mobileOpen.set(false);
  }

  openDD(name: string): void {
    if (!this.isCompactViewport()) {
      this.activeDD.set(name);
    }
  }

  closeDD(): void {
    if (!this.isCompactViewport()) {
      this.activeDD.set('');
    }
  }

  toggleDD(name: string): void {
    this.activeDD.update((v) => (v === name ? '' : name));
  }

  async logoutFromMarketingMenu(): Promise<void> {
    this.closeAllMenus();
    await this.authService.logout();
    await this.router.navigateByUrl(this.localizedPath('/login'));
  }

  primaryAccountLink(): string {
    return this.isAuthenticated() ? this.dashboardPath(this.profile()) : '/login';
  }

  localizedPath(path: string): string {
    return this.router.url.startsWith('/fr') ? `/fr${path}` : path;
  }

  t(key: string, params?: Record<string, unknown>): string {
    this.activeTranslationLang();
    return this.lang.instant(key, params);
  }

  private dashboardPath(profile: AppProfile | null): string {
    return resolveDefaultRoute(profile);
  }

  private walletPath(role: AppRole): string {
    switch (role) {
      case 'guest':
        return '/guest/orders';
      case 'learner':
        return '/learner/rewards';
      case 'programLearner':
        return '/my-programs';
      default:
        return this.dashboardPath(this.profile());
    }
  }

  private orderHistoryPath(role: AppRole): string {
    switch (role) {
      case 'guest':
        return '/guest/orders';
      case 'learner':
        return '/learner/transcript';
      case 'programLearner':
        return '/my-programs';
      default:
        return this.dashboardPath(this.profile());
    }
  }

  private dashboardDescription(role: AppRole): string {
    switch (role) {
      case 'guest':
        return this.t('MARKETING_NAV.account.dashboard_guest');
      case 'learner':
        return this.t('MARKETING_NAV.account.dashboard_learner');
      case 'programLearner':
        return this.t('MARKETING_NAV.account.dashboard_program_learner');
      case 'super_admin':
        return this.t('MARKETING_NAV.account.dashboard_super_admin');
      case 'programAdmin':
      case 'programStaff':
        return this.t('MARKETING_NAV.account.dashboard_program_admin');
      default:
        return this.t('MARKETING_NAV.account.dashboard_default');
    }
  }

  private walletDescription(role: AppRole): string {
    switch (role) {
      case 'guest':
        return this.t('MARKETING_NAV.account.wallet_guest');
      case 'learner':
        return this.t('MARKETING_NAV.account.wallet_learner');
      case 'programLearner':
        return this.t('MARKETING_NAV.account.wallet_program_learner');
      default:
        return this.t('MARKETING_NAV.account.wallet_default');
    }
  }

  private orderHistoryDescription(role: AppRole): string {
    switch (role) {
      case 'guest':
        return this.t('MARKETING_NAV.account.orders_guest');
      case 'learner':
        return this.t('MARKETING_NAV.account.orders_learner');
      case 'programLearner':
        return this.t('MARKETING_NAV.account.orders_program_learner');
      default:
        return this.t('MARKETING_NAV.account.orders_default');
    }
  }
}