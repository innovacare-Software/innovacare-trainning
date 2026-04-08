import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-checkout-cancel',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="card">
      <h1>Checkout Cancelled</h1>
      <p>Your payment was cancelled. You can return to the catalog and try again later.</p>
      <a class="btn primary" routerLink="/catalog">Back to Catalog</a>
    </section>
  `,
})
export class CheckoutCancelComponent {}