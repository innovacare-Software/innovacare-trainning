import { Injectable, Injector, inject, runInInjectionContext } from '@angular/core';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Observable } from 'rxjs';

export type ConnectAccountStatus =
  | 'missing_account'
  | 'onboarding_required'
  | 'pending_verification'
  | 'charges_enabled'
  | 'fully_active'
  | 'restricted';

export interface StripeOrganizationAccountStatus {
  stripeAccountId?: string | null;
  stripeChargesEnabled?: boolean;
  stripeDetailsSubmitted?: boolean;
  stripePayoutsEnabled?: boolean;
  stripeConnectStatus?: ConnectAccountStatus | null;
  stripeRequirementsCurrentlyDue?: string[];
  stripeRequirementsPastDue?: string[];
  stripeDisabledReason?: string | null;
  payoutMethodConfigured?: boolean;
  payoutMethod?: 'MTN_MOBILE_MONEY' | 'ORANGE_MONEY' | 'WISE' | 'BANK_TRANSFER' | 'MANUAL_OTHER' | null;
  payoutMode?: 'manual' | 'stripe_connect' | null;
  payoutCountry?: string | null;
  payoutCurrency?: string | null;
  accountHolderName?: string | null;
  mobileMoneyProvider?: string | null;
  mobileMoneyPhoneMasked?: string | null;
  bankName?: string | null;
  bankAccountMasked?: string | null;
  payoutNotes?: string | null;
}

export interface StripeConnectAccountResult {
  accountId: string;
  onboardingUrl: string;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
  payoutsEnabled: boolean;
}

export interface StripeConnectStatusResult {
  status: ConnectAccountStatus;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirementsCurrentlyDue: string[];
  requirementsPastDue: string[];
  disabledReason: string | null;
  stripeAccountId: string | null;
  checkedAt: string;
}

export interface PartnerPayoutRecord {
  id: string;
  payoutStatus?: 'pending' | 'paid';
  partnerNetAmount?: number;
  grossAmount?: number;
  currency?: string;
  payoutMethod?: string;
  paymentDate?: string;
}

export interface PartnerPayoutRecordsResponse {
  records: PartnerPayoutRecord[];
  count: number;
  role: 'admin' | 'partner';
}

@Injectable({
  providedIn: 'root',
})
export class StripeConnectService {
  private readonly functions = inject(Functions);
  private readonly firestore = inject(Firestore);
  private readonly injector = inject(Injector);

  private inContext<T>(factory: () => T): T {
    return runInInjectionContext(this.injector, factory);
  }

  watchOrganizationStripeAccount(orgId: string): Observable<StripeOrganizationAccountStatus | null> {
    return this.inContext(
      () => docData(doc(this.firestore, `organizations/${orgId}`)) as Observable<StripeOrganizationAccountStatus | null>
    );
  }

  async connectStripeAccount(orgId?: string): Promise<StripeConnectAccountResult> {
    const fn = this.inContext(
      () => httpsCallable<{ orgId?: string }, StripeConnectAccountResult>(
        this.functions,
        'connectStripeAccount'
      )
    );

    try {
      const result = await fn({ orgId });
      if (!result.data?.onboardingUrl) {
        throw new Error('Unable to generate Stripe onboarding link.');
      }
      return result.data;
    } catch (error: unknown) {
      const details = String((error as { details?: unknown })?.details || '').trim();
      const message = String((error as { message?: string })?.message || '').trim();
      throw new Error(details || message || 'Unable to open Stripe onboarding right now.');
    }
  }

  async getConnectAccountStatus(orgId?: string): Promise<StripeConnectStatusResult> {
    const fn = this.inContext(
      () => httpsCallable<{ orgId?: string }, StripeConnectStatusResult>(
        this.functions,
        'getConnectAccountStatus'
      )
    );

    try {
      const result = await fn({ orgId });
      return result.data;
    } catch (error: unknown) {
      const details = String((error as { details?: unknown })?.details || '').trim();
      const message = String((error as { message?: string })?.message || '').trim();
      throw new Error(details || message || 'Unable to retrieve Stripe Connect status.');
    }
  }

  async getPartnerPayoutRecords(status?: 'pending' | 'paid', limit = 50): Promise<PartnerPayoutRecordsResponse> {
    const fn = this.inContext(
      () => httpsCallable<{ status?: 'pending' | 'paid'; limit?: number }, PartnerPayoutRecordsResponse>(
        this.functions,
        'getPartnerPayoutRecords'
      )
    );

    const result = await fn({ status, limit });
    return result.data;
  }
}