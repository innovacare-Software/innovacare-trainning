import { Injectable, inject } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';

export interface MarketingLeadPayload {
  name: string;
  email: string;
  organization?: string;
  interest: string;
  message: string;
  source: 'contact-page' | 'quiz' | 'popup';
}

@Injectable({ providedIn: 'root' })
export class MarketingLeadsService {
  private readonly functions = inject(Functions);

  async submitLead(payload: MarketingLeadPayload): Promise<void> {
    const submit = httpsCallable<MarketingLeadPayload, { ok: boolean }>(this.functions, 'submitMarketingLead');
    await submit(payload);
  }
}