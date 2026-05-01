import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterModule } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { LanguageService } from '../../core/language.service';

@Component({
  selector: 'app-marketing-footer',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslocoModule],
  template: `
    @if (isReady()) {
      <footer class="marketing-footer">
        <div class="marketing-footer__grid">
          <section>
            <div class="marketing-footer__brand">
              <img class="marketing-footer__logo" [src]="logoUrl" [alt]="t('MARKETING_FOOTER.logo_alt')" />
            </div>
            <span class="marketing-footer__eyebrow">{{ t('MARKETING_FOOTER.eyebrow') }}</span>
            <h3>{{ t('MARKETING_FOOTER.brand_title') }}</h3>
            <p>{{ t('MARKETING_FOOTER.brand_body') }}</p>
          </section>

          <section>
            <h4>{{ t('MARKETING_FOOTER.explore_title') }}</h4>
            <a [routerLink]="localizedPath('/home')">{{ t('nav.home') }}</a>
            <a [routerLink]="localizedPath('/courses')">{{ t('nav.courses') }}</a>
            <a [routerLink]="localizedPath('/blog')">{{ t('BLOG_PAGE.hero.kicker') }}</a>
            <a [routerLink]="localizedPath('/contact')">{{ t('MARKETING_NAV.contact_us') }}</a>
          </section>

          <section>
            <h4>{{ t('MARKETING_FOOTER.programs_title') }}</h4>
            <a [routerLink]="localizedPath('/courses')" fragment="nursing">NCLEX-RN</a>
            <a [routerLink]="localizedPath('/courses')" fragment="nursing">NCLEX-PN</a>
            <a [routerLink]="localizedPath('/courses')" fragment="medical">FNP</a>
            <a [routerLink]="localizedPath('/home')" fragment="educators">{{ t('MARKETING_FOOTER.institutional_sales') }}</a>
          </section>

          <section>
            <h4>{{ t('MARKETING_FOOTER.legal_title') }}</h4>
            <a [routerLink]="localizedPath('/privacy')">{{ t('MARKETING_FOOTER.privacy') }}</a>
            <a [routerLink]="localizedPath('/terms')">{{ t('MARKETING_FOOTER.terms') }}</a>
            <a [routerLink]="localizedPath('/contact')">{{ t('MARKETING_FOOTER.accessibility') }}</a>
            <a [routerLink]="localizedPath('/contact')">{{ t('MARKETING_FOOTER.support') }}</a>
          </section>
        </div>

        <div class="marketing-footer__bottom">
          <p>{{ t('MARKETING_FOOTER.bottom_copy') }}</p>
          <div class="marketing-footer__socials">
            <a href="https://www.linkedin.com" target="_blank" rel="noreferrer">{{ t('MARKETING_FOOTER.linkedin') }}</a>
            <a href="https://www.instagram.com" target="_blank" rel="noreferrer">{{ t('MARKETING_FOOTER.instagram') }}</a>
            <a href="https://www.facebook.com" target="_blank" rel="noreferrer">{{ t('MARKETING_FOOTER.facebook') }}</a>
          </div>
        </div>
      </footer>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketingFooterComponent {
  private readonly router = inject(Router);
  private readonly lang = inject(LanguageService);
  private readonly transloco = inject(TranslocoService);
  readonly logoUrl = 'https://res.cloudinary.com/dtdpx59sc/image/upload/q_auto/f_auto/v1775625663/142F3705-07E3-43F3-BD40-F5556DD88AEC_uemn1w.png';
  readonly isReady = this.lang.isReady;
  private readonly activeTranslationLang = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });

  t(key: string): string {
    this.activeTranslationLang();
    return this.lang.instant(key);
  }

  localizedPath(path: string): string {
    return this.router.url.startsWith('/fr') ? `/fr${path}` : path;
  }
}