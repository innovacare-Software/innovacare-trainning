import { Injectable, inject } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';

export interface CreateCheckoutInput {
  /** Required — id of a doc in publicOffers/. */
  offerId: string;
  /** Optional org context; verified server-side against active membership. */
  orgId?: string | null;
  /** Optional override (only used if the offer bundles several courses). */
  courseId?: string | null;
  /** Where Stripe should send the user after success/cancel. */
  successUrl?: string;
  cancelUrl?: string;
  locale?: string;
}

export interface CreateCheckoutResult {
  sessionId: string;
  url: string;
  mode: 'payment' | 'subscription';
}

/**
 * Thin wrapper around the `createCheckoutSession` Cloud Function.
 *
 * SECURITY: this service NEVER takes a price, currency or amount. The
 * backend is the single source of truth — the frontend only knows the
 * offerId. Any attempt to add a price field here would be a regression.
 */
@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private readonly functions = inject(Functions);

  async createSessionAndRedirect(input: CreateCheckoutInput): Promise<void> {
    const result = await this.createSession(input);
    if (!result.url) {
      throw new Error('Stripe did not return a checkout URL.');
    }
    window.location.assign(result.url);
  }

  async createSession(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    if (!input?.offerId) {
      throw new Error('offerId is required to start checkout.');
    }
    const callable = httpsCallable<CreateCheckoutInput, CreateCheckoutResult>(
      this.functions,
      'createCheckoutSession',
    );
    const ret = await callable({
      offerId: input.offerId,
      orgId: input.orgId ?? null,
      courseId: input.courseId ?? undefined,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
      locale: input.locale,
    });
    return ret.data;
  }
}
