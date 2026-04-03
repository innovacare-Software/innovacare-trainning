import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-guest-orders',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="card">
      <h1>Orders</h1>
      <p class="muted">Guest orders and receipts will appear here.</p>
    </section>
  `,
})
export class GuestOrdersComponent {}