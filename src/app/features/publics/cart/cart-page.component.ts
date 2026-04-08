import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { CartService } from '../../../core/cart.service';

@Component({
  selector: 'app-cart-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="cart-shell">
      <header class="cart-head">
        <div>
          <p class="eyebrow">Panier</p>
          <h1>Votre espace d'achat formation</h1>
          <p class="sub">Revoyez vos cours, verifiez les details et finalisez rapidement votre inscription.</p>
        </div>
        <div class="head-actions">
          <a class="link-btn" routerLink="/guest/dashboard">Retour dashboard guest</a>
          <a class="link-btn secondary" routerLink="/catalogue">Continuer les achats</a>
        </div>
      </header>

      <p class="note" *ngIf="!isSignedIn()">
        Vous etes en mode invite. Votre panier est enregistre localement. Connectez-vous pour finaliser le paiement.
      </p>

      <div class="cart-layout" *ngIf="items().length; else emptyTpl">
        <div class="card cart-list">
          <article class="item" *ngFor="let item of items(); let i = index" [style.animationDelay.ms]="i * 70">
            <img
              class="item-image"
              [src]="item.imageUrl || 'https://via.placeholder.com/420x280?text=Course'"
              [alt]="item.title || ('Cours ' + item.itemId)"
            />

            <div class="item-main">
              <h3>{{ item.title || ('Cours ' + item.itemId) }}</h3>
              <p class="muted">Type: {{ item.itemType }} • Ref: {{ item.itemId }}</p>
              <p class="qty">Quantite: {{ item.qty }}</p>
              <p class="badge">Acces instantane apres validation</p>
            </div>

            <div class="item-buybox">
              <p class="unit-price">{{ item.amount | number:'1.2-2' }} {{ item.currency }} / unite</p>
              <strong class="item-total">{{ item.amount * item.qty | number:'1.2-2' }} {{ item.currency }}</strong>
            </div>
          </article>
        </div>

        <aside class="card summary-card">
          <p class="summary-eyebrow">Resume</p>
          <h2>Total panier</h2>
          <p class="summary-amount">{{ amountTotal() | number:'1.2-2' }} {{ currency() }}</p>
          <p class="summary-line">Articles: {{ items().length }}</p>
          <p class="summary-line">Paiement securise et chiffrement actif</p>

          <button class="btn primary" type="button" (click)="checkout()" [disabled]="loading()">
            {{ loading() ? 'Redirection...' : 'Proceder au checkout' }}
          </button>

          <a class="btn ghost" routerLink="/guest/dashboard">Retour dashboard guest</a>
          <a class="btn ghost" routerLink="/catalogue">Ajouter d'autres cours</a>
        </aside>
      </div>

      <ng-template #emptyTpl>
        <div class="card empty">
          <h3>Votre panier est vide</h3>
          <p>Explorez le catalogue et ajoutez une formation pour commencer.</p>
          <div class="empty-actions">
            <a class="btn ghost" routerLink="/guest/dashboard">Retour dashboard guest</a>
            <a class="btn primary" routerLink="/catalogue">Voir le catalogue</a>
          </div>
        </div>
      </ng-template>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        background:
          radial-gradient(circle at 10% 0%, rgba(167, 214, 255, 0.3), transparent 30%),
          radial-gradient(circle at 100% 10%, rgba(255, 224, 168, 0.24), transparent 26%),
          #eff4fa;
      }

      .cart-shell {
        max-width: 1220px;
        margin: 24px auto;
        padding: 0 16px 24px;
        color: #142c49;
      }

      .cart-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 12px;
        padding: 16px;
        border-radius: 16px;
        border: 1px solid #d5e2f2;
        background: linear-gradient(135deg, #155fa9 0%, #0f6cbd 56%, #1f7dcb 100%);
        color: #f7fbff;
      }

      .eyebrow {
        margin: 0;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        font-weight: 800;
        opacity: 0.92;
      }

      .cart-head h1 {
        margin: 6px 0;
        font-size: clamp(22px, 3vw, 34px);
        line-height: 1.12;
      }

      .sub {
        margin: 0;
        max-width: 62ch;
        color: rgba(247, 251, 255, 0.94);
      }

      .head-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .link-btn {
        text-decoration: none;
        border-radius: 999px;
        padding: 9px 12px;
        font-size: 13px;
        font-weight: 700;
        color: #1f2e40;
        background: #ffd814;
        border: 1px solid #efc14d;
        transition: transform 0.16s ease, background-color 0.16s ease;
      }

      .link-btn:hover {
        transform: translateY(-1px);
        background: #f7ca00;
      }

      .link-btn.secondary {
        background: rgba(255, 255, 255, 0.14);
        color: #ffffff;
        border-color: rgba(255, 255, 255, 0.38);
      }

      .card {
        border: 1px solid #d7e2ef;
        border-radius: 16px;
        background: #ffffff;
        box-shadow: 0 8px 24px rgba(18, 48, 86, 0.08);
      }

      .note {
        margin: 12px 0;
        border: 1px solid #bde6d8;
        background: #ecfbf5;
        padding: 10px 12px;
        border-radius: 12px;
        color: #1f5d4b;
      }

      .cart-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 320px;
        gap: 14px;
        align-items: start;
      }

      .cart-list {
        padding: 12px;
      }

      .item {
        display: grid;
        grid-template-columns: 140px 1fr 190px;
        gap: 12px;
        align-items: center;
        padding: 10px;
        border: 1px solid #e3ebf5;
        border-radius: 14px;
        background: linear-gradient(180deg, #ffffff, #fbfdff);
        margin-bottom: 10px;
        opacity: 0;
        transform: translateY(8px);
        animation: rise 420ms ease forwards;
      }

      .item:last-child {
        margin-bottom: 0;
      }

      .item-image {
        width: 100%;
        height: 100px;
        border-radius: 12px;
        object-fit: cover;
        border: 1px solid #dce8f7;
        background: #f4f8fd;
      }

      .item-main h3 {
        margin: 0 0 4px;
        color: #153b70;
        font-size: 17px;
      }

      .muted {
        color: #647c99;
        margin: 0;
        font-size: 13px;
      }

      .qty {
        margin: 6px 0 0;
        font-size: 13px;
        font-weight: 700;
        color: #2f4e73;
      }

      .badge {
        margin: 8px 0 0;
        display: inline-flex;
        border: 1px solid #9de3cb;
        background: #e8fff5;
        color: #0f6d52;
        border-radius: 999px;
        padding: 4px 9px;
        font-size: 12px;
        font-weight: 700;
      }

      .item-buybox {
        border: 1px solid #d8e4f3;
        border-radius: 12px;
        padding: 10px;
        background: linear-gradient(180deg, #ffffff, #f6faff);
        text-align: right;
      }

      .unit-price {
        margin: 0;
        font-size: 12px;
        color: #6a7f9a;
      }

      .item-total {
        display: block;
        margin-top: 6px;
        white-space: nowrap;
        font-size: 18px;
        color: #152a44;
      }

      .summary-card {
        position: sticky;
        top: 16px;
        padding: 14px;
      }

      .summary-eyebrow {
        margin: 0;
        font-size: 11px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        font-weight: 800;
        color: #5f7897;
      }

      .summary-card h2 {
        margin: 8px 0 0;
        font-size: 20px;
      }

      .summary-amount {
        margin: 8px 0 10px;
        font-size: 30px;
        line-height: 1;
        font-weight: 900;
        color: #0b4f8a;
      }

      .summary-line {
        margin: 0 0 6px;
        font-size: 13px;
        color: #607792;
      }

      .btn {
        text-decoration: none;
        border-radius: 999px;
        padding: 10px 14px;
        font-size: 14px;
        font-weight: 800;
        cursor: pointer;
        text-align: center;
        margin-top: 8px;
        border: 1px solid transparent;
        transition: transform 0.16s ease, background-color 0.16s ease;
      }

      .btn:hover {
        transform: translateY(-1px);
      }

      .btn.primary {
        background: #ffd814;
        border-color: #efc14d;
        color: #1f2d3d;
      }

      .btn.primary:disabled {
        opacity: 0.64;
        cursor: not-allowed;
        transform: none;
      }

      .btn.ghost {
        background: #f2f6fb;
        border-color: #ccdbee;
        color: #1f3552;
      }

      .empty {
        padding: 24px;
        text-align: center;
      }

      .empty h3 {
        margin: 0;
      }

      .empty p {
        margin: 8px 0 0;
        color: #647c99;
      }

      .empty-actions {
        margin-top: 14px;
        display: flex;
        justify-content: center;
        gap: 8px;
        flex-wrap: wrap;
      }

      @keyframes rise {
        from {
          opacity: 0;
          transform: translateY(8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @media (max-width: 1024px) {
        .cart-layout {
          grid-template-columns: 1fr;
        }

        .summary-card {
          position: static;
        }
      }

      @media (max-width: 760px) {
        .cart-shell {
          padding: 0 12px 20px;
        }

        .cart-head {
          padding: 14px;
          flex-direction: column;
        }

        .item {
          grid-template-columns: 1fr;
        }

        .item-image {
          height: 180px;
        }

        .item-buybox {
          text-align: left;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .item,
        .btn,
        .link-btn {
          animation: none;
          transition: none;
        }
      }
    `,
  ],
})
export class CartPageComponent implements OnInit {
  private cart = inject(CartService);
  private auth = inject(Auth);
  private router = inject(Router);

  readonly loading = signal(false);
  readonly isSignedIn = signal(false);
  readonly items = signal<Array<{
    offerId: string;
    title: string;
    itemType: 'course' | 'program' | 'live_class';
    itemId: string;
    qty: number;
    amount: number;
    currency: string;
    imageUrl?: string;
  }>>([]);
  readonly amountTotal = signal(0);
  readonly currency = signal('USD');

  async ngOnInit(): Promise<void> {
    this.isSignedIn.set(!!this.auth.currentUser?.uid);
    await this.loadRemoteCart();
  }

  private async loadRemoteCart(): Promise<void> {
    const data = await this.cart.getMyCart('default');
    this.items.set(data.items);
    this.amountTotal.set(data.amountTotal);
    this.currency.set(data.currency);
  }

  async checkout(): Promise<void> {
    this.loading.set(true);
    try {
      const url = await this.cart.checkoutFromCart('default');
      if (url) {
        window.location.href = url;
        return;
      }
      this.loading.set(false);
    } catch (e: any) {
      if (e?.message === 'AUTH_REQUIRED') {
        this.loading.set(false);
        this.router.navigate(['/login'], { queryParams: { returnUrl: '/cart' } });
        return;
      }
      this.loading.set(false);
      console.error('Cart checkout failed', e);
    }
  }
}
