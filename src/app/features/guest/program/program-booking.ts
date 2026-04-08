import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-guest-bookings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="card">
      <h1>Bookings</h1>
      <p class="muted">Guest live class bookings will appear here.</p>
    </section>
  `,
})
export class GuestBookingsComponent {}