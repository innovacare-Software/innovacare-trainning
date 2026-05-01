import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CartService } from '../../../core/cart.service';

@Component({
  selector: 'app-buy-offer-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="buy-actions">
      <button class="btn soft" type="button" (click)="addToCart()" [disabled]="loading">
        {{ loading ? 'Adding…' : label }}
      </button>
      <button class="btn primary" type="button" (click)="checkoutNow()" [disabled]="loading">
        {{ loading ? 'Redirecting…' : 'Checkout Now' }}
      </button>
    </div>
  `,
})
export class BuyOfferButtonComponent {
  private cart = inject(CartService);
  private router = inject(Router);

  @Input({ required: true }) offerId!: string;
  @Input() label = 'Add to Cart';

  loading = false;

  private redirectToRegister(returnUrl = this.router.url): void {
    void this.router.navigate(['/register'], {
      queryParams: { returnUrl },
    });
  }

  async addToCart(): Promise<void> {
    if (!this.offerId || this.loading) return;

    this.loading = true;
    try {
      await this.cart.addOffer(this.offerId);
    } catch (e: any) {
      if (e?.message === 'AUTH_REQUIRED') {
        this.redirectToRegister();
        return;
      }

      console.error('Add to cart failed', e);
    } finally {
      this.loading = false;
    }
  }

  async checkoutNow(): Promise<void> {
    if (!this.offerId || this.loading) return;

    this.loading = true;
    try {
      await this.cart.addOffer(this.offerId);
      const url = await this.cart.checkoutFromCart('default');
      if (url) {
        window.location.href = url;
        return;
      }
      this.loading = false;
    } catch (e: any) {
      if (e?.message === 'AUTH_REQUIRED') {
        this.loading = false;
        this.redirectToRegister();
        return;
      }

      console.error('Checkout failed', e);
      this.loading = false;
    }
  }
}