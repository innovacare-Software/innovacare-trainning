import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import {
  PaymentService,
} from '../../../core/payment.service';
import { CheckoutService } from '../../../core/checkout.service';
import {
  ProgramCheckoutPlanOption,
  ProgramCurrency,
  ProgramPaymentPlanType,
} from './program.models';
import { ProgramEnrollmentsService } from './program-enrollments.service';

export interface ProgramPaymentMethodDialogData {
  programId: string;
  enrollmentId: string;
  programTitle: string;
  amount: number;
  currency: ProgramCurrency;
  paymentPlans?: ProgramCheckoutPlanOption[];
  defaultPaymentPlan?: ProgramPaymentPlanType;
  defaultPhone?: string;
  autoMethod?: 'stripe' | 'cinetpay';
}



export interface ProgramPaymentMethodDialogResult {
  status: 'closed' | 'redirected' | 'success';
  paymentId?: string;
}

@Component({
  selector: 'app-program-payment-method-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  templateUrl: './program-payment-method-dialog.component.html',
  styleUrls: ['./program-payment-method-dialog.component.css'],
})
export class ProgramPaymentMethodDialogComponent implements OnInit {

  private readonly dialogRef = inject(
    MatDialogRef<ProgramPaymentMethodDialogComponent, ProgramPaymentMethodDialogResult>
  );
  private readonly paymentService = inject(PaymentService);
  private readonly checkoutService = inject(CheckoutService);
  private readonly enrollmentsService = inject(ProgramEnrollmentsService);

  readonly data = inject<ProgramPaymentMethodDialogData>(MAT_DIALOG_DATA);
  readonly loadingMethod = signal<null | 'stripe' | 'cinetpay'>(null);
  readonly errorMessage = signal('');
  readonly selectedPaymentPlan = signal<ProgramPaymentPlanType>('one_time');

  get paymentPlans(): ProgramCheckoutPlanOption[] {
    return this.data.paymentPlans?.length
      ? this.data.paymentPlans
      : [{
          type: 'one_time',
          label: 'One-time payment',
          amount: this.data.amount,
          currency: this.data.currency,
          description: 'Single payment for immediate access.',
          isRecurring: false,
        }];
  }

  get activePaymentPlan(): ProgramCheckoutPlanOption {
    return this.paymentPlans.find((plan) => plan.type === this.selectedPaymentPlan()) || this.paymentPlans[0];
  }

  close(): void {
    this.dialogRef.close({ status: 'closed' });
  }

  ngOnInit(): void {
    this.selectedPaymentPlan.set(
      this.paymentPlans.find((plan) => plan.type === this.data.defaultPaymentPlan)?.type || this.paymentPlans[0].type
    );

    if (this.data.autoMethod === 'cinetpay') {
      void this.payWithCinetPay();
      return;
    }

    if (this.data.autoMethod === 'stripe') {
      void this.payWithCard();
    }
  }

  async payWithCard(): Promise<void> {
    this.loadingMethod.set('stripe');
    this.errorMessage.set('');

    try {
      const result = await this.paymentService.createProgramPaymentIntent({
        programId: this.data.programId,
        enrollmentId: this.data.enrollmentId,
        paymentMethod: 'stripe',
        paymentPlan: this.activePaymentPlan.type,
        provider: 'stripe',
      });

      const checkoutUrl = String(result.checkoutUrl || '').trim();
      if (!checkoutUrl) {
        throw new Error('Stripe checkout URL is missing.');
      }

      this.dialogRef.close({ status: 'redirected', paymentId: result.paymentId });
      window.location.href = checkoutUrl;
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Unable to initialize card payment.'
      );
      this.loadingMethod.set(null);
    }
  }



  async payWithCinetPay(): Promise<void> {
    this.loadingMethod.set('cinetpay');
    this.errorMessage.set('');

    try {
      await this.checkoutService.startCinetPayProgramCheckout(this.data.enrollmentId);
      this.dialogRef.close({ status: 'redirected' });
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Unable to initialize CinetPay payment.'
      );
      this.loadingMethod.set(null);
    }
  }

  async payOffline(): Promise<void> {
    this.loadingMethod.set('cinetpay');
    this.errorMessage.set('');

    try {
      await this.enrollmentsService.markManualPaymentPending(this.data.enrollmentId);
      this.dialogRef.close({ status: 'closed' });
    } catch (error) {
      this.errorMessage.set(
        error instanceof Error ? error.message : 'Unable to save your offline payment request.'
      );
      this.loadingMethod.set(null);
    }
  }

  contactTrainer(): void {
    const message = encodeURIComponent(`Hello, I need help to complete payment for ${this.data.programTitle}.`);
    window.open(`https://wa.me/?text=${message}`, '_blank', 'noopener');
  }

  selectPaymentPlan(plan: ProgramPaymentPlanType): void {
    this.selectedPaymentPlan.set(plan);
  }
}
