import { Injectable, inject } from '@angular/core';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { Functions } from '@angular/fire/functions';
import { httpsCallable } from 'firebase/functions';
import { Observable } from 'rxjs';

export interface StripeOrganizationAccountStatus {
  stripeAccountId?: string | null;
  stripeChargesEnabled?: boolean;
  stripeDetailsSubmitted?: boolean;
  stripePayoutsEnabled?: boolean;
}

export interface StripeConnectAccountResult {
  accountId: string;
  onboardingUrl: string;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
  payoutsEnabled: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class StripeConnectService {
  private readonly functions = inject(Functions);
  private readonly firestore = inject(Firestore);

  watchOrganizationStripeAccount(orgId: string): Observable<StripeOrganizationAccountStatus | null> {
    return docData(doc(this.firestore, `organizations/${orgId}`)) as Observable<StripeOrganizationAccountStatus | null>;
  }

  async connectStripeAccount(orgId?: string): Promise<StripeConnectAccountResult> {
    const fn = httpsCallable<{ orgId?: string }, StripeConnectAccountResult>(
      this.functions,
      'connectStripeAccount'
    );

    const result = await fn({ orgId });
    if (!result.data?.onboardingUrl) {
      throw new Error('Unable to generate Stripe onboarding link.');
    }

    return result.data;
  }
}