import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/auth';
import { LanguageSwitcherComponent } from '../../shared/components/language-switcher/language-switcher.component';
import { GlobalSearchTriggerComponent } from '../../shared/global-search/global-search-trigger.component';
import { OnboardingTriggerComponent } from '../../shared/onboarding/onboarding-trigger.component';

@Component({
  selector: 'app-program-admin-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, LanguageSwitcherComponent, GlobalSearchTriggerComponent, OnboardingTriggerComponent],
  template: `
    <section class="admin-shell" [class.sidebar-collapsed]="sidebarCollapsed">
      <aside class="sidebar" [class.collapsed]="sidebarCollapsed">
        <div class="brand">
          <p class="eyebrow" *ngIf="!sidebarCollapsed">Program Platform</p>
          <button class="sidebar-toggle" (click)="toggleSidebar()" [title]="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'">
            <span>{{ sidebarCollapsed ? '→' : '←' }}</span>
          </button>
        </div>

        <nav>
          <a routerLink="/program-admin/dashboard" routerLinkActive="active" [title]="sidebarCollapsed ? 'Dashboard' : ''">
            <span class="nav-icon">🏠</span><span class="nav-label" *ngIf="!sidebarCollapsed">Dashboard</span>
          </a>
          <a routerLink="/program-admin/programs" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" [title]="sidebarCollapsed ? 'Programs' : ''">
            <span class="nav-icon">📋</span><span class="nav-label" *ngIf="!sidebarCollapsed">Programs</span>
          </a>
          <a routerLink="/program-admin/programs/new" routerLinkActive="active" [title]="sidebarCollapsed ? 'Create Program' : ''">
            <span class="nav-icon">➕</span><span class="nav-label" *ngIf="!sidebarCollapsed">Create Program</span>
          </a>
          <a routerLink="/program-admin/exam-prep" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" [title]="sidebarCollapsed ? 'Exam Prep Hub' : ''">
            <span class="nav-icon">📚</span><span class="nav-label" *ngIf="!sidebarCollapsed">Exam Prep Hub</span>
          </a>
          <a routerLink="/program-admin/exam-prep/question-bank" routerLinkActive="active" [title]="sidebarCollapsed ? 'Question Bank' : ''">
            <span class="nav-icon">❓</span><span class="nav-label" *ngIf="!sidebarCollapsed">Question Bank</span>
          </a>
          <a routerLink="/program-admin/exam-prep/blueprints" routerLinkActive="active" [title]="sidebarCollapsed ? 'Blueprints' : ''">
            <span class="nav-icon">🗺️</span><span class="nav-label" *ngIf="!sidebarCollapsed">Blueprints</span>
          </a>
          <a routerLink="/program-admin/exam-prep/assessments" routerLinkActive="active" [title]="sidebarCollapsed ? 'Assessments' : ''">
            <span class="nav-icon">📝</span><span class="nav-label" *ngIf="!sidebarCollapsed">Assessments</span>
          </a>
          <a routerLink="/program-admin/enrollments" routerLinkActive="active" [title]="sidebarCollapsed ? 'Enrollments' : ''">
            <span class="nav-icon">👥</span><span class="nav-label" *ngIf="!sidebarCollapsed">Enrollments</span>
          </a>
          <a routerLink="/program-admin/analytics" routerLinkActive="active" [title]="sidebarCollapsed ? 'Analytics' : ''">
            <span class="nav-icon">📊</span><span class="nav-label" *ngIf="!sidebarCollapsed">Analytics</span>
          </a>
        </nav>
      </aside>

      <main class="content">
        <header class="content-topbar">
          <div class="content-topbar__copy">
            <span>Program admin dashboard</span>
            <strong>Fast access to search, language and session controls.</strong>
          </div>
          <div class="content-topbar__actions">
            <app-global-search-trigger></app-global-search-trigger>
            <app-onboarding-trigger></app-onboarding-trigger>
            <a routerLink="/admin-spaces" class="topbar-link">Switch space</a>
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
        background: radial-gradient(circle at top right, #e6f0fb 0%, #eef4fb 40%, #f6f9fd 100%);
        font-family: 'Manrope', 'Segoe UI', sans-serif;
      }

      .admin-shell {
        display: grid;
        min-height: 100vh;
        grid-template-columns: 280px minmax(0, 1fr);
        transition: grid-template-columns 0.25s ease;
      }

      .admin-shell.sidebar-collapsed {
        grid-template-columns: 68px minmax(0, 1fr);
      }

      .sidebar {
        color: #f3f7ff;
        padding: 1.1rem;
        background: linear-gradient(180deg, #0f3659 0%, #102f4f 60%, #152746 100%);
        overflow: hidden;
        transition: width 0.25s ease;
      }

      .sidebar-toggle {
        display: flex;
        align-items: center;
        justify-content: center;
        margin-top: 0.5rem;
        width: 100%;
        padding: 0.4rem;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 0.5rem;
        color: #d8e8fb;
        cursor: pointer;
        font-size: 0.85rem;
        transition: background 0.2s;
      }

      .sidebar-toggle:hover {
        background: rgba(255, 255, 255, 0.18);
        color: #fff;
      }

      .nav-icon {
        font-size: 1rem;
        flex-shrink: 0;
      }

      .nav-label {
        margin-left: 0.55rem;
        white-space: nowrap;
        overflow: hidden;
      }

      .sidebar.collapsed .nav-label {
        display: none;
      }

      .brand h2 {
        margin: 0.25rem 0 0;
      }

      .brand-copy {
        margin: 0.45rem 0 0;
        color: #b9d0e8;
        line-height: 1.45;
        font-size: 0.86rem;
      }

      .scope-pill {
        display: inline-flex;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.18);
        background: rgba(255, 255, 255, 0.12);
        padding: 0.38rem 0.72rem;
        font-size: 0.76rem;
        font-weight: 800;
        color: #edf5ff;
      }

      .brand-meta-row {
        margin-top: 0.7rem;
        display: flex;
        flex-wrap: wrap;
        gap: 0.55rem;
        align-items: center;
      }

      .switch-link {
        color: #d8e8fb;
        text-decoration: none;
        border-radius: 999px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        padding: 0.38rem 0.72rem;
        font-size: 0.76rem;
        font-weight: 800;
      }

      .switch-link:hover {
        color: #fff;
        background: rgba(255, 255, 255, 0.1);
      }

      .brand-actions {
        margin-top: 0.9rem;
        display: flex;
        flex-wrap: wrap;
        gap: 0.6rem;
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
        display: flex;
        align-items: center;
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
        border: 1px solid rgba(15, 54, 89, 0.08);
        border-radius: 1rem;
        background: rgba(255, 255, 255, 0.88);
        box-shadow: 0 14px 32px rgba(15, 54, 89, 0.08);
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

      .content-topbar__copy strong {
        color: #14385a;
      }

      .content-topbar__actions {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.65rem;
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
        background: rgba(255, 255, 255, 0.96);
        color: #8b1e1e;
        cursor: pointer;
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
export class ProgramAdminShellComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  sidebarCollapsed = false;

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigate(['/login']);
  }
}
