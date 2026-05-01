import { Injectable, inject } from '@angular/core';
import { Functions } from '@angular/fire/functions';
import { httpsCallable } from 'firebase/functions';

export type CheckoutFailureCode =
  | 'PRODUCT_NOT_FOUND'
  | 'PRODUCT_INACTIVE'
  | 'MISSING_PRICE_ID'
  | 'CHECKOUT_FAILED'
  | 'UNKNOWN';

export class CheckoutServiceError extends Error {
  constructor(
    message: string,
    readonly code: CheckoutFailureCode,
    readonly details?: unknown
  ) {
    super(message);
    this.name = 'CheckoutServiceError';
  }
}

@Injectable({
  providedIn: 'root',
})
export class CheckoutService {
  private readonly functions = inject(Functions);

  private extractServerError(error: unknown): {
    message: string | null;
    code: CheckoutFailureCode;
    details?: unknown;
  } {
    const err = error as {
      message?: string;
      details?: { message?: string; reason?: string };
      customData?: { message?: string };
    } | null;

    const reason = String(err?.details?.reason || '').trim().toUpperCase();
    const code: CheckoutFailureCode =
      reason === 'PRODUCT_NOT_FOUND' ||
      reason === 'PRODUCT_INACTIVE' ||
      reason === 'MISSING_PRICE_ID' ||
      reason === 'CHECKOUT_FAILED'
        ? (reason as CheckoutFailureCode)
        : 'UNKNOWN';

    const fromDetails = String(err?.details?.message || '').trim();
    if (fromDetails) {
      return { message: fromDetails, code, details: err?.details };
    }

    const fromCustomData = String(err?.customData?.message || '').trim();
    if (fromCustomData) {
      return { message: fromCustomData, code, details: err?.details };
    }

    const fromMessage = String(err?.message || '').trim();
    if (fromMessage) {
      const stripped = fromMessage.replace(/^FirebaseError:\s*/i, '').trim();
      return { message: stripped || fromMessage, code, details: err?.details };
    }

    return { message: null, code, details: err?.details };
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
    productId?: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string }> {
    if (!input.offerId && !input.cartId && !input.productId) {
      throw new Error('offerId/cartId/productId manquant');
    }

    const fn = httpsCallable<
      {
        offerId?: string;
        cartId?: string;
        productId?: string;
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
      const serverError = this.extractServerError(error);
      throw new CheckoutServiceError(
        serverError.message || 'Échec de création de session checkout',
        serverError.code,
        serverError.details
      );
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
      const serverError = this.extractServerError(error);
      throw new CheckoutServiceError(
        serverError.message || 'Échec de création de session de paiement programme',
        serverError.code,
        serverError.details
      );
    }
  }

  async startWalletTopUp(amountUSD: number, paymentMethod: 'card' | 'paypal'): Promise<void> {
    if (!amountUSD || amountUSD < 1) throw new Error('Montant invalide (minimum $1.00)');

    const origin = window.location.origin;

    const fn = httpsCallable<
      { amountUSD: number; paymentMethod: string; successUrl: string; cancelUrl: string },
      { url?: string | null }
    >(this.functions, 'createWalletTopUpSession');

    try {
      const res = await fn({
        amountUSD,
        paymentMethod,
        successUrl: `${origin}/checkout/success?type=wallet_topup`,
        cancelUrl: `${origin}/checkout/cancel`,
      });

      const url = String(res.data?.url || '').trim();
      if (!url) throw new Error('Checkout URL manquante');

      window.location.href = url;
    } catch (error) {
      const serverError = this.extractServerError(error);
      throw new CheckoutServiceError(
        serverError.message || 'Échec de création de session de paiement',
        serverError.code,
        serverError.details
      );
    }
  }

  async startTutorBookingCheckout(input: {
    tutorId: string;
    subject: string;
    sessionDate: string;
    sessionTime: string;
    durationMinutes: number;
    sessionType: 'individual' | 'group';
    notes?: string;
  }): Promise<void> {
    const origin = window.location.origin;
    const fn = httpsCallable<
      {
        tutorId: string;
        subject: string;
        sessionDate: string;
        sessionTime: string;
        durationMinutes: number;
        sessionType: 'individual' | 'group';
        notes?: string;
        successUrl: string;
        cancelUrl: string;
      },
      { url?: string | null }
    >(this.functions, 'createTutorBookingCheckoutSession');

    try {
      const res = await fn({
        ...input,
        successUrl: `${origin}/checkout/success?type=tutor_session`,
        cancelUrl: `${origin}/checkout/cancel?type=tutor_session`,
      });

      const url = String(res.data?.url || '').trim();
      if (!url) throw new Error('Checkout URL manquante');

      window.location.href = url;
    } catch (error) {
      const serverError = this.extractServerError(error);
      throw new CheckoutServiceError(
        serverError.message || 'Échec de création de session de tutorat',
        serverError.code,
        serverError.details
      );
    }
  }

  async startCinetPayProgramCheckout(enrollmentId: string): Promise<void> {
    if (!enrollmentId) throw new Error('enrollmentId manquant');

    const origin = window.location.origin;

    const fn = httpsCallable<
      { enrollmentId: string; returnUrl: string },
      { paymentUrl?: string | null; transactionId?: string | null }
    >(this.functions, 'createCinetPayProgramCheckoutSession');

    try {
      const res = await fn({
        enrollmentId,
        returnUrl: `${origin}/checkout/success?type=program&provider=cinetpay`,
      });

      const url = String(res.data?.paymentUrl || '').trim();
      if (!url) throw new Error('CinetPay payment URL manquante');

      window.location.href = url;
    } catch (error) {
      const serverError = this.extractServerError(error);
      throw new CheckoutServiceError(
        serverError.message || 'Échec de création de session de paiement CinetPay',
        serverError.code,
        serverError.details
      );
    }
  }
}