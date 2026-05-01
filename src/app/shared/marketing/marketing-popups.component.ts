import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, OnDestroy, OnInit, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, RouterModule } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { LanguageService } from '../../core/language.service';
import { MarketingLeadsService } from './services/marketing-leads.service';

type PopupKind = 'exit' | 'recommendation' | 'engagement' | null;

@Component({
  selector: 'app-marketing-popups',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatSnackBarModule, TranslocoModule],
  template: `
    @if (canRenderPopup()) {
      <div class="popup-backdrop" (click)="close()">
        <section class="popup-card" (click)="$event.stopPropagation()">
          <button type="button" class="popup-close" (click)="close()" [attr.aria-label]="t('COMMON.close')">×</button>

          @switch (active()) {
            @case ('exit') {
              <div>
                <span class="popup-tag">{{ t('MARKETING_POPUPS.exit.tag') }}</span>
                <h3>{{ t('MARKETING_POPUPS.exit.title') }}</h3>
                <p>{{ t('MARKETING_POPUPS.exit.body') }}</p>
                <label class="popup-field">
                  <span>{{ t('MARKETING_POPUPS.exit.email_label') }}</span>
                  <input
                    [(ngModel)]="discountEmail"
                    name="discountEmail"
                    type="email"
                    [placeholder]="t('MARKETING_POPUPS.exit.email_placeholder')"
                  />
                </label>
                <div class="popup-actions">
                  <button type="button" class="mk-btn mk-btn--primary" [disabled]="submitting()" (click)="claimDiscount()">
                    {{ submitting() ? t('MARKETING_POPUPS.exit.loading') : t('MARKETING_POPUPS.exit.cta') }}
                  </button>
                  <a [routerLink]="localizedPath('/courses')" fragment="nursing" class="mk-btn mk-btn--ghost" (click)="close()">{{ t('MARKETING_POPUPS.exit.skip') }}</a>
                </div>
              </div>
            }

            @case ('recommendation') {
              <div>
                <span class="popup-tag">{{ t('MARKETING_POPUPS.recommendation.tag') }}</span>
                <h3>{{ t('MARKETING_POPUPS.recommendation.title') }}</h3>
                <p>{{ t('MARKETING_POPUPS.recommendation.body') }}</p>
                <a [routerLink]="localizedPath('/courses')" fragment="nursing" class="mk-btn mk-btn--primary" (click)="close()">{{ t('MARKETING_POPUPS.recommendation.cta') }}</a>
              </div>
            }

            @case ('engagement') {
              <div>
                <span class="popup-tag">{{ t('MARKETING_POPUPS.engagement.tag') }}</span>
                <h3>{{ t('MARKETING_POPUPS.engagement.title') }}</h3>
                <p>{{ t('MARKETING_POPUPS.engagement.body') }}</p>
                <a [routerLink]="localizedPath('/home')" fragment="quiz" class="mk-btn mk-btn--primary" (click)="close()">{{ t('MARKETING_POPUPS.engagement.cta') }}</a>
              </div>
            }
          }
        </section>
      </div>
    }
  `,
  styles: [`
    .popup-backdrop { position: fixed; inset: 0; z-index: 1200; display: grid; place-items: center; padding: 1rem; background: rgba(5, 16, 29, 0.58); backdrop-filter: blur(8px); }
    .popup-card { width: min(100%, 32rem); border-radius: 1.5rem; background: linear-gradient(180deg, #ffffff, #f8fbff); padding: 1.25rem; box-shadow: 0 24px 64px rgba(7, 18, 32, 0.24); position: relative; }
    .popup-close { position: absolute; top: 0.75rem; right: 0.75rem; width: 2.1rem; height: 2.1rem; border: 0; border-radius: 999px; background: rgba(16, 35, 63, 0.06); cursor: pointer; font-size: 1.2rem; }
    .popup-tag { display: inline-flex; margin-bottom: 0.7rem; padding: 0.38rem 0.65rem; border-radius: 999px; background: rgba(23, 183, 196, 0.1); color: #0b7285; font-size: 0.74rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; }
    .popup-card h3 { margin: 0; font-size: 1.6rem; line-height: 1.15; color: #10233f; }
    .popup-card p { margin: 0.7rem 0 0; color: #55657e; line-height: 1.7; }
    .popup-field { display: grid; gap: 0.4rem; margin-top: 1rem; }
    .popup-field span { font-size: 0.78rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #55769b; }
    .popup-field input { width: 100%; min-height: 3rem; border-radius: 1rem; border: 1px solid rgba(15, 35, 63, 0.12); padding: 0.85rem 0.95rem; font: inherit; }
    .popup-actions { display: flex; flex-wrap: wrap; gap: 0.7rem; margin-top: 1rem; }
    .mk-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 3rem; padding: 0.85rem 1rem; border-radius: 999px; font-weight: 800; text-decoration: none; border: 1px solid transparent; cursor: pointer; }
    .mk-btn--primary { background: linear-gradient(135deg, #16b7c4, #58d1f7); color: #062237; }
    .mk-btn--ghost { background: #fff; color: #123d66; border-color: rgba(18, 61, 102, 0.16); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketingPopupsComponent implements OnInit, OnDestroy {
  private readonly marketingLeads = inject(MarketingLeadsService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly lang = inject(LanguageService);
  private readonly transloco = inject(TranslocoService);
  private readonly activeTranslationLang = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });

  readonly active = signal<PopupKind>(null);
  readonly canRenderPopup = computed(() => this.lang.isReady() && this.active() !== null);
  readonly submitting = signal(false);
  private readonly pendingPopup = signal<Exclude<PopupKind, null> | null>(null);
  private engagementTimer?: ReturnType<typeof setTimeout>;
  private recommendationShown = false;
  private exitShown = false;
  discountEmail = '';

  constructor() {
    effect(() => {
      if (!this.lang.isReady() || this.active()) {
        return;
      }

      const queuedPopup = this.pendingPopup();
      if (!queuedPopup) {
        return;
      }

      this.active.set(queuedPopup);
      this.pendingPopup.set(null);
    });
  }

  t(key: string): string {
    this.activeTranslationLang();
    return this.lang.instant(key);
  }

  localizedPath(path: string): string {
    return this.router.url.startsWith('/fr') ? `/fr${path}` : path;
  }

  ngOnInit(): void {
    this.engagementTimer = setTimeout(() => {
      this.requestPopup('engagement');
    }, 12000);
  }

  ngOnDestroy(): void {
    if (this.engagementTimer) clearTimeout(this.engagementTimer);
  }

  @HostListener('window:scroll')
  onScroll(): void {
    if (!this.recommendationShown && window.scrollY > 1100 && !this.active()) {
      this.recommendationShown = true;
      this.requestPopup('recommendation');
    }
  }

  @HostListener('document:mouseout', ['$event'])
  onMouseOut(event: MouseEvent): void {
    if (this.exitShown || this.active()) return;
    if (event.clientY <= 0) {
      this.exitShown = true;
      this.requestPopup('exit');
    }
  }

  private requestPopup(kind: Exclude<PopupKind, null>): void {
    if (!this.lang.isReady()) {
      this.pendingPopup.set(kind);
      return;
    }

    if (!this.active()) {
      this.active.set(kind);
    }
  }

  close(): void {
    this.active.set(null);
  }

  async claimDiscount(): Promise<void> {
    const email = this.discountEmail.trim();
    if (!email || this.submitting()) {
      if (!email) {
        this.snackBar.open(this.t('MARKETING_POPUPS.exit.email_required'), this.t('COMMON.close'), { duration: 4000 });
      }
      return;
    }

    this.submitting.set(true);
    try {
      await this.marketingLeads.submitLead({
        name: 'Discount Prospect',
        email,
        interest: 'nclex-discount',
        message: 'Requested exit intent 20% NCLEX prep discount.',
        source: 'popup',
      });

      this.close();
      await this.router.navigateByUrl(this.router.createUrlTree([this.localizedPath('/courses')], {
        fragment: 'nursing',
        queryParams: {
          source: 'popup',
          offer: 'NCLEX20',
        },
      }));
      this.snackBar.open(this.t('MARKETING_POPUPS.exit.success'), this.t('COMMON.close'), {
        duration: 5000,
      });
      this.discountEmail = '';
    } finally {
      this.submitting.set(false);
    }
  }
}