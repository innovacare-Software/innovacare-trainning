import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-guest-live-classes',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="card">
      <h1>Live Classes</h1>
      <p class="muted">Sprint 2 and 3 will connect live classes and booking here.</p>
    </section>
  `,
})
export class GuestLiveClassesComponent {}