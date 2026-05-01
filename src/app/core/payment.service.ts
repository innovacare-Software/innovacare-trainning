import { Injectable, inject } from '@angular/core';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { Functions } from '@angular/fire/functions';
import { httpsCallable } from 'firebase/functions';
import { Observable, of } from 'rxjs';

export type HybridPaymentMethod = 'stripe' | 'mobile_money';

export interface CreateProgramPaymentIntentInput {
  userId?: string;
  programId: string;
  enrollmentId: string;
  paymentMethod: HybridPaymentMethod;
  phone?: string;
  provider?: string;
}

export interface ProgramPaymentIntentResult {
  paymentId: string;
  status: 'pending' | 'success' | 'failed';
  method: HybridPaymentMethod;
  provider: string;
  reference: string;
  checkoutUrl?: string | null;
}

export interface CreateWalletPaymentIntentInput {
  userId?: string;
  amountUSD: number;
  paymentMethod: HybridPaymentMethod;
  phone?: string;
  provider?: string;
}

export interface ProgramPaymentRecord {
  id: string;
  userId: string;
  programId: string;
  enrollmentId?: string | null;
  amount: number;
  currency: string;
  method: HybridPaymentMethod;
  provider: string;
  gateway?: string;
  status: 'pending' | 'success' | 'failed';
  reference: string;
  phone?: string | null;
  checkoutSessionId?: string | null;
  checkoutUrl?: string | null;
  providerTransactionId?: string | null;
  paymentIntentId?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  private readonly functions = inject(Functions);
  private readonly firestore = inject(Firestore);

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
      return fromMessage.replace(/^FirebaseError:\s*/i, '').trim() || fromMessage;
    }

    return null;
  }

  async createProgramPaymentIntent(
    input: CreateProgramPaymentIntentInput
  ): Promise<ProgramPaymentIntentResult> {
    const origin = window.location.origin;

    const fn = httpsCallable<
      {
        userId?: string;
        programId: string;
        enrollmentId: string;
        paymentMethod: HybridPaymentMethod;
        phone?: string;
        provider?: string;
        successUrl: string;
        cancelUrl: string;
      },
      ProgramPaymentIntentResult
    >(this.functions, 'createPaymentIntent');

    try {
      const res = await fn({
        ...input,
        successUrl: `${origin}/checkout/success?type=program`,
        cancelUrl: `${origin}/checkout/cancel?type=program`,
      });

      if (!res.data?.paymentId) {
        throw new Error('Payment identifier missing from server response.');
      }

      return {
        paymentId: res.data.paymentId,
        status: res.data.status,
        method: res.data.method,
        provider: res.data.provider,
        reference: res.data.reference,
        checkoutUrl: res.data.checkoutUrl ?? null,
      };
    } catch (error) {
      const message = this.extractServerMessage(error) || 'Unable to initialize payment.';
      throw new Error(message);
    }
  }

  async createWalletTopUpPaymentIntent(
    input: CreateWalletPaymentIntentInput
  ): Promise<ProgramPaymentIntentResult> {
    const origin = window.location.origin;

    const fn = httpsCallable<
      {
        userId?: string;
        itemType: 'wallet_topup';
        amountUSD: number;
        paymentMethod: HybridPaymentMethod;
        phone?: string;
        provider?: string;
        successUrl: string;
        cancelUrl: string;
      },
      ProgramPaymentIntentResult
    >(this.functions, 'createPaymentIntent');

    try {
      const res = await fn({
        ...input,
        itemType: 'wallet_topup',
        successUrl: `${origin}/checkout/success?type=wallet_topup`,
        cancelUrl: `${origin}/checkout/cancel?type=wallet_topup`,
      });

      if (!res.data?.paymentId) {
        throw new Error('Payment identifier missing from server response.');
      }

      return {
        paymentId: res.data.paymentId,
        status: res.data.status,
        method: res.data.method,
        provider: res.data.provider,
        reference: res.data.reference,
        checkoutUrl: res.data.checkoutUrl ?? null,
      };
    } catch (error) {
      const message = this.extractServerMessage(error) || 'Unable to initialize wallet top-up.';
      throw new Error(message);
    }
  }

  watchPayment(paymentId: string): Observable<ProgramPaymentRecord | undefined> {
    const trimmed = paymentId.trim();
    if (!trimmed) {
      return of(undefined);
    }

    return docData(doc(this.firestore, `payments/${trimmed}`), {
      idField: 'id',
    }) as Observable<ProgramPaymentRecord | undefined>;
  }
}