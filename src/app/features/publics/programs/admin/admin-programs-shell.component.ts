import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-admin-programs-shell',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="admin-shell">
      <aside class="sidebar">
        <h2>Programs Admin</h2>
        <nav>
          <a routerLink="/program-admin/programs" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Dashboard</a>
          <a routerLink="/program-admin/programs/list" routerLinkActive="active">Programs List</a>
          <a routerLink="/program-admin/programs/new" routerLinkActive="active">Create Program</a>
          <a routerLink="/program-admin/enrollments" routerLinkActive="active">Enrollments</a>
          <a routerLink="/program-admin/analytics" routerLinkActive="active">Analytics</a>
        </nav>
      </aside>
      <main class="content">
        <router-outlet></router-outlet>
      </main>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100%;
        background: #eff5fc;
        font-family: 'Manrope', 'Segoe UI', sans-serif;
      }

      .admin-shell {
        display: grid;
        grid-template-columns: 250px minmax(0, 1fr);
        min-height: 100vh;
      }

      .sidebar {
        background: linear-gradient(180deg, #123960 0%, #0f2f4e 100%);
        color: #f2f7fd;
        padding: 1rem;
      }

      .sidebar h2 {
        margin: 0;
        font-size: 1rem;
      }

      .sidebar nav {
        margin-top: 0.9rem;
        display: grid;
        gap: 0.35rem;
      }

      .sidebar a {
        color: #d6e8fa;
        text-decoration: none;
        border-radius: 0.65rem;
        padding: 0.5rem 0.65rem;
      }

      .sidebar a.active,
      .sidebar a:hover {
        background: rgba(255, 255, 255, 0.14);
        color: #ffffff;
      }

      .content {
        padding: 1rem;
      }

      @media (max-width: 980px) {
        .admin-shell {
          grid-template-columns: 1fr;
        }

        .sidebar nav {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
    `,
  ],
})
export class AdminProgramsShellComponent {}
