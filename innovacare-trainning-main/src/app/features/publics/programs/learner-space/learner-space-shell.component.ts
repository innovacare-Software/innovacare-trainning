import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { map, switchMap } from 'rxjs/operators';
import { ProgramsService } from '../programs.service';
import { ProgramProgressService } from '../program-progress.service';

@Component({
  selector: 'app-learner-space-shell',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="ls-shell" [class.sidebar-collapsed]="collapsed()">
      <!-- Sidebar -->
      <aside class="ls-sidebar">
        <div class="ls-sidebar-header">
          <div class="ls-program-badge">
            @if (program(); as p) {
              <span class="ls-badge-icon">🎓</span>
              <span class="ls-badge-title">{{ p.title }}</span>
              <span class="ls-badge-category">{{ p.category }}</span>
            }
          </div>
          <button class="ls-collapse-btn" (click)="collapsed.set(!collapsed())">
            {{ collapsed() ? '▶' : '◀' }}
          </button>
        </div>

        <nav class="ls-nav">
          @for (item of navItems; track item.route) {
            <a class="ls-nav-item"
               [routerLink]="[item.route]"
               routerLinkActive="ls-nav-active"
               [routerLinkActiveOptions]="{ exact: item.exact }">
              <span class="ls-nav-icon">{{ item.icon }}</span>
              @if (!collapsed()) {
                <span class="ls-nav-label">{{ item.label }}</span>
                @if (item.badge && item.badge() > 0) {
                  <span class="ls-nav-badge">{{ item.badge() }}</span>
                }
              }
            </a>
          }
        </nav>

        @if (!collapsed()) {
          <div class="ls-sidebar-footer">
            <div class="ls-progress-mini">
              <div class="ls-progress-ring">
                <svg viewBox="0 0 36 36">
                  <path class="ls-ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                  <path class="ls-ring-fill"
                    [attr.stroke-dasharray]="progressPct() + ', 100'"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                </svg>
                <span class="ls-ring-text">{{ progressPct() }}%</span>
              </div>
              <span class="ls-progress-label">Overall Progress</span>
            </div>
            <a class="ls-back-link" routerLink="/my-programs">← My Programs</a>
          </div>
        }
      </aside>

      <!-- Main Content -->
      <main class="ls-content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    .ls-shell {
      display: flex;
      min-height: 100vh;
      background: #f5f7fa;
      color: #374151;
    }

    .ls-sidebar {
      width: 260px;
      background: #ffffff;
      border-right: 1px solid #e5e7eb;
      display: flex;
      flex-direction: column;
      transition: width .25s ease;
      position: sticky;
      top: 0;
      height: 100vh;
      overflow-y: auto;
      box-shadow: 1px 0 4px rgba(0,0,0,.04);
    }
    .sidebar-collapsed .ls-sidebar { width: 60px; }

    .ls-sidebar-header {
      padding: 1.2rem .8rem;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      border-bottom: 1px solid #e5e7eb;
    }
    .ls-program-badge {
      display: flex;
      flex-direction: column;
      gap: .2rem;
      overflow: hidden;
    }
    .sidebar-collapsed .ls-program-badge { display: none; }
    .ls-badge-icon { font-size: 1.4rem; }
    .ls-badge-title {
      font-size: .85rem;
      font-weight: 700;
      color: #111827;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 160px;
    }
    .ls-badge-category {
      font-size: .65rem;
      color: #6366f1;
      text-transform: uppercase;
      letter-spacing: .05em;
    }

    .ls-collapse-btn {
      background: none;
      border: 1px solid #e5e7eb;
      color: #6366f1;
      font-size: .75rem;
      padding: .25rem .4rem;
      border-radius: 6px;
      cursor: pointer;
      transition: background .2s;
    }
    .ls-collapse-btn:hover { background: #eef2ff; }

    .ls-nav {
      flex: 1;
      padding: .5rem 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .ls-nav-item {
      display: flex;
      align-items: center;
      gap: .6rem;
      padding: .55rem .9rem;
      margin: 0 .4rem;
      border-radius: 8px;
      text-decoration: none;
      color: #6b7280;
      font-size: .82rem;
      transition: all .18s ease;
      position: relative;
    }
    .ls-nav-item:hover {
      background: #f3f4f6;
      color: #111827;
    }
    .ls-nav-active {
      background: #eef2ff !important;
      color: #4f46e5 !important;
      font-weight: 600;
    }
    .ls-nav-active::before {
      content: '';
      position: absolute;
      left: -0.4rem;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 60%;
      background: #6366f1;
      border-radius: 0 3px 3px 0;
    }
    .ls-nav-icon { font-size: 1.05rem; flex-shrink: 0; }
    .ls-nav-label { white-space: nowrap; }
    .ls-nav-badge {
      margin-left: auto;
      background: #6366f1;
      color: #fff;
      font-size: .65rem;
      padding: .1rem .45rem;
      border-radius: 10px;
      font-weight: 700;
    }
    .sidebar-collapsed .ls-nav-label,
    .sidebar-collapsed .ls-nav-badge { display: none; }
    .sidebar-collapsed .ls-nav-item { justify-content: center; padding: .55rem; }

    .ls-sidebar-footer {
      padding: 1rem .8rem;
      border-top: 1px solid #e5e7eb;
      display: flex;
      flex-direction: column;
      gap: .6rem;
      align-items: center;
    }
    .ls-progress-mini { display: flex; align-items: center; gap: .5rem; }
    .ls-progress-ring { width: 42px; height: 42px; position: relative; }
    .ls-progress-ring svg { width: 100%; height: 100%; transform: rotate(-90deg); }
    .ls-ring-bg { fill: none; stroke: #e5e7eb; stroke-width: 3; }
    .ls-ring-fill { fill: none; stroke: #6366f1; stroke-width: 3; stroke-linecap: round; transition: stroke-dasharray .6s ease; }
    .ls-ring-text {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: .6rem;
      font-weight: 700;
      color: #4f46e5;
    }
    .ls-progress-label { font-size: .7rem; color: #6b7280; }
    .ls-back-link {
      font-size: .72rem;
      color: #6366f1;
      text-decoration: none;
      opacity: .8;
      transition: opacity .2s;
    }
    .ls-back-link:hover { opacity: 1; }

    .ls-content {
      flex: 1;
      padding: 1.5rem 2rem;
      overflow-y: auto;
      min-height: 100vh;
    }

    @media (max-width: 768px) {
      .ls-shell { flex-direction: column; }
      .ls-sidebar {
        width: 100% !important;
        height: auto;
        position: relative;
        flex-direction: row;
        flex-wrap: wrap;
        border-right: none;
        border-bottom: 1px solid #e5e7eb;
        box-shadow: 0 1px 4px rgba(0,0,0,.06);
      }
      .ls-sidebar-header { flex: 1 1 100%; }
      .ls-nav { flex-direction: row; flex-wrap: wrap; padding: .4rem; gap: 4px; }
      .ls-nav-item { padding: .4rem .6rem; font-size: .75rem; }
      .ls-sidebar-footer { flex-direction: row; flex-wrap: wrap; }
      .ls-content { padding: 1rem; }
    }
  `],
})
export class LearnerSpaceShellComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly programsService = inject(ProgramsService);
  private readonly progressService = inject(ProgramProgressService);

  collapsed = signal(false);

  private readonly programId$ = this.route.paramMap.pipe(
    map((p) => p.get('programId') || '')
  );

  readonly program = toSignal(
    this.programId$.pipe(switchMap((id) => this.programsService.getProgramById(id))),
    { initialValue: undefined }
  );

  private readonly vm = toSignal(
    this.programId$.pipe(switchMap((id) => this.progressService.buildDashboardStats(id))),
    { initialValue: undefined }
  );

  readonly progressPct = computed(() => this.vm()?.stats?.overallProgressPct ?? 0);

  readonly navItems = [
    { route: 'dashboard', label: 'Dashboard', icon: '📊', exact: true, badge: undefined as (() => number) | undefined },
    { route: 'modules', label: 'Modules', icon: '📚', exact: false, badge: undefined },
    { route: 'documents', label: 'Documents', icon: '📄', exact: false, badge: undefined },
    { route: 'live-sessions', label: 'Live Sessions', icon: '🎥', exact: false, badge: undefined },
    { route: 'assessments', label: 'Assessments', icon: '📝', exact: false, badge: undefined },
    { route: 'simulations', label: 'CBT / Simulations', icon: '🧪', exact: false, badge: undefined },
    { route: 'case-studies', label: 'Case Studies', icon: '🔬', exact: false, badge: undefined },
    { route: 'resources', label: 'Resources', icon: '📁', exact: false, badge: undefined },
  ];
}
