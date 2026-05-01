import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { ProgramsAdminService } from '../services/programs-admin.service';

@Component({
  selector: 'app-content-shell',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="cs-wrap">

      <!-- Top Bar -->
      <div class="cs-topbar">
        <a routerLink="/program-admin/programs" class="cs-back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Programs
        </a>
        <div class="cs-program-info">
          <span class="cs-program-name">{{ program()?.title || '…' }}</span>
          <span class="cs-badge" [class]="'cs-badge--' + statusClass()">
            {{ program()?.status || 'DRAFT' }}
          </span>
          @if (program()?.active) {
            <span class="cs-badge cs-badge--active">Active</span>
          }
        </div>
        <a [routerLink]="['/program-admin/programs', programId, 'preview']"
           class="cs-preview-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          Preview
        </a>
      </div>

      <!-- Tab Navigation -->
      <nav class="cs-tabs">
        <a [routerLink]="['/program-admin/programs', programId, 'content']"
           routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}">
           <span class="cs-tab-icon">📊</span> Overview
        </a>
        <a [routerLink]="['/program-admin/programs', programId, 'modules']"
           routerLinkActive="active">
           <span class="cs-tab-icon">📦</span> Modules
        </a>
        <a [routerLink]="['/program-admin/programs', programId, 'lessons']"
           routerLinkActive="active">
           <span class="cs-tab-icon">📖</span> Lessons
        </a>
        <a [routerLink]="['/program-admin/programs', programId, 'documents']"
           routerLinkActive="active">
           <span class="cs-tab-icon">📄</span> Documents
        </a>
        <a [routerLink]="['/program-admin/programs', programId, 'live-sessions']"
           routerLinkActive="active">
           <span class="cs-tab-icon">🎥</span> Live Sessions
        </a>
        <a [routerLink]="['/program-admin/programs', programId, 'assessments']"
           routerLinkActive="active">
           <span class="cs-tab-icon">📝</span> Assessments
        </a>
        <a [routerLink]="['/program-admin/programs', programId, 'simulations']"
           routerLinkActive="active">
           <span class="cs-tab-icon">🖥️</span> Simulations
        </a>
        <a [routerLink]="['/program-admin/programs', programId, 'case-studies']"
           routerLinkActive="active">
           <span class="cs-tab-icon">🩺</span> Case Studies
        </a>
        <a [routerLink]="['/program-admin/programs', programId, 'resources']"
           routerLinkActive="active">
           <span class="cs-tab-icon">🗂️</span> Resources
        </a>
      </nav>

      <!-- Page Outlet -->
      <div class="cs-body">
        <router-outlet></router-outlet>
      </div>

    </div>
  `,
  styles: [`
    :host { display: block; font-family: 'Manrope','Segoe UI',sans-serif; min-height: 100vh; background: #f0f4f9; }

    .cs-wrap { display: flex; flex-direction: column; min-height: 100vh; }

    /* ── Top Bar ── */
    .cs-topbar {
      display: flex; align-items: center; gap: 16px; padding: 12px 24px;
      background: linear-gradient(135deg, #0f3659 0%, #1a73e8 100%);
      color: #fff; flex-shrink: 0;
    }
    .cs-back {
      display: flex; align-items: center; gap: 6px;
      color: rgba(255,255,255,.8); text-decoration: none; font-size: 13px; font-weight: 500;
      padding: 6px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,.2);
      transition: background .15s;
    }
    .cs-back:hover { background: rgba(255,255,255,.15); color: #fff; }
    .cs-program-info { display: flex; align-items: center; gap: 10px; flex: 1; }
    .cs-program-name { font-size: 15px; font-weight: 700; color: #fff; }
    .cs-badge {
      font-size: 11px; font-weight: 700; padding: 2px 10px; border-radius: 20px;
      text-transform: uppercase; letter-spacing: .05em;
    }
    .cs-badge--published, .cs-badge--PUBLISHED { background: #10b981; color: #fff; }
    .cs-badge--draft, .cs-badge--DRAFT { background: rgba(255,255,255,.2); color: #fff; }
    .cs-badge--archived, .cs-badge--ARCHIVED { background: #64748b; color: #fff; }
    .cs-badge--active { background: #22c55e; color: #fff; }
    .cs-preview-btn {
      display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600;
      color: #fff; background: rgba(255,255,255,.15); border: 1px solid rgba(255,255,255,.3);
      border-radius: 8px; padding: 6px 14px; text-decoration: none; transition: background .15s;
    }
    .cs-preview-btn:hover { background: rgba(255,255,255,.25); }

    /* ── Tabs ── */
    .cs-tabs {
      display: flex; align-items: center; gap: 2px; padding: 0 20px;
      background: #fff; border-bottom: 2px solid #e0e7f0; overflow-x: auto;
      scrollbar-width: none; flex-shrink: 0;
    }
    .cs-tabs::-webkit-scrollbar { display: none; }
    .cs-tabs a {
      display: flex; align-items: center; gap: 6px; padding: 14px 16px;
      font-size: 13px; font-weight: 500; color: #64748b; text-decoration: none;
      white-space: nowrap; border-bottom: 2px solid transparent; margin-bottom: -2px;
      transition: color .15s, border-color .15s;
    }
    .cs-tabs a:hover { color: #1a73e8; }
    .cs-tabs a.active { color: #1a73e8; border-bottom-color: #1a73e8; font-weight: 700; }
    .cs-tab-icon { font-size: 14px; }

    /* ── Body ── */
    .cs-body { flex: 1; padding: 28px 28px 40px; }

    @media (max-width: 900px) {
      .cs-topbar { padding: 10px 16px; }
      .cs-body { padding: 16px; }
    }
  `],
})
export class ContentShellComponent {
  private route = inject(ActivatedRoute);
  private programsService = inject(ProgramsAdminService);

  readonly programId: string = this.route.snapshot.pathFromRoot
    .map((routeSnapshot) => routeSnapshot.paramMap.get('programId'))
    .find((value): value is string => !!value?.trim()) ?? '';

  private program$ = this.programsService.getProgramById(this.programId);
  readonly program = toSignal(this.program$, { initialValue: null });

  readonly statusClass = computed(() =>
    (this.program()?.status ?? 'DRAFT').toLowerCase()
  );
}
