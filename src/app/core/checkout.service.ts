import { Injectable } from '@angular/core';
import { Functions } from '@angular/fire/functions';
import { httpsCallable } from 'firebase/functions';

@Injectable({
  providedIn: 'root',
})
export class CheckoutService {
  constructor(private functions: Functions) {}

  private extractServerMessage(error: unknown): string | null {
    const err = error as {
      message?: string;
      details?: { message?: string };
      customData?: { message?: string };
    } | null;

    const fromDetails = String(err?.details?.message || '').trim();
    if (fromDetails) return fromDetails;

    const fromCustomData = String(err?.customData?.message || '').trim();
    if (fromCustomData) return fromCustomData;

    const fromMessage = String(err?.message || '').trim();
    if (fromMessage) {
      const stripped = fromMessage.replace(/^FirebaseError:\s*/i, '').trim();
      return stripped || fromMessage;
    }

    return null;
  }

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

    try {
      const res = await fn(input);
      const url = String(res.data?.url || '').trim();

      if (!url) {
        throw new Error('Checkout URL manquante');
      }

      return { url };
    } catch (error) {
      const message = this.extractServerMessage(error) || 'Échec de création de session checkout';
      throw new Error(message);
    }
  }

  async startProgramCheckout(enrollmentId: string): Promise<void> {
    if (!enrollmentId) throw new Error('enrollmentId manquant');

    const origin = window.location.origin;

    const fn = httpsCallable<
      { enrollmentId: string; successUrl: string; cancelUrl: string },
      { url?: string | null }
    >(this.functions, 'createProgramCheckoutSession');

    try {
      const res = await fn({
        enrollmentId,
        successUrl: `${origin}/checkout/success`,
        cancelUrl: `${origin}/checkout/cancel`,
      });

      const url = String(res.data?.url || '').trim();
      if (!url) throw new Error('Checkout URL manquante');

      window.location.href = url;
    } catch (error) {
      const message =
        this.extractServerMessage(error) || 'Échec de création de session de paiement programme';
      throw new Error(message);
    }
  }
}