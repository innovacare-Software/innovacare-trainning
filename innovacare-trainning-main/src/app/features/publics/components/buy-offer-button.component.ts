import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CheckoutService } from '../../../core/checkout.service';

@Component({
  selector: 'app-buy-offer-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button class="btn primary" type="button" (click)="buy()" [disabled]="loading">
      {{ loading ? 'Redirecting…' : label }}
    </button>
  `,
})
export class BuyOfferButtonComponent {
  private checkout = inject(CheckoutService);

  @Input({ required: true }) offerId!: string;
  @Input() label = 'Buy Now';

  loading = false;

  async buy(): Promise<void> {
    if (!this.offerId || this.loading) return;

    this.loading = true;
    try {
      const origin = window.location.origin;

      const res = await this.checkout.createCheckoutSession({
        offerId: this.offerId,
        successUrl: `${origin}/checkout/success`,
        cancelUrl: `${origin}/checkout/cancel`,
      });

      if (res?.url) {
        window.location.href = res.url;
      }
    } catch (e) {
      console.error('Checkout failed', e);
      this.loading = false;
    }
  }
}