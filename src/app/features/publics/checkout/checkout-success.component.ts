import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

type CheckoutSuccessCopy = {
  kicker: string;
  title: string;
  description: string;
  pills: [string, string, string];
  steps: [string, string, string];
  primaryCta: string;
  primaryLink: string;
  secondaryCta: string;
  secondaryLink: string;
};

@Component({
  selector: 'app-checkout-success',
  standalone: true,
  imports: [CommonModule, RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="checkout-shell success-shell">
      <div class="checkout-card">
        <span class="kicker">{{ copy().kicker }}</span>
        <h1>{{ copy().title }}</h1>
        <p>{{ copy().description }}</p>

        <div class="pill-row">
          @for (pill of copy().pills; track pill) {
            <span class="pill">{{ pill }}</span>
          }
        </div>

        <div class="status-panel">
          <article>
            <span>Etape 1</span>
            <strong>{{ copy().steps[0] }}</strong>
          </article>
          <article>
            <span>Etape 2</span>
            <strong>{{ copy().steps[1] }}</strong>
          </article>
          <article>
            <span>Etape 3</span>
            <strong>{{ copy().steps[2] }}</strong>
          </article>
        </div>

        <div class="action-row">
          <a class="btn primary" [routerLink]="copy().primaryLink">{{ copy().primaryCta }}</a>
          <a class="btn ghost" [routerLink]="copy().secondaryLink">{{ copy().secondaryCta }}</a>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100%;
        background:
          radial-gradient(circle at top left, rgba(15, 118, 110, 0.18), transparent 24%),
          radial-gradient(circle at 90% 10%, rgba(21, 94, 117, 0.14), transparent 22%),
          linear-gradient(180deg, #f2f7f6 0%, #fbfcfd 100%);
      }

      .checkout-shell {
        min-height: calc(100vh - 80px);
        display: grid;
        place-items: center;
        padding: 32px 16px;
      }

      .checkout-card {
        width: min(760px, 100%);
        padding: 28px;
        border-radius: 28px;
        border: 1px solid rgba(20, 33, 50, 0.08);
        background: rgba(255, 255, 255, 0.9);
        box-shadow: 0 24px 56px rgba(20, 33, 50, 0.1);
        text-align: center;
      }

      .kicker {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        font-weight: 800;
        color: #0f766e;
      }

      h1 {
        margin: 10px 0 0;
        font-family: 'Iowan Old Style', 'Palatino Linotype', Georgia, serif;
        font-size: clamp(32px, 5vw, 54px);
        line-height: 1.02;
        letter-spacing: -0.03em;
        color: #142132;
      }

      p {
        max-width: 58ch;
        margin: 14px auto 0;
        color: #4d6074;
        line-height: 1.75;
      }

      .pill-row {
        display: flex;
        justify-content: center;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 18px;
      }

      .pill {
        padding: 9px 12px;
        border-radius: 999px;
        background: rgba(235, 250, 246, 0.94);
        border: 1px solid rgba(15, 118, 110, 0.16);
        color: #155e52;
        font-size: 13px;
        font-weight: 800;
      }

      .status-panel {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
        margin-top: 22px;
      }

      .status-panel article {
        padding: 16px;
        border-radius: 18px;
        background: linear-gradient(180deg, rgba(244, 249, 249, 0.96), rgba(255, 255, 255, 0.92));
        border: 1px solid rgba(20, 33, 50, 0.08);
      }

      .status-panel span {
        display: inline-block;
        color: #0f766e;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        font-weight: 800;
      }

      .status-panel strong {
        display: block;
        margin-top: 10px;
        color: #16314e;
        line-height: 1.35;
      }

      .action-row {
        display: flex;
        justify-content: center;
        gap: 10px;
        flex-wrap: wrap;
        margin-top: 22px;
      }

      .btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 44px;
        padding: 12px 16px;
        border-radius: 999px;
        text-decoration: none;
        font-size: 14px;
        font-weight: 800;
      }

      .btn.primary {
        background: linear-gradient(135deg, #155e75, #0f766e);
        color: #fff;
        box-shadow: 0 14px 28px rgba(21, 94, 117, 0.2);
      }

      .btn.ghost {
        background: rgba(245, 248, 251, 0.96);
        border: 1px solid rgba(20, 33, 50, 0.08);
        color: #16314e;
      }

      @media (max-width: 760px) {
        .checkout-card {
          padding: 22px 18px;
        }

        .status-panel {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class CheckoutSuccessComponent {
  private readonly route = inject(ActivatedRoute);

  private readonly purchase = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('purchase') || '')),
    { initialValue: '' }
  );

  readonly copy = computed<CheckoutSuccessCopy>(() => {
    if (this.purchase() === 'global-nurse-pack') {
      return {
        kicker: 'Global nurse pack unlocked',
        title: 'Paiement confirme, votre feuille de route internationale est prete',
        description:
          'Votre achat du Global Nurse Licensing Starter Pack a bien ete enregistre. L acces est en cours d activation et vos prochaines etapes USA, Canada et UAE sont pretes.',
        pills: ['Paiement valide', 'Pack active', 'Acces international'],
        steps: ['Commande confirmee', 'Pack attribue a votre compte', 'Accedez a votre feuille de route'],
        primaryCta: 'Voir mes programmes',
        primaryLink: '/my-programs',
        secondaryCta: 'Ouvrir le dashboard',
        secondaryLink: '/guest/dashboard',
      };
    }

    return {
      kicker: 'Checkout completed',
      title: 'Paiement confirme, acces en cours d activation',
      description:
        'Votre achat a bien ete enregistre. Innovacare prepare votre espace, vos contenus et vos prochaines actions recommandees.',
      pills: ['Paiement valide', 'Activation en cours', 'Acces premium'],
      steps: ['Commande confirmee', 'Acces attribue', 'Reprise de votre parcours'],
      primaryCta: 'Ouvrir le dashboard',
      primaryLink: '/guest/dashboard',
      secondaryCta: 'Voir mes programmes',
      secondaryLink: '/my-programs',
    };
  });
}