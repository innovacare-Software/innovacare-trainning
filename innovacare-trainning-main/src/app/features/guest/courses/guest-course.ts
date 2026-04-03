import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-guest-courses',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="card">
      <h1>My Courses</h1>
      <p class="muted">Sprint 2 will connect purchased guest courses here.</p>
    </section>
  `,
})
export class GuestCoursesComponent {}