import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-checkout-success',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="card">
      <h1>Payment Successful</h1>
      <p>Your purchase has been recorded. Access is being granted automatically.</p>
      <a class="btn primary" routerLink="/guest/dashboard">Go to Dashboard</a>
      <a class="btn outline" routerLink="/guest/orders">View Orders</a>
    </section>
  `,
})
export class CheckoutSuccessComponent {}