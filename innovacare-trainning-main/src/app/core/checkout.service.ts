import { Injectable, inject } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private functions = inject(Functions);

  async createCheckoutSession(input: {
    offerId: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string }> {
    const fn = httpsCallable(this.functions, 'createCheckoutSession');
    const result = await fn(input);
    return result.data as { url: string };
  }
}