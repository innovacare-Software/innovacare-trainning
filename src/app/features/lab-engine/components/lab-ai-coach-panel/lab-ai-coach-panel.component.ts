import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LabAiCoachService } from '../../services/lab-ai-coach.service';
import { AiCoachAction, AiCoachResponse } from '../../models/validation-rule.model';

interface ChatMessage {
  id: string;
  role: 'user' | 'coach';
  content: string;
  action?: AiCoachAction;
  timestamp: Date;
}

@Component({
  selector: 'app-lab-ai-coach-panel',
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="coach-panel">
      <!-- Header -->
      <div class="coach-header">
        <div class="coach-avatar">🤖</div>
        <div class="coach-info">
          <span class="coach-name">AI Lab Coach</span>
          <span class="coach-status">{{ coach.isLoading() ? 'thinking...' : 'ready' }}</span>
        </div>
        <div class="coach-limit">
          {{ coach.requestCount() }}/10 hints used
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="coach-quick-actions">
        <button class="quick-btn" (click)="quickAsk('give_hint')"      id="coach-btn-hint">💡 Hint</button>
        <button class="quick-btn" (click)="quickAsk('explain_error')"  id="coach-btn-error">⚠ Explain Error</button>
        <button class="quick-btn" (click)="quickAsk('review_code')"    id="coach-btn-review">📋 Review Code</button>
        <button class="quick-btn" (click)="quickAsk('suggest_next_step')" id="coach-btn-next">➡ Next Step</button>
      </div>

      <!-- Chat Messages -->
      <div class="coach-messages" #messageList>
        @if (messages().length === 0) {
          <div class="coach-welcome">
            <div class="welcome-icon">🎓</div>
            <p>I'm your AI Lab Coach. I can help you understand errors, give hints, review your code, and guide your next steps.</p>
            <p class="welcome-disclaimer">I'll guide you — but I won't solve the lab for you. That's how enterprise skills are built!</p>
          </div>
        }
        @for (msg of messages(); track msg.id) {
          <div class="chat-message" [class.chat-message--user]="msg.role === 'user'" [class.chat-message--coach]="msg.role === 'coach'">
            @if (msg.role === 'coach') {
              <span class="msg-avatar">🤖</span>
            }
            <div class="msg-bubble">
              <div class="msg-content">{{ msg.content }}</div>
              <div class="msg-ts">{{ msg.timestamp | date:'HH:mm:ss' }}</div>
            </div>
          </div>
        }
        @if (coach.isLoading()) {
          <div class="chat-message chat-message--coach">
            <span class="msg-avatar">🤖</span>
            <div class="msg-bubble">
              <div class="typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Input -->
      <div class="coach-input-area">
        <textarea
          class="coach-input"
          [(ngModel)]="questionText"
          placeholder="Ask a question about your current task..."
          rows="2"
          [disabled]="coach.isLoading() || coach.requestCount() >= 10"
          id="coach-input"
          (keydown.enter)="$any($event).shiftKey ? null : sendQuestion($event)">
        </textarea>
        <button
          class="coach-send-btn"
          (click)="send()"
          [disabled]="!questionText.trim() || coach.isLoading() || coach.requestCount() >= 10"
          id="coach-send">
          Send →
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      position: absolute;
      inset: 0;
    }

    .coach-panel {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      background: #0d1117;
      font-family: 'Inter', system-ui, sans-serif;
      overflow: hidden;
    }

    /* ── Header ───────────────────────────────────────────────────────────── */
    .coach-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      background: #010409;
      border-bottom: 1px solid #21262d;
      flex-shrink: 0;
    }
    .coach-avatar { font-size: 1.4rem; }
    .coach-info { display: flex; flex-direction: column; flex: 1; }
    .coach-name { font-size: 0.85rem; font-weight: 700; color: #e2e8f0; }
    .coach-status { font-size: 0.7rem; color: #4ade80; }
    .coach-limit { font-size: 0.7rem; color: #475569; white-space: nowrap; }

    /* ── Quick Actions ────────────────────────────────────────────────────── */
    .coach-quick-actions {
      display: flex;
      gap: 0.4rem;
      padding: 0.6rem;
      border-bottom: 1px solid #21262d;
      flex-wrap: wrap;
      flex-shrink: 0;
    }
    .quick-btn {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.1);
      color: #94a3b8;
      padding: 0.3rem 0.65rem;
      border-radius: 6px;
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.15s;
      font-family: inherit;
    }
    .quick-btn:hover { background: rgba(99,102,241,0.1); color: #a5b4fc; border-color: rgba(99,102,241,0.3); }

    /* ── Messages ─────────────────────────────────────────────────────────── */
    .coach-messages {
      flex: 1;
      min-height: 0;        /* CRITICAL: allows flex to constrain height so overflow-y:auto works */
      overflow-y: auto;
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .coach-messages::-webkit-scrollbar { width: 6px; }
    .coach-messages::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }

    .coach-welcome {
      text-align: center;
      padding: 1.5rem 1rem;
      color: #475569;
    }
    .welcome-icon { font-size: 2rem; margin-bottom: 0.75rem; }
    .coach-welcome p { font-size: 0.82rem; color: #64748b; line-height: 1.6; margin: 0 0 0.5rem; }
    .welcome-disclaimer { font-size: 0.75rem; color: #334155; font-style: italic; }

    .chat-message {
      display: flex;
      gap: 0.5rem;
      align-items: flex-start;
    }
    .chat-message--user { flex-direction: row-reverse; }
    .msg-avatar { font-size: 1.2rem; flex-shrink: 0; margin-top: 2px; }
    .msg-bubble {
      max-width: 85%;
      border-radius: 12px;
      overflow: hidden;
    }
    .chat-message--coach .msg-bubble {
      background: rgba(99,102,241,0.08);
      border: 1px solid rgba(99,102,241,0.2);
    }
    .chat-message--user .msg-bubble {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
    }
    .msg-content {
      font-size: 0.8rem;
      color: #cbd5e1;
      line-height: 1.6;
      padding: 0.6rem 0.75rem;
      white-space: pre-wrap;
    }
    .msg-ts {
      font-size: 0.65rem;
      color: #334155;
      padding: 0 0.75rem 0.4rem;
      font-family: 'JetBrains Mono', monospace;
    }

    .typing-indicator {
      display: flex;
      gap: 4px;
      padding: 0.6rem 0.75rem;
      align-items: center;
    }
    .typing-indicator span {
      width: 6px;
      height: 6px;
      background: #6366f1;
      border-radius: 50%;
      animation: bounce 0.9s ease-in-out infinite;
    }
    .typing-indicator span:nth-child(2) { animation-delay: 0.15s; }
    .typing-indicator span:nth-child(3) { animation-delay: 0.3s; }
    @keyframes bounce {
      0%, 80%, 100% { transform: translateY(0); }
      40% { transform: translateY(-6px); }
    }

    /* ── Input ────────────────────────────────────────────────────────────── */
    .coach-input-area {
      border-top: 1px solid #21262d;
      padding: 0.6rem;
      display: flex;
      gap: 0.5rem;
      align-items: flex-end;
      flex-shrink: 0;
      background: #010409;
    }
    .coach-input {
      flex: 1;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      color: #e2e8f0;
      font-size: 0.8rem;
      padding: 0.5rem 0.75rem;
      resize: none;
      outline: none;
      font-family: inherit;
      line-height: 1.5;
    }
    .coach-input:focus { border-color: rgba(99,102,241,0.4); }
    .coach-input::placeholder { color: #334155; }
    .coach-input:disabled { opacity: 0.5; cursor: not-allowed; }
    .coach-send-btn {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
      border: none;
      border-radius: 8px;
      padding: 0.5rem 0.9rem;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
      font-family: inherit;
      white-space: nowrap;
    }
    .coach-send-btn:hover:not(:disabled) { background: linear-gradient(135deg, #4f46e5, #7c3aed); }
    .coach-send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
})
export class LabAiCoachPanelComponent {
  readonly labId    = input.required<string>();
  readonly sessionId = input.required<string>();
  readonly filePath = input<string | null>(null);

  readonly coach = inject(LabAiCoachService);

  readonly messages = signal<ChatMessage[]>([]);
  questionText = '';

  async quickAsk(action: AiCoachAction): Promise<void> {
    const quickQuestions: Record<AiCoachAction, string> = {
      'give_hint':                'Give me a hint for my current task',
      'explain_error':            'Help me understand what\'s going wrong',
      'review_code':              'Can you review my current file?',
      'suggest_next_step':        'What should I do next?',
      'explain_concept':          'Explain the key concept for this task',
      'provide_partial_example':  'Show me a partial example',
      'reveal_full_solution_before_attempt': '',
      'generate_complete_final_submission': '',
      'execute_cloud_action': '',
      'expose_secrets': '',
      'bypass_approval_gates': '',
    };
    this.questionText = quickQuestions[action] || '';
    await this.askWithAction(action, this.questionText);
  }

  async sendQuestion(event: Event): Promise<void> {
    event.preventDefault();
    await this.send();
  }

  async send(): Promise<void> {
    const q = this.questionText.trim();
    if (!q) return;

    await this.askWithAction('explain_error', q);
  }

  private async askWithAction(action: AiCoachAction, question: string): Promise<void> {
    if (!question.trim() || this.coach.isLoading()) return;

    this.messages.update((msgs) => [
      ...msgs,
      {
        id: Date.now().toString(),
        role: 'user',
        content: question,
        timestamp: new Date(),
      },
    ]);
    this.questionText = '';

    const response = await this.coach.ask({
      action,
      sessionId: this.sessionId(),
      labId: this.labId(),
      filePath: this.filePath() ?? undefined,
      question,
    });

    this.messages.update((msgs) => [
      ...msgs,
      {
        id: (Date.now() + 1).toString(),
        role: 'coach',
        content: response.message,
        timestamp: new Date(),
      },
    ]);
  }
}
