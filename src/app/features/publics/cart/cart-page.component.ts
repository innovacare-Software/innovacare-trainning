import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { CartService } from '../../../core/cart.service';

type CartItemType = 'course' | 'program' | 'live_class';

type CartItem = {
  offerId: string;
  title: string;
  itemType: CartItemType;
  itemId: string;
  qty: number;
  amount: number;
  currency: string;
  imageUrl?: string;
};

@Component({
  selector: 'app-cart-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="arx-cart-page">
      <header class="arx-cart-hero">
        <div class="arx-cart-hero__copy">
          <p class="arx-eyebrow">Cart</p>
          <h1>Finalize your premium learning plan</h1>
          <p class="arx-sub">
            Review your training selections, confirm pricing, and move to secure checkout
            in a cleaner and more premium enrollment flow.
          </p>

          <div class="arx-hero-stats">
            <article class="arx-stat-card">
              <strong>{{ itemCount() }}</strong>
              <span>Total seats</span>
            </article>

            <article class="arx-stat-card">
              <strong>{{ amountTotal() | number:'1.2-2' }}</strong>
              <span>{{ currency() }} total</span>
            </article>

            <article class="arx-stat-card">
              <strong>Secure</strong>
              <span>Encrypted checkout</span>
            </article>
          </div>

          <div class="arx-hero-actions">
            <a class="arx-btn arx-btn--light" routerLink="/catalogue">Continue shopping</a>
            <a class="arx-btn arx-btn--ghostlight" routerLink="/guest/dashboard">Guest dashboard</a>
          </div>
        </div>

        <div class="arx-cart-hero__panel">
          <div class="arx-panel-glow"></div>

          <article class="arx-panel-card arx-panel-card--main">
            <div class="arx-panel-card__content">
              <span>Enrollment ready</span>
              <strong>Fast checkout for premium course access</strong>
              <small>Courses, programs and live classes are organized for a cleaner purchase flow.</small>
            </div>
          </article>

          <div class="arx-floating-chip arx-floating-chip--top">
            <strong>{{ items().length }}</strong>
            <span>Line items</span>
          </div>

          <div class="arx-floating-chip arx-floating-chip--bottom">
            <strong>{{ isSignedIn() ? 'Signed in' : 'Guest mode' }}</strong>
            <span>{{ isSignedIn() ? 'Ready for payment' : 'Login may be required' }}</span>
          </div>
        </div>
      </header>

      <p class="arx-guest-note" *ngIf="!isSignedIn()">
        You are currently browsing as a guest. Your cart is preserved, but you may be asked to sign in before completing payment.
      </p>

      <div class="arx-cart-layout" *ngIf="hasItems(); else emptyTpl">
        <div class="arx-cart-list">
          <article
            class="arx-cart-item"
            *ngFor="let item of items(); let i = index"
            [style.animationDelay.ms]="i * 70"
          >
            <div class="arx-cart-item__thumb">
              <img
                [src]="getItemImage(item)"
                [alt]="item.title || ('Item ' + item.itemId)"
              />

              <div class="arx-cart-item__overlay"></div>

              <div class="arx-cart-item__badges">
                <span class="arx-pill arx-pill--glass">{{ getItemTypeLabel(item.itemType) }}</span>
                <span class="arx-pill arx-pill--dark">Qty {{ item.qty }}</span>
              </div>
            </div>

            <div class="arx-cart-item__body">
              <div class="arx-cart-item__topline">
                <div>
                  <h3>{{ item.title || ('Course ' + item.itemId) }}</h3>
                  <p class="arx-muted">
                    Ref: {{ item.itemId }} • Offer: {{ item.offerId }}
                  </p>
                </div>

                <div class="arx-track-chip">
                  {{ item.currency }}
                </div>
              </div>

              <p class="arx-description">
                Premium learning access with fast enrollment flow and secure post-payment activation.
              </p>

              <div class="arx-meta-row">
                <span class="arx-meta-pill">Instant access after validation</span>
                <span class="arx-meta-pill">Secure checkout</span>
                <span class="arx-meta-pill">{{ getItemTypeLabel(item.itemType) }}</span>
              </div>
            </div>

            <div class="arx-cart-item__buybox">
              <p class="arx-unit-price">
                {{ item.amount | number:'1.2-2' }} {{ item.currency }} / unit
              </p>
              <strong class="arx-item-total">
                {{ item.amount * item.qty | number:'1.2-2' }} {{ item.currency }}
              </strong>
              <small class="arx-buybox-note">Taxes and gateway rules may apply at checkout.</small>
            </div>
          </article>
        </div>

        <aside class="arx-summary-card">
          <p class="arx-summary-eyebrow">Order summary</p>
          <h2>Total cart</h2>
          <p class="arx-summary-amount">
            {{ amountTotal() | number:'1.2-2' }} {{ currency() }}
          </p>

          <div class="arx-summary-lines">
            <p><span>Line items</span><strong>{{ items().length }}</strong></p>
            <p><span>Total seats</span><strong>{{ itemCount() }}</strong></p>
            <p><span>Payment mode</span><strong>Secure checkout</strong></p>
          </div>

          <button
            class="arx-btn arx-btn--primary arx-btn--full"
            type="button"
            (click)="checkout()"
            [disabled]="loading()"
          >
            {{ loading() ? 'Redirecting...' : 'Proceed to checkout' }}
          </button>

          <a class="arx-btn arx-btn--secondary arx-btn--full" routerLink="/catalogue">
            Add more courses
          </a>

          <a class="arx-btn arx-btn--ghost arx-btn--full" routerLink="/guest/dashboard">
            Return to guest dashboard
          </a>

          <div class="arx-summary-trust">
            <strong>Why this feels safer</strong>
            <ul>
              <li>Encrypted checkout flow</li>
              <li>Cart preserved across navigation</li>
              <li>Authentication fallback if required</li>
            </ul>
          </div>
        </aside>
      </div>

      <ng-template #emptyTpl>
        <div class="arx-empty-card">
          <div class="arx-empty-card__icon">🛒</div>
          <h3>Your cart is empty</h3>
          <p>
            Browse the catalogue and add a course, program, or live class to begin your enrollment.
          </p>

          <div class="arx-empty-actions">
            <a class="arx-btn arx-btn--ghost" routerLink="/guest/dashboard">Guest dashboard</a>
            <a class="arx-btn arx-btn--primary" routerLink="/catalogue">View catalogue</a>
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
          radial-gradient(circle at 8% 0%, rgba(88, 209, 247, 0.16), transparent 24%),
          radial-gradient(circle at 100% 10%, rgba(24, 184, 197, 0.12), transparent 26%),
          #f6f8fc;
      }

      .arx-cart-page {
        --arx-ink: #10233f;
        --arx-ink-soft: #60708a;
        --arx-line: rgba(16, 35, 63, 0.1);
        --arx-blue: #0b2d57;
        --arx-teal: #18b8c5;
        --arx-cyan: #58d1f7;
        --arx-shadow: 0 26px 70px rgba(8, 23, 44, 0.12);
        --arx-shadow-soft: 0 16px 40px rgba(8, 23, 44, 0.08);
        max-width: 1240px;
        margin: 0 auto;
        padding: 24px 16px 32px;
        color: var(--arx-ink);
      }

      .arx-cart-hero {
        display: grid;
        grid-template-columns: minmax(0, 1.15fr) minmax(320px, 460px);
        gap: 20px;
        align-items: center;
        padding: 22px;
        border-radius: 28px;
        overflow: hidden;
        position: relative;
        background:
          radial-gradient(circle at 16% 12%, rgba(60, 214, 210, 0.14), transparent 20%),
          radial-gradient(circle at 85% 10%, rgba(95, 130, 255, 0.15), transparent 24%),
          linear-gradient(135deg, #07192f 0%, #0c355f 45%, #0d5c73 100%);
        color: #fff;
        box-shadow: var(--arx-shadow);
      }

      .arx-cart-hero__copy h1 {
        margin: 6px 0 10px;
        font-size: clamp(28px, 4vw, 48px);
        line-height: 1.04;
        letter-spacing: -0.03em;
        max-width: 11ch;
      }

      .arx-eyebrow {
        margin: 0;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #93edf5;
      }

      .arx-sub {
        margin: 0;
        max-width: 60ch;
        line-height: 1.75;
        color: rgba(255, 255, 255, 0.84);
      }

      .arx-hero-stats {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
        margin-top: 18px;
      }

      .arx-stat-card {
        padding: 12px;
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.14);
        backdrop-filter: blur(12px);
      }

      .arx-stat-card strong {
        display: block;
        font-size: 20px;
        margin-bottom: 4px;
      }

      .arx-stat-card span {
        color: rgba(255, 255, 255, 0.78);
        font-size: 13px;
      }

      .arx-hero-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 18px;
      }

      .arx-cart-hero__panel {
        min-height: 320px;
        position: relative;
      }

      .arx-panel-glow {
        position: absolute;
        inset: 8% 2% auto auto;
        width: 78%;
        height: 78%;
        border-radius: 50%;
        background:
          radial-gradient(circle at center, rgba(24, 184, 197, 0.16), transparent 42%),
          conic-gradient(from 210deg, rgba(24, 184, 197, 0.2), rgba(88, 209, 247, 0.05), transparent 70%);
        filter: blur(12px);
      }

      .arx-panel-card {
        position: absolute;
        overflow: hidden;
        border-radius: 28px;
        border: 1px solid rgba(255, 255, 255, 0.16);
        box-shadow: 0 28px 90px rgba(0, 0, 0, 0.25);
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.06)),
          linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
        backdrop-filter: blur(16px);
      }

      .arx-panel-card--main {
        inset: 10% 8% 8% 10%;
        transform: rotate(-2deg);
        animation: arxFloatMain 10s ease-in-out infinite;
      }

      .arx-panel-card__content {
        position: absolute;
        left: 20px;
        right: 20px;
        bottom: 20px;
        display: grid;
        gap: 6px;
        color: #fff;
      }

      .arx-panel-card__content span {
        color: #9aeaf1;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-weight: 800;
      }

      .arx-panel-card__content strong {
        font-size: 22px;
        line-height: 1.15;
      }

      .arx-panel-card__content small {
        color: rgba(255, 255, 255, 0.8);
        line-height: 1.6;
      }

      .arx-floating-chip {
        position: absolute;
        z-index: 2;
        display: grid;
        gap: 2px;
        padding: 12px 14px;
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.92);
        color: var(--arx-blue);
        box-shadow: var(--arx-shadow-soft);
      }

      .arx-floating-chip strong {
        font-size: 18px;
        line-height: 1;
      }

      .arx-floating-chip span {
        color: #5c6980;
        font-size: 12px;
      }

      .arx-floating-chip--top {
        top: 12%;
        left: 0;
      }

      .arx-floating-chip--bottom {
        right: 2%;
        bottom: 4%;
      }

      .arx-guest-note {
        margin: 14px 0 0;
        padding: 12px 14px;
        border-radius: 16px;
        border: 1px solid rgba(24, 184, 197, 0.18);
        background: rgba(255, 255, 255, 0.84);
        color: #145566;
        box-shadow: var(--arx-shadow-soft);
      }

      .arx-cart-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 340px;
        gap: 16px;
        align-items: start;
        margin-top: 16px;
      }

      .arx-cart-list {
        display: grid;
        gap: 12px;
      }

      .arx-cart-item {
        display: grid;
        grid-template-columns: 220px minmax(0, 1fr) 220px;
        gap: 14px;
        align-items: stretch;
        padding: 12px;
        border-radius: 24px;
        border: 1px solid rgba(16, 35, 63, 0.08);
        background: rgba(255, 255, 255, 0.88);
        box-shadow: var(--arx-shadow-soft);
        backdrop-filter: blur(14px);
        opacity: 0;
        transform: translateY(8px);
        animation: rise 420ms ease forwards;
      }

      .arx-cart-item__thumb {
        position: relative;
        min-height: 160px;
        border-radius: 18px;
        overflow: hidden;
        background: #dfe8f2;
      }

      .arx-cart-item__thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .arx-cart-item__overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, rgba(6, 19, 38, 0.05), rgba(6, 19, 38, 0.28));
      }

      .arx-cart-item__badges {
        position: absolute;
        top: 10px;
        left: 10px;
        right: 10px;
        display: flex;
        justify-content: space-between;
        gap: 8px;
        z-index: 2;
      }

      .arx-pill {
        display: inline-flex;
        align-items: center;
        min-height: 30px;
        padding: 6px 10px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 800;
      }

      .arx-pill--glass {
        background: rgba(255, 255, 255, 0.16);
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.14);
        backdrop-filter: blur(12px);
      }

      .arx-pill--dark {
        background: rgba(11, 45, 87, 0.92);
        color: #fff;
      }

      .arx-cart-item__body {
        padding: 4px 0;
      }

      .arx-cart-item__topline {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        align-items: start;
      }

      .arx-cart-item__body h3 {
        margin: 0 0 4px;
        font-size: 22px;
        line-height: 1.18;
        color: var(--arx-blue);
      }

      .arx-muted {
        margin: 0;
        color: var(--arx-ink-soft);
        font-size: 13px;
      }

      .arx-track-chip {
        display: inline-flex;
        align-items: center;
        min-height: 30px;
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(24, 184, 197, 0.12);
        color: #0c7480;
        font-size: 12px;
        font-weight: 800;
        white-space: nowrap;
      }

      .arx-description {
        margin: 12px 0 0;
        color: var(--arx-ink-soft);
        line-height: 1.72;
      }

      .arx-meta-row {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 14px;
      }

      .arx-meta-pill {
        display: inline-flex;
        align-items: center;
        min-height: 30px;
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(11, 45, 87, 0.06);
        color: var(--arx-blue);
        font-size: 12px;
        font-weight: 700;
      }

      .arx-cart-item__buybox {
        display: grid;
        align-content: center;
        gap: 6px;
        padding: 14px;
        border-radius: 18px;
        border: 1px solid rgba(16, 35, 63, 0.08);
        background: linear-gradient(180deg, #ffffff, #f7fbff);
      }

      .arx-unit-price {
        margin: 0;
        font-size: 12px;
        color: var(--arx-ink-soft);
      }

      .arx-item-total {
        font-size: 28px;
        line-height: 1;
        color: var(--arx-ink);
      }

      .arx-buybox-note {
        color: var(--arx-ink-soft);
        line-height: 1.55;
      }

      .arx-summary-card {
        position: sticky;
        top: 16px;
        padding: 18px;
        border-radius: 24px;
        border: 1px solid rgba(16, 35, 63, 0.08);
        background: rgba(255, 255, 255, 0.9);
        box-shadow: var(--arx-shadow-soft);
        backdrop-filter: blur(16px);
      }

      .arx-summary-eyebrow {
        margin: 0;
        font-size: 11px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        font-weight: 800;
        color: var(--arx-teal);
      }

      .arx-summary-card h2 {
        margin: 8px 0 0;
        font-size: 24px;
        line-height: 1.1;
      }

      .arx-summary-amount {
        margin: 10px 0 14px;
        font-size: 38px;
        line-height: 1;
        font-weight: 900;
        color: var(--arx-blue);
      }

      .arx-summary-lines {
        display: grid;
        gap: 8px;
        margin-bottom: 14px;
      }

      .arx-summary-lines p {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        margin: 0;
        padding-bottom: 8px;
        border-bottom: 1px solid rgba(16, 35, 63, 0.08);
        color: var(--arx-ink-soft);
      }

      .arx-summary-lines strong {
        color: var(--arx-ink);
      }

      .arx-summary-trust {
        margin-top: 14px;
        padding: 14px;
        border-radius: 18px;
        background: rgba(11, 45, 87, 0.04);
        border: 1px solid rgba(16, 35, 63, 0.06);
      }

      .arx-summary-trust strong {
        display: block;
        margin-bottom: 8px;
      }

      .arx-summary-trust ul {
        margin: 0;
        padding-left: 18px;
        color: var(--arx-ink-soft);
      }

      .arx-summary-trust li + li {
        margin-top: 6px;
      }

      .arx-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 46px;
        padding: 12px 16px;
        border-radius: 999px;
        border: 1px solid transparent;
        text-decoration: none;
        font-size: 14px;
        font-weight: 800;
        cursor: pointer;
        transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
      }

      .arx-btn:hover {
        transform: translateY(-1px);
      }

      .arx-btn--full {
        width: 100%;
        margin-top: 10px;
      }

      .arx-btn--primary {
        background: linear-gradient(135deg, var(--arx-teal), var(--arx-cyan));
        color: #062237;
        box-shadow: 0 16px 30px rgba(88, 209, 247, 0.22);
      }

      .arx-btn--secondary {
        background: #ffffff;
        color: var(--arx-blue);
        border-color: rgba(16, 35, 63, 0.1);
      }

      .arx-btn--ghost {
        background: rgba(11, 45, 87, 0.06);
        color: var(--arx-blue);
        border-color: rgba(16, 35, 63, 0.08);
      }

      .arx-btn--light {
        background: #ffffff;
        color: var(--arx-blue);
      }

      .arx-btn--ghostlight {
        background: rgba(255, 255, 255, 0.08);
        color: #fff;
        border-color: rgba(255, 255, 255, 0.16);
      }

      .arx-btn:disabled {
        opacity: 0.65;
        cursor: not-allowed;
        transform: none;
      }

      .arx-empty-card {
        margin-top: 16px;
        padding: 34px 20px;
        border-radius: 28px;
        border: 1px solid rgba(16, 35, 63, 0.08);
        background: rgba(255, 255, 255, 0.9);
        box-shadow: var(--arx-shadow-soft);
        text-align: center;
      }

      .arx-empty-card__icon {
        font-size: 46px;
        line-height: 1;
      }

      .arx-empty-card h3 {
        margin: 12px 0 0;
        font-size: 28px;
        line-height: 1.1;
      }

      .arx-empty-card p {
        margin: 10px auto 0;
        max-width: 56ch;
        color: var(--arx-ink-soft);
        line-height: 1.75;
      }

      .arx-empty-actions {
        margin-top: 16px;
        display: flex;
        justify-content: center;
        gap: 10px;
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

      @keyframes arxFloatMain {
        0%, 100% {
          transform: rotate(-2deg) translateY(0);
        }
        50% {
          transform: rotate(-1deg) translateY(-10px);
        }
      }

      @media (max-width: 1100px) {
        .arx-cart-hero,
        .arx-cart-layout,
        .arx-cart-item {
          grid-template-columns: 1fr;
        }

        .arx-cart-hero__copy h1 {
          max-width: none;
        }

        .arx-hero-stats {
          grid-template-columns: 1fr;
        }

        .arx-summary-card {
          position: static;
        }
      }

      @media (max-width: 760px) {
        .arx-cart-page {
          padding: 16px 12px 24px;
        }

        .arx-cart-hero {
          padding: 18px;
          border-radius: 22px;
        }

        .arx-cart-hero__panel {
          min-height: 240px;
        }

        .arx-panel-card--main {
          inset: 12% 4% 6% 6%;
        }

        .arx-cart-item__thumb {
          min-height: 220px;
        }

        .arx-cart-item__topline {
          flex-direction: column;
          align-items: start;
        }

        .arx-item-total {
          font-size: 24px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .arx-cart-item,
        .arx-btn,
        .arx-panel-card--main {
          animation: none;
          transition: none;
        }
      }
    `,
  ],
})
export class CartPageComponent implements OnInit {
  private readonly cart = inject(CartService);
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly isSignedIn = signal(false);
  readonly items = signal<CartItem[]>([]);
  readonly amountTotal = signal(0);
  readonly currency = signal('USD');

  readonly itemCount = computed(() =>
    this.items().reduce((sum, item) => sum + (item.qty || 0), 0)
  );

  readonly hasItems = computed(() => this.items().length > 0);

  private readonly fallbackImages: Record<CartItemType, string> = {
    course:
      'https://res.cloudinary.com/dtdpx59sc/image/upload/v1778121787/ChatGPT_Image_6_mai_2026_22_40_09_2_ibwoar.png',
    program:
      'https://res.cloudinary.com/dtdpx59sc/image/upload/v1778121787/ChatGPT_Image_6_mai_2026_22_40_08_1_gv03b6.png',
    live_class:
      'https://res.cloudinary.com/dtdpx59sc/image/upload/v1778121787/ChatGPT_Image_6_mai_2026_22_37_36_2_jmmn4p.png',
  };

  async ngOnInit(): Promise<void> {
    this.isSignedIn.set(!!this.auth.currentUser?.uid);
    await this.loadRemoteCart();
  }

  getItemImage(item: CartItem): string {
    const direct = (item.imageUrl || '').trim();
    if (direct) return direct;
    return this.fallbackImages[item.itemType] || this.fallbackImages.course;
  }

  getItemTypeLabel(itemType: CartItemType): string {
    if (itemType === 'live_class') return 'Live Class';
    if (itemType === 'program') return 'Program';
    return 'Course';
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
        this.router.navigate(['/register'], { queryParams: { returnUrl: '/cart' } });
        return;
      }

      this.loading.set(false);
      console.error('Cart checkout failed', e);
    }
  }
}