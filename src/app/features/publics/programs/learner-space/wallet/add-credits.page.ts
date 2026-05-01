import { Component, signal, computed, inject, DestroyRef } from '@angular/core';
import { Location } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { Auth } from '@angular/fire/auth';
import {
  Firestore,
  doc,
  docData,
  collection,
  query,
  where,
  orderBy,
  limit,
  collectionData,
} from '@angular/fire/firestore';
import { authState } from '@angular/fire/auth';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Observable, switchMap, map, of } from 'rxjs';
import { LanguageService } from '../../../../../core/language.service';
import { LocalizedDatePipe } from '../../../../../shared/pipes/localized-date.pipe';
import { PaymentService, ProgramPaymentRecord } from '../../../../../core/payment.service';

export interface WalletTx {
  id: string;
  title: string;
  date: Date;
  amount: number;
  status: string;
  paymentMethod: string;
}

@Component({
  selector: 'app-add-credits-page',
  standalone: true,
  imports: [RouterModule, TranslocoModule, LocalizedDatePipe],
  templateUrl: './add-credits.page.html',
  styleUrls: ['./add-credits.page.css'],
})
export class AddCreditsPage {
  private readonly location       = inject(Location);
  private readonly auth           = inject(Auth);
  private readonly firestore      = inject(Firestore);
  private readonly paymentSvc     = inject(PaymentService);
  private readonly destroyRef     = inject(DestroyRef);
  readonly lang                   = inject(LanguageService);

  /* ── State ──────────────────────────────────────────────── */
  readonly amountRaw      = signal('');
  readonly selectedMethod = signal<'card' | 'mobile_money'>('card');
  readonly mobilePhone    = signal('');
  readonly mobileProvider = signal<'MTN' | 'Orange' | 'Moov' | 'Airtel'>('MTN');
  readonly selectedChip   = signal<number | null>(null);
  readonly error          = signal('');
  readonly success        = signal('');
  readonly loading        = signal(false);
  readonly historyOpen    = signal(true);
  readonly amountFocused  = signal(false);

  readonly quickAmounts = [10, 25, 50, 100] as const;

  /* ── Derived ────────────────────────────────────────────── */
  readonly parsedAmount = computed(() => {
    const v = parseFloat(this.amountRaw());
    return isNaN(v) || v < 1 ? 0 : v;
  });
  readonly formattedAmount = computed(() => this.parsedAmount().toFixed(2));
  readonly isValid         = computed(() =>
    this.parsedAmount() >= 1 &&
    (this.selectedMethod() === 'card' || this.mobilePhone().trim().length >= 8)
  );
  readonly buttonLabel     = computed(() =>
    this.selectedMethod() === 'card'
      ? this.lang.instant('WALLET.payment.card')
      : this.lang.instant('WALLET.payment.mobile_money')
  );

  /* ── Live wallet balance from Firestore ─────────────────── */
  private readonly user$ = authState(this.auth);

  readonly walletBalance = toSignal(
    this.user$.pipe(
      switchMap(user =>
        user?.uid
          ? (docData(doc(this.firestore, `users/${user.uid}`)) as any)
          : of(null)
      ),
      map((profile: any) => Number(profile?.walletBalance ?? 0))
    ),
    { initialValue: 0 }
  );

  readonly walletBalanceFmt = computed(() =>
    '$' + (this.walletBalance() ?? 0).toFixed(2)
  );

