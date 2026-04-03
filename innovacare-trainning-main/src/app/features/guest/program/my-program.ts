import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-guest-programs',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="card">
      <h1>My Programs</h1>
      <p class="muted">Sprint 2 will connect purchased guest programs here.</p>
    </section>
  `,
})
export class GuestProgramsComponent {}