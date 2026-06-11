import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LabDefinition, LabTask } from '../../models/lab-definition.model';

@Component({
  selector: 'app-lab-instructions-panel',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="instructions-panel">
      <!-- Mission Brief -->
      <section class="mission-section">
        <div class="mission-header">
          <span class="mission-icon">🎯</span>
          <h2 class="mission-title">Mission Brief</h2>
        </div>
        <div class="role-badge">
          <span class="role-label">ENTERPRISE ROLE</span>
          <span class="role-value">{{ getRoleForCategory(lab()?.category) }}</span>
        </div>
        <div class="scenario-block">
          <p class="scenario-context">{{ lab()?.description }}</p>
        </div>
        <div class="outcomes-list">
          <h3 class="outcomes-title">Learning Outcomes</h3>
          <ul>
            @for (outcome of lab()?.learningOutcomes ?? []; track outcome) {
              <li class="outcome-item">✓ {{ outcome }}</li>
            }
          </ul>
        </div>
      </section>

      <div class="panel-divider"></div>

      <!-- Task Stepper -->
      <section class="tasks-section">
        <h3 class="tasks-title">📋 Tasks</h3>
        <div class="task-list">
          @for (task of tasks(); track task.id) {
            <div
              class="task-item"
              [class.task-item--active]="activeTaskId() === task.id"
              [class.task-item--passed]="passedTaskIds().includes(task.id)"
              (click)="onTaskSelect.emit(task.id)"
              [id]="'task-' + task.id"
              role="button"
              tabindex="0">
              <div class="task-item__status">
                @if (passedTaskIds().includes(task.id)) {
                  <span class="status-icon status-icon--pass">✓</span>
                } @else if (activeTaskId() === task.id) {
                  <span class="status-icon status-icon--active">▶</span>
                } @else {
                  <span class="status-icon status-icon--pending">○</span>
                }
              </div>
              <div class="task-item__content">
                <span class="task-item__num">Task {{ task.order }}</span>
                <span class="task-item__title">{{ task.title }}</span>
                <span class="task-item__xp">+{{ task.xp }} XP</span>
              </div>
            </div>
          }
        </div>
      </section>

      <div class="panel-divider"></div>

      <!-- Current Task Instructions -->
      @if (activeTask()) {
        <section class="current-task">
          <h3 class="current-task__title">{{ activeTask()?.title }}</h3>
          <p class="current-task__mission">{{ activeTask()?.mission }}</p>
          <div class="current-task__instructions">{{ activeTask()?.instructions }}</div>

          @if (activeTask()?.hints?.length) {
            <details class="hints-accordion">
              <summary class="hints-trigger">💡 Hints ({{ activeTask()?.hints?.length }})</summary>
              <ul class="hints-list">
                @for (hint of activeTask()?.hints ?? []; track hint) {
                  <li>{{ hint }}</li>
                }
              </ul>
            </details>
          }

          <!-- Required files for this task -->
          @if (activeTask()?.expectedFiles?.length) {
            <div class="required-files">
              <h4>📁 Required Files</h4>
              <ul>
                @for (file of activeTask()?.expectedFiles ?? []; track file) {
                  <li class="required-file">{{ file }}</li>
                }
              </ul>
            </div>
          }
        </section>
      }
    </aside>
  `,
  styles: [`
    /* ── Host fills the .ide-panel (which has position:relative) ──────────── */
    :host {
      display: block;
      position: absolute;
      inset: 0;
      overflow: hidden;
    }

    .instructions-panel {
      position: absolute;
      inset: 0;
      overflow-y: auto;
      overflow-x: hidden;
      background: #0d1117;
      display: flex;
      flex-direction: column;
      gap: 0;
      font-family: 'Inter', system-ui, sans-serif;
      /* Thin dark scrollbar */
      scrollbar-width: thin;
      scrollbar-color: #30363d transparent;
    }
    .instructions-panel::-webkit-scrollbar { width: 4px; }
    .instructions-panel::-webkit-scrollbar-track { background: transparent; }
    .instructions-panel::-webkit-scrollbar-thumb { background: #30363d; border-radius: 4px; }
    .instructions-panel::-webkit-scrollbar-thumb:hover { background: #484f58; }


    /* ── Mission Section ──────────────────────────────────────────────────── */
    .mission-section { padding: 1.25rem; }
    .mission-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    .mission-icon { font-size: 1.1rem; }
    .mission-title {
      font-size: 0.875rem;
      font-weight: 700;
      color: #e2e8f0;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .role-badge {
      background: linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.1));
      border: 1px solid rgba(99,102,241,0.3);
      border-radius: 8px;
      padding: 0.6rem 0.9rem;
      margin-bottom: 0.9rem;
    }
    .role-label {
      display: block;
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      color: #6366f1;
      text-transform: uppercase;
      margin-bottom: 0.15rem;
    }
    .role-value {
      font-size: 0.875rem;
      font-weight: 700;
      color: #a5b4fc;
    }

    .scenario-block {
      background: rgba(255,255,255,0.03);
      border-left: 3px solid #6366f1;
      border-radius: 0 6px 6px 0;
      padding: 0.75rem;
      margin-bottom: 0.9rem;
    }
    .scenario-context {
      font-size: 0.8rem;
      color: #94a3b8;
      line-height: 1.6;
      margin: 0;
    }

    .outcomes-title {
      font-size: 0.72rem;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin: 0 0 0.5rem;
    }
    .outcomes-list ul { list-style: none; padding: 0; margin: 0; }
    .outcome-item {
      font-size: 0.78rem;
      color: #4ade80;
      padding: 0.2rem 0;
      line-height: 1.4;
    }

    /* ── Panel Divider ────────────────────────────────────────────────────── */
    .panel-divider { border-top: 1px solid #21262d; margin: 0; }

    /* ── Tasks Section ────────────────────────────────────────────────────── */
    .tasks-section { padding: 1rem 1.25rem; }
    .tasks-title {
      font-size: 0.75rem;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin: 0 0 0.75rem;
    }
    .task-list { display: flex; flex-direction: column; gap: 0.35rem; }
    .task-item {
      display: flex;
      align-items: flex-start;
      gap: 0.6rem;
      padding: 0.6rem;
      border-radius: 8px;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.15s;
    }
    .task-item:hover { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.08); }
    .task-item--active { background: rgba(99,102,241,0.08); border-color: rgba(99,102,241,0.3); }
    .task-item--passed { background: rgba(34,197,94,0.05); border-color: rgba(34,197,94,0.2); }

    .task-item__status { flex-shrink: 0; padding-top: 1px; }
    .status-icon { font-size: 0.875rem; font-weight: 700; }
    .status-icon--pass   { color: #4ade80; }
    .status-icon--active { color: #6366f1; }
    .status-icon--pending{ color: #334155; }

    .task-item__content {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
      min-width: 0;
    }
    .task-item__num {
      font-size: 0.65rem;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .task-item__title {
      font-size: 0.8rem;
      font-weight: 600;
      color: #cbd5e1;
      line-height: 1.3;
    }
    .task-item__xp { font-size: 0.7rem; color: #f59e0b; }

    /* ── Current Task ─────────────────────────────────────────────────────── */
    .current-task { padding: 1.25rem; }
    .current-task__title {
      font-size: 0.9rem;
      font-weight: 700;
      color: #e2e8f0;
      margin: 0 0 0.5rem;
    }
    .current-task__mission {
      font-size: 0.8rem;
      color: #6366f1;
      font-style: italic;
      margin: 0 0 0.75rem;
      line-height: 1.5;
    }
    .current-task__instructions {
      font-size: 0.8rem;
      color: #94a3b8;
      line-height: 1.7;
      white-space: pre-wrap;
    }

    .hints-accordion {
      margin-top: 1rem;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 6px;
      overflow: hidden;
    }
    .hints-trigger {
      padding: 0.6rem 0.8rem;
      font-size: 0.8rem;
      color: #fbbf24;
      cursor: pointer;
      font-weight: 600;
      list-style: none;
    }
    .hints-list {
      padding: 0.5rem 0.8rem 0.8rem 1.5rem;
      margin: 0;
    }
    .hints-list li {
      font-size: 0.78rem;
      color: #94a3b8;
      padding: 0.2rem 0;
      line-height: 1.5;
    }

    .required-files { margin-top: 1rem; }
    .required-files h4 {
      font-size: 0.72rem;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin: 0 0 0.4rem;
    }
    .required-files ul { list-style: none; padding: 0; margin: 0; }
    .required-file {
      font-size: 0.78rem;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      color: #38bdf8;
      padding: 0.15rem 0;
    }
  `],
})
export class LabInstructionsPanelComponent {
  readonly lab          = input<LabDefinition | null>(null);
  readonly tasks        = input<LabTask[]>([]);
  readonly activeTaskId = input<string | null>(null);
  readonly passedTaskIds = input<string[]>([]);
  readonly onTaskSelect  = output<string>();

  readonly activeTask = () => {
    const id = this.activeTaskId();
    return this.tasks().find((t) => t.id === id) ?? null;
  };

  getRoleForCategory(category?: string): string {
    const roles: Record<string, string> = {
      'devops':           'DevOps Engineer',
      'cloud':            'Cloud Architect',
      'linux':            'SysAdmin / Platform Eng',
      'web-development':  'Frontend Developer',
      'agentic-ai':       'AI Agent Builder',
      'ai-agent-creation':'AI System Designer',
      'rag-prompt-stack': 'Prompt Engineer',
      'sysadmin-aiops':   'AI Ops Engineer',
    };
    return roles[category ?? ''] ?? 'Technical Professional';
  }
}