  /* ── Live transaction history (wallet_topup orders) ─────── */
  readonly transactions = toSignal(
    this.user$.pipe(
      switchMap(user => {
        if (!user?.uid) return of([] as WalletTx[]);
        const ref = collection(this.firestore, `users/${user.uid}/orders`);
        const q = query(
          ref,
          where('itemType', '==', 'wallet_topup'),
          orderBy('createdAt', 'desc'),
          limit(10)
        );
        return (collectionData(q, { idField: 'id' }) as Observable<any[]>).pipe(
          map((orders: any[]) =>
            orders.map((o): WalletTx => ({
              id: o.id,
              title: this.lang.instant('WALLET.history.topup') + ' — ' +
                (o.paymentMethod === 'mobile_money' ? 'Mobile Money' : 'Credit / Debit Card'),
              date: o.paidAt?.toDate?.() ?? o.createdAt?.toDate?.() ?? new Date(),
              amount: Number(o.amount || 0),
              status: o.status,
              paymentMethod: o.paymentMethod ?? 'card',
            }))
          )
        );
      })
    ),
    { initialValue: [] as WalletTx[] }
  );

  /* ── Actions ────────────────────────────────────────────── */
  setMethod(method: 'card' | 'mobile_money'): void {
    this.selectedMethod.set(method);
    this.error.set('');
    this.success.set('');
  }

  setChip(value: number): void {
    this.selectedChip.set(value);
    this.amountRaw.set(String(value));
    this.error.set('');
    this.success.set('');
  }

  onAmountChange(value: string): void {
    this.amountRaw.set(value);
    const num = parseFloat(value);
    const match = this.quickAmounts.find(q => q === num) ?? null;
    this.selectedChip.set(match);
    if (value) this.error.set('');
  }

  clearAmount(): void {
    this.amountRaw.set('');
    this.selectedChip.set(null);
    this.error.set('');
    this.success.set('');
  }

  setMobilePhone(value: string): void {
    this.mobilePhone.set(value);
    this.error.set('');
  }

  setMobileProvider(value: 'MTN' | 'Orange' | 'Moov' | 'Airtel'): void {
    this.mobileProvider.set(value);
    this.error.set('');
  }

  async pay(): Promise<void> {
    if (!this.isValid()) {
      this.error.set(this.lang.instant('WALLET.amount_placeholder'));
      return;
    }
    this.error.set('');
    this.success.set('');
    this.loading.set(true);
    try {
      const paymentMethod = this.selectedMethod() === 'card' ? 'stripe' : 'mobile_money';
      const result = await this.paymentSvc.createWalletTopUpPaymentIntent({
        amountUSD: this.parsedAmount(),
        paymentMethod,
        phone: this.selectedMethod() === 'mobile_money' ? this.mobilePhone().trim() : undefined,
        provider: this.selectedMethod() === 'mobile_money' ? this.mobileProvider() : 'stripe',
      });

      if (result.method === 'stripe') {
        const checkoutUrl = String(result.checkoutUrl || '').trim();
        if (!checkoutUrl) {
          throw new Error('Checkout URL missing for Stripe wallet top-up.');
        }
        window.location.href = checkoutUrl;
        return;
      }

      if (result.checkoutUrl) {
        window.open(result.checkoutUrl, '_blank', 'noopener');
      }

      if (result.status === 'success') {
        this.loading.set(false);
        this.success.set(this.lang.instant('WALLET.payment.wallet_paid'));
        return;
      }

      this.success.set(this.lang.instant('WALLET.payment.waiting_confirmation'));
      this.paymentSvc.watchPayment(result.paymentId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((payment) => this.handlePaymentUpdate(payment));
    } catch (err: any) {
      this.error.set(err?.message || this.lang.instant('COMMON.error'));
      this.loading.set(false);
    }
  }

  private handlePaymentUpdate(payment: ProgramPaymentRecord | undefined): void {
    if (!payment) {
      return;
    }

    if (payment.status === 'success') {
      this.loading.set(false);
      this.success.set(this.lang.instant('WALLET.payment.wallet_paid'));
      this.amountRaw.set('');
      this.selectedChip.set(null);
      return;
    }

    if (payment.status === 'failed') {
      this.loading.set(false);
      this.error.set(this.lang.instant('WALLET.payment.mobile_failed'));
    }
  }

  goBack(): void {
    this.location.back();
  }
}
