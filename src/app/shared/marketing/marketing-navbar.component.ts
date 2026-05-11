import { CommonModule, DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, computed, effect, inject, signal } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { MatIconModule } from '@angular/material/icon';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs';
import { AccessCapabilitiesService } from '../../core/access-capabilities.service';
import { OrgContextService } from '../../core/organization/org-context.service';
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

interface PathwayActionCard {
  title: string;
  body: string;
  cta: string;
  path: string;
  fragment?: string;
  variant: 'light' | 'navy' | 'dark';
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

          <!-- ── Pathways mega menu ───────────────────────────────────── -->
          <div class="nav-dd" [class.open]="activeDD() === 'pathways'" (mouseenter)="openDD('pathways')" (mouseleave)="closeDD()">
            <button type="button" class="nav-dd__trigger" [class.active]="activeDD() === 'pathways'" (click)="toggleDD('pathways')">
              {{ t('MARKETING_NAV.pathways') }} <mat-icon class="nav-dd__chevron">expand_more</mat-icon>
            </button>
            <div class="nav-dd__panel nav-dd__panel--nursing" *ngIf="activeDD() === 'pathways'">
              <div class="nav-dd__columns">
                <div class="nav-dd__items nav-dd__items--col">
                  <h4 class="nav-dd__section-title">{{ t('MARKETING_NAV.pathways_sections.licensure') }}</h4>
                  <a *ngFor="let item of pathwayLicensureItems()" [routerLink]="localizedPath(item.path)" [fragment]="item.fragment" (click)="closeAllMenus()" class="nav-dd__item">
                    <span class="nav-dd__item-emoji">{{ item.icon }}</span>
                    <span><strong>{{ item.label }}</strong><small>{{ item.desc }}</small></span>
                  </a>
                </div>
                <div class="nav-dd__items nav-dd__items--col">
                  <h4 class="nav-dd__section-title">{{ t('MARKETING_NAV.pathways_sections.practice') }}</h4>
                  <a *ngFor="let item of pathwayPracticeItems()" [routerLink]="localizedPath(item.path)" [fragment]="item.fragment" (click)="closeAllMenus()" class="nav-dd__item">
                    <span class="nav-dd__item-emoji">{{ item.icon }}</span>
                    <span><strong>{{ item.label }}</strong><small>{{ item.desc }}</small></span>
                  </a>
                </div>
                <div class="nav-dd__items nav-dd__items--col">
                  <h4 class="nav-dd__section-title">{{ t('MARKETING_NAV.pathways_sections.people') }}</h4>
                  <a *ngFor="let item of pathwayPeopleItems()" [routerLink]="localizedPath(item.path)" [fragment]="item.fragment" (click)="closeAllMenus()" class="nav-dd__item">
                    <span class="nav-dd__item-emoji">{{ item.icon }}</span>
                    <span><strong>{{ item.label }}</strong><small>{{ item.desc }}</small></span>
                  </a>
                  <a [routerLink]="localizedPath('/programs')" (click)="closeAllMenus()" class="nav-dd__item nav-dd__item--feature">
                    <span class="nav-dd__item-emoji">📚</span>
                    <span><strong>All programs</strong><small>Browse the full catalog of structured programs</small></span>
                  </a>
                </div>
                <div class="nav-dd__aside">
                  <div *ngFor="let card of pathwayActionCards()" class="nav-dd__promo" [ngClass]="{
                    'nav-dd__promo--light': card.variant === 'light',
                    'nav-dd__promo--navy': card.variant === 'navy',
                    'nav-dd__promo--dark': card.variant === 'dark'
                  }">
                    <strong>{{ card.title }}</strong>
                    <p>{{ card.body }}</p>
                    <a
                      [routerLink]="localizedPath(card.path)"
                      [fragment]="card.fragment"
                      (click)="closeAllMenus()"
                      [class.nav-dd__promo-cta]="card.variant === 'light'"
                      [class.nav-dd__apply-btn]="card.variant === 'navy'"
                      [class.nav-dd__share-link]="card.variant === 'dark'"
                    >{{ card.cta }}</a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <a [routerLink]="localizedPath('/nclex-rn')" (click)="closeMobileMenu()">{{ t('MARKETING_NAV.nclex_readiness') }}</a>
          <a [routerLink]="localizedPath('/home')" fragment="quiz" (click)="closeMobileMenu()">{{ t('MARKETING_NAV.ai_tutor') }}</a>
          <a [routerLink]="localizedPath('/private-tutors')" (click)="closeMobileMenu()">{{ t('MARKETING_NAV.for_tutors') }}</a>
          <a [routerLink]="localizedPath('/for-educators')" (click)="closeMobileMenu()">{{ t('MARKETING_NAV.for_institutions') }}</a>
          <a [routerLink]="localizedPath('/blog')" (click)="closeMobileMenu()">{{ t('MARKETING_NAV.resources') }}</a>
          <a [routerLink]="localizedPath('/pricing')" (click)="closeMobileMenu()">{{ t('MARKETING_NAV.pricing') }}</a>

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
  private readonly orgContext = inject(OrgContextService);
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

  readonly pathwayLicensureItems = computed<NavDropdownItem[]>(() => [
    { icon: '🧭', label: this.t('MARKETING_NAV.pathway_items.nclex_readiness'), desc: this.t('MARKETING_NAV.pathway_desc.nclex_readiness'), path: '/nclex-rn' },
    { icon: '🌍', label: this.t('MARKETING_NAV.pathway_items.intl_starter'), desc: this.t('MARKETING_NAV.pathway_desc.intl_starter'), path: '/global-nurse-pack' },
    { icon: '🏙️', label: this.t('MARKETING_NAV.pathway_items.dha_doh'), desc: this.t('MARKETING_NAV.pathway_desc.dha_doh'), path: '/global-nurse-pack', fragment: 'pricing' },
    { icon: '🍁', label: this.t('MARKETING_NAV.pathway_items.canada'), desc: this.t('MARKETING_NAV.pathway_desc.canada'), path: '/global-nurse-pack', fragment: 'pricing' },
    { icon: '🗣️', label: this.t('MARKETING_NAV.pathway_items.ielts_oet'), desc: this.t('MARKETING_NAV.pathway_desc.ielts_oet'), path: '/tests-langue' },
  ]);

  readonly pathwayPracticeItems = computed<NavDropdownItem[]>(() => [
    { icon: '🧪', label: this.t('MARKETING_NAV.pathway_items.ngn_case'), desc: this.t('MARKETING_NAV.pathway_desc.ngn_case'), path: '/home', fragment: 'quiz' },
    { icon: '🧠', label: this.t('MARKETING_NAV.pathway_items.clinical_judgment'), desc: this.t('MARKETING_NAV.pathway_desc.clinical_judgment'), path: '/nclex-rn' },
    { icon: '📊', label: this.t('MARKETING_NAV.pathway_items.readiness_diagnostic'), desc: this.t('MARKETING_NAV.pathway_desc.readiness_diagnostic'), path: '/home', fragment: 'quiz' },
    { icon: '🤖', label: this.t('MARKETING_NAV.pathway_items.ai_remediation'), desc: this.t('MARKETING_NAV.pathway_desc.ai_remediation'), path: '/home', fragment: 'quiz' },
    { icon: '🗓️', label: this.t('MARKETING_NAV.pathway_items.study_builder'), desc: this.t('MARKETING_NAV.pathway_desc.study_builder'), path: '/blog' },
  ]);

  readonly pathwayPeopleItems = computed<NavDropdownItem[]>(() => [
    { icon: '👩‍🏫', label: this.t('MARKETING_NAV.pathway_items.private_tutors'), desc: this.t('MARKETING_NAV.pathway_desc.private_tutors'), path: '/private-tutors', fragment: 'tutors' },
    { icon: '🤝', label: this.t('MARKETING_NAV.pathway_items.tutor_portal'), desc: this.t('MARKETING_NAV.pathway_desc.tutor_portal'), path: '/contact' },
    { icon: '🏫', label: this.t('MARKETING_NAV.pathway_items.school_pilot'), desc: this.t('MARKETING_NAV.pathway_desc.school_pilot'), path: '/for-educators' },
    { icon: '📈', label: this.t('MARKETING_NAV.pathway_items.cohort_dashboard'), desc: this.t('MARKETING_NAV.pathway_desc.cohort_dashboard'), path: '/for-educators' },
    { icon: '📝', label: this.t('MARKETING_NAV.pathway_items.progress_reports'), desc: this.t('MARKETING_NAV.pathway_desc.progress_reports'), path: '/for-educators', fragment: 'pricing' },
  ]);

  readonly pathwayActionCards = computed<PathwayActionCard[]>(() => [
    {
      title: this.t('MARKETING_NAV.pathway_cards.roadmap_title'),
      body: this.t('MARKETING_NAV.pathway_cards.roadmap_body'),
      cta: this.t('MARKETING_NAV.pathway_cards.roadmap_cta'),
      path: '/global-nurse-pack',
      variant: 'light',
    },
    {
      title: this.t('MARKETING_NAV.pathway_cards.readiness_title'),
      body: this.t('MARKETING_NAV.pathway_cards.readiness_body'),
      cta: this.t('MARKETING_NAV.pathway_cards.readiness_cta'),
      path: '/home',
      fragment: 'quiz',
      variant: 'navy',
    },
    {
      title: this.t('MARKETING_NAV.pathway_cards.partner_title'),
      body: this.t('MARKETING_NAV.pathway_cards.partner_body'),
      cta: this.t('MARKETING_NAV.pathway_cards.partner_cta'),
      path: '/social-learning',
      variant: 'dark',
    },
  ]);
  readonly mobileOpen = signal(false);
  readonly isScrolled = signal(false);
  readonly isCompactViewport = signal(typeof window !== 'undefined' ? window.innerWidth <= 1240 : false);
  readonly profile = toSignal(this.authService.profile$, { initialValue: null });
  readonly orgCtx = toSignal(this.orgContext.context$, { initialValue: null });
  readonly currentRole = computed(() => this.profile()?.role ?? this.profile()?.primaryRole ?? 'guest');
  readonly hasProgramAdminWorkspace = computed(() =>
    this.capabilities.canAccessProgramAdmin(this.profile(), this.orgCtx())
  );
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