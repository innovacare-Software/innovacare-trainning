import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../enviroments/enviroment';

export interface CheckoutHttpPayload {
  offerId?: string;
  cartId?: string;
  successUrl: string;
  cancelUrl: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

type CallableTransport<T> = {
  result?: T;
  error?: { message?: string };
};

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly checkoutUrl = environment.api.checkoutUrl;

  constructor(private http: HttpClient) {
    this.assertApiConfig();
  }

  async createCheckoutSession(payload: CheckoutHttpPayload): Promise<ApiEnvelope<{ url: string }>> {
    const response = await firstValueFrom(
      this.http.post<CallableTransport<{ url: string }> | ApiEnvelope<{ url: string }>>(
        this.checkoutUrl,
        { data: payload }
      )
    );

    return this.normalizeEnvelope<{ url: string }>(response);
  }

  private normalizeEnvelope<T>(raw: unknown): ApiEnvelope<T> {
    const value = raw as
      | ApiEnvelope<T>
      | CallableTransport<T>
      | T
      | null
      | undefined;

    if (value && typeof value === 'object' && 'success' in value) {
      return value as ApiEnvelope<T>;
    }

    const callable = value as CallableTransport<T>;
    if (callable && typeof callable === 'object' && 'result' in callable) {
      return { success: true, data: callable.result as T };
    }

    if (callable?.error?.message) {
      return { success: false, error: callable.error.message };
    }

    if (value) {
      return { success: true, data: value as T };
    }

    return { success: false, error: 'Réponse API vide.' };
  }

  private assertApiConfig(): void {
    const endpoints: Array<{ name: string; value: string }> = [
      { name: 'checkoutUrl', value: this.checkoutUrl },
    ];

    for (const endpoint of endpoints) {
      const clean = String(endpoint.value || '').trim();
      if (!clean) {
        throw new Error(`Configuration API invalide: ${endpoint.name} est vide.`);
      }

      let parsed: URL;
      try {
        parsed = new URL(clean);
      } catch {
        throw new Error(`Configuration API invalide: ${endpoint.name} n'est pas une URL valide.`);
      }

      if (parsed.protocol !== 'https:') {
        throw new Error(
          `Configuration API invalide: ${endpoint.name} doit utiliser HTTPS en production.`
        );
      }
    }
  }
}