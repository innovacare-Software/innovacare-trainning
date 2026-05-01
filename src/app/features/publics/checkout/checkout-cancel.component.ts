import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-checkout-cancel',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="checkout-shell cancel-shell">
      <div class="checkout-card">
        <span class="kicker">Checkout interrupted</span>
        <h1>Votre paiement a ete interrompu, pas votre elan</h1>
        <p>
          Votre panier est toujours disponible. Reprenez quand vous voulez, comparez vos options ou revenez finaliser plus tard.
        </p>

        <div class="recovery-grid">
          <article>
            <span>Option 1</span>
            <strong>Revenir au panier</strong>
            <p>Retrouvez exactement votre selection actuelle.</p>
          </article>
          <article>
            <span>Option 2</span>
            <strong>Explorer d'autres offres</strong>
            <p>Comparez programmes, cours et offres avant de valider.</p>
          </article>
        </div>

        <div class="action-row">
          <a class="btn primary" routerLink="/cart">Retour au panier</a>
          <a class="btn ghost" routerLink="/catalogue">Voir le catalogue</a>
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
          radial-gradient(circle at top left, rgba(217, 119, 6, 0.16), transparent 24%),
          radial-gradient(circle at 90% 10%, rgba(21, 94, 117, 0.14), transparent 22%),
          linear-gradient(180deg, #f8f3eb 0%, #fbfcfd 100%);
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
        color: #b45309;
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

      .recovery-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        margin-top: 22px;
      }

      .recovery-grid article {
        padding: 16px;
        border-radius: 18px;
        background: linear-gradient(180deg, rgba(250, 244, 235, 0.96), rgba(255, 255, 255, 0.92));
        border: 1px solid rgba(20, 33, 50, 0.08);
      }

      .recovery-grid span {
        display: inline-block;
        color: #b45309;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        font-weight: 800;
      }

      .recovery-grid strong {
        display: block;
        margin-top: 10px;
        color: #16314e;
        line-height: 1.35;
      }

      .recovery-grid p {
        margin-top: 8px;
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

        .recovery-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class CheckoutCancelComponent {}