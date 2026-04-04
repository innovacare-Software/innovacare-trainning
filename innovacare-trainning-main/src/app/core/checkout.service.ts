import { Injectable } from '@angular/core';
import { Functions } from '@angular/fire/functions';
import { httpsCallable } from 'firebase/functions';

@Injectable({
  providedIn: 'root',
})
export class CheckoutService {
  constructor(private functions: Functions) {}

  async startCheckout(offerId?: string): Promise<void> {
    if (!offerId) throw new Error('offerId manquant');

    const origin = window.location.origin;

    const session = await this.createCheckoutSession({
      offerId,
      successUrl: `${origin}/checkout/success`,
      cancelUrl: `${origin}/checkout/cancel`,
    });

    window.location.href = session.url;
  }

  async createCheckoutSession(input: {
    offerId?: string;
    cartId?: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string }> {
    if (!input.offerId && !input.cartId) {
      throw new Error('offerId/cartId manquant');
    }

    const fn = httpsCallable<
      {
        offerId?: string;
        cartId?: string;
        successUrl: string;
        cancelUrl: string;
      },
      { url?: string | null }
    >(this.functions, 'createCheckoutSession');

    const res = await fn(input);
    const url = String(res.data?.url || '').trim();

    if (!url) {
      throw new Error('Checkout URL manquante');
    }

    return { url };
  }
}