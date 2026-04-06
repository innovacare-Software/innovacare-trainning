import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageSwitcherComponent } from '../../shared/components/language-switcher/language-switcher';

@Component({
  selector: 'app-program-admin-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, LanguageSwitcherComponent],
  template: `
    <section class="admin-shell">
      <aside class="sidebar">
        <div class="brand">
          <p class="eyebrow">{{ 'programAdmin.shell.brand' | translate }}</p>
          <h2>{{ 'programAdmin.shell.role' | translate }}</h2>
        </div>

        <div class="lang-area">
          <app-language-switcher></app-language-switcher>
        </div>

        <nav>
          <a routerLink="/program-admin/dashboard" routerLinkActive="active">{{ 'programAdmin.nav.dashboard' | translate }}</a>
          <a routerLink="/program-admin/programs" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">{{ 'programAdmin.nav.programs' | translate }}</a>
          <a routerLink="/program-admin/programs/new" routerLinkActive="active">{{ 'programAdmin.nav.createProgram' | translate }}</a>
          <a routerLink="/program-admin/enrollments" routerLinkActive="active">{{ 'programAdmin.nav.enrollments' | translate }}</a>
          <a routerLink="/program-admin/analytics" routerLinkActive="active">{{ 'programAdmin.nav.analytics' | translate }}</a>
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
        background: radial-gradient(circle at top right, #e6f0fb 0%, #eef4fb 40%, #f6f9fd 100%);
        font-family: 'Manrope', 'Segoe UI', sans-serif;
      }

      .admin-shell {
        display: grid;
        min-height: 100vh;
        grid-template-columns: 280px minmax(0, 1fr);
      }

      .sidebar {
        color: #f3f7ff;
        padding: 1.1rem;
        background: linear-gradient(180deg, #0f3659 0%, #102f4f 60%, #152746 100%);
      }

      .brand h2 {
        margin: 0.25rem 0 0;
      }

      .eyebrow {
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        font-weight: 800;
        font-size: 0.7rem;
        color: #a7c5e5;
      }

      nav {
        margin-top: 1rem;
        display: grid;
        gap: 0.36rem;
      }

      nav a {
        color: #d8e8fb;
        text-decoration: none;
        border: 1px solid transparent;
        border-radius: 0.72rem;
        padding: 0.56rem 0.66rem;
      }

      nav a.active,
      nav a:hover {
        color: #fff;
        border-color: rgba(255, 255, 255, 0.2);
        background: rgba(255, 255, 255, 0.14);
      }

      .lang-area {
        margin: 0.75rem 0 0.5rem;
      }

      .content {
        padding: 1rem;
      }

      @media (max-width: 1024px) {
        .admin-shell {
          grid-template-columns: 1fr;
        }

        nav {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 620px) {
        nav {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class ProgramAdminShellComponent {}
