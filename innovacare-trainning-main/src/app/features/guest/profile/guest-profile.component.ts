import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-guest-profile',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="card">
      <h1>Profile</h1>
      <p class="muted">Guest profile settings will appear here.</p>
    </section>
  `,
})
export class GuestProfileComponent {}