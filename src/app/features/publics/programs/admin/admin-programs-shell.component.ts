import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/auth';
import { LanguageSwitcherComponent } from '../../../../shared/components/language-switcher/language-switcher.component';

@Component({
  selector: 'app-admin-programs-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, LanguageSwitcherComponent],
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
        <header class="content-topbar">
          <div class="content-topbar__copy">
            <span>Programs admin dashboard</span>
            <strong>Access logout and essentials without leaving the current view.</strong>
          </div>
          <div class="content-topbar__actions">
            <a routerLink="/program-admin/dashboard" class="topbar-link">Main dashboard</a>
            <app-language-switcher></app-language-switcher>
            <button type="button" class="topbar-logout" (click)="logout()">Logout</button>
          </div>
        </header>
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

      .content-topbar {
        position: sticky;
        top: 0.75rem;
        z-index: 20;
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: center;
        margin-bottom: 1rem;
        padding: 0.95rem 1rem;
        border: 1px solid rgba(18, 57, 96, 0.08);
        border-radius: 1rem;
        background: rgba(255, 255, 255, 0.88);
        box-shadow: 0 14px 32px rgba(18, 57, 96, 0.08);
        backdrop-filter: blur(12px);
      }

      .content-topbar__copy {
        display: grid;
        gap: 0.2rem;
      }

      .content-topbar__copy span {
        font-size: 0.72rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #5b7795;
      }

      .content-topbar__actions {
        display: flex;
        align-items: center;
        gap: 0.65rem;
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      .topbar-link,
      .topbar-logout {
        border-radius: 999px;
        padding: 0.5rem 0.9rem;
        font-size: 0.82rem;
        font-weight: 800;
      }

      .topbar-link {
        text-decoration: none;
        color: #123d66;
        border: 1px solid rgba(18, 61, 102, 0.16);
        background: #fff;
      }

      .topbar-logout {
        border: 1px solid rgba(153, 27, 27, 0.18);
        background: rgba(255,255,255,.96);
        color: #8b1e1e;
        cursor: pointer;
      }

      @media (max-width: 980px) {
        .admin-shell {
          grid-template-columns: 1fr;
        }

        .sidebar nav {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .content-topbar {
          top: 0.5rem;
          flex-direction: column;
          align-items: flex-start;
        }

        .content-topbar__actions {
          justify-content: flex-start;
        }
      }
    `,
  ],
})
export class AdminProgramsShellComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigate(['/login']);
  }
}
