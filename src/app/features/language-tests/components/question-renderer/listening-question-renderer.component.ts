import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ListeningQuestion,
  ListeningAnswer,
  ListeningQuestionMode,
  ListeningMatchingAnswer,
} from '../../models/listening-test.models';

@Component({
  selector: 'app-listening-question-renderer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="question-card" [id]="'q-' + question.id">
      <!-- Question header -->
      <div class="question-header">
        <div class="question-num">Q{{ index + 1 }}</div>
        <div class="question-mode-badge">{{ modeLabel() }}</div>
        <div class="question-pts">{{ question.points ?? 1 }} pt{{ (question.points ?? 1) > 1 ? 's' : '' }}</div>
      </div>

      <!-- Prompt -->
      <p class="question-prompt">{{ question.prompt }}</p>

      <!-- ── SINGLE / TRUE_FALSE / DROPDOWN ── -->
      @if (isSingle()) {
        @if (question.mode === 'dropdown') {
          <select class="dropdown-select" (change)="onDropdown($event)" [value]="currentSingle()">
            <option value="">— Select an answer —</option>
            @for (c of question.choices; track c.id) {
              <option [value]="c.id">{{ c.text }}</option>
            }
          </select>
        } @else {
          <div class="choice-list">
            @for (c of question.choices; track c.id) {
              <button
                type="button"
                class="choice-btn"
                [class.choice-btn--selected]="currentSingle() === c.id"
                (click)="selectSingle(c.id)"
              >
                <span class="choice-key">{{ c.id }}</span>
                <span class="choice-text">{{ c.text }}</span>
              </button>
            }
          </div>
        }
      }

      <!-- ── MULTI ── -->
      @if (question.mode === 'multi') {
        <p class="mode-hint">Select all that apply.</p>
        <div class="choice-list">
          @for (c of question.choices; track c.id) {
            <button
              type="button"
              class="choice-btn"
              [class.choice-btn--selected]="isMultiSelected(c.id)"
              (click)="toggleMulti(c.id)"
            >
              <span class="choice-key">{{ isMultiSelected(c.id) ? '✓' : c.id }}</span>
              <span class="choice-text">{{ c.text }}</span>
            </button>
          }
        </div>
      }

      <!-- ── SHORT_TEXT / FILL_BLANK ── -->
      @if (question.mode === 'short_text' || question.mode === 'fill_blank') {
        <div class="text-input-wrap">
          <input
            type="text"
            class="text-input"
            [placeholder]="question.mode === 'fill_blank' ? 'Fill in the blank…' : 'Write your answer…'"
            [(ngModel)]="textValue"
            (ngModelChange)="onTextChange($event)"
          />
          <span class="text-hint">Press Enter or move to next question to save.</span>
        </div>
      }

      <!-- ── MATCHING ── -->
      @if (question.mode === 'matching') {
        <p class="mode-hint">Match each item on the left with the correct option on the right.</p>
        <div class="matching-table">
          @for (pair of question.matchingPairs; track pair.left) {
            <div class="matching-row">
              <div class="matching-left">{{ pair.left }}</div>
              <select class="matching-select" (change)="onMatchChange(pair.left, $event)" [value]="getMatchRight(pair.left)">
                <option value="">— Select —</option>
                @for (opt of matchingOptions(); track opt) {
                  <option [value]="opt">{{ opt }}</option>
                }
              </select>
            </div>
          }
        </div>
      }

      <!-- Unanswered warning -->
      @if (showUnansweredWarning && !hasAnswer()) {
        <p class="unanswered-warn">⚠ Not answered</p>
      }
    </div>
  `,
  styles: [`
    .question-card {
      background: #fff;
      border: 1px solid #d9e5f2;
      border-radius: 1rem;
      padding: 1.25rem 1.4rem;
      display: grid;
      gap: 0.9rem;
    }
    .question-header { display: flex; align-items: center; gap: 0.6rem; }
    .question-num { width: 2.2rem; height: 2.2rem; display: flex; align-items: center; justify-content: center; background: #e8f0fb; color: #1a74c8; border-radius: 0.5rem; font-weight: 800; font-size: 0.85rem; flex-shrink: 0; }
    .question-mode-badge { padding: 0.18rem 0.55rem; border-radius: 999px; background: #f0f6ff; color: #5079a2; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
    .question-pts { margin-left: auto; color: #7fa3c8; font-size: 0.78rem; }
    .question-prompt { margin: 0; color: #0f2d4d; font-size: 0.97rem; line-height: 1.65; font-weight: 500; }
    .mode-hint { margin: 0; color: #5f7f9f; font-size: 0.82rem; font-style: italic; }

    /* Choices */
    .choice-list { display: grid; gap: 0.55rem; }
    .choice-btn {
      display: flex; align-items: center; gap: 0.75rem;
      padding: 0.7rem 1rem; border-radius: 0.65rem;
      border: 1.5px solid #d9e5f2; background: #f8fbff;
      cursor: pointer; text-align: left; width: 100%;
      transition: border-color 0.15s, background 0.15s;
    }
    .choice-btn:hover { border-color: #90b8e0; background: #f0f6ff; }
    .choice-btn--selected { border-color: #1a74c8; background: #ebf4ff; }
    .choice-key { width: 1.7rem; height: 1.7rem; border-radius: 0.35rem; background: #e8f0fb; color: #1a74c8; font-weight: 800; font-size: 0.8rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .choice-btn--selected .choice-key { background: #1a74c8; color: #fff; }
    .choice-text { color: #1e3a5a; font-size: 0.91rem; flex: 1; }

    /* Dropdown */
    .dropdown-select { width: 100%; padding: 0.65rem 0.8rem; border: 1.5px solid #d9e5f2; border-radius: 0.65rem; font-size: 0.91rem; color: #1e3a5a; outline: none; }
    .dropdown-select:focus { border-color: #1a74c8; }

    /* Text */
    .text-input-wrap { display: grid; gap: 0.3rem; }
    .text-input { padding: 0.65rem 0.8rem; border: 1.5px solid #d9e5f2; border-radius: 0.65rem; font-size: 0.91rem; color: #1e3a5a; outline: none; }
    .text-input:focus { border-color: #1a74c8; }
    .text-hint { font-size: 0.75rem; color: #8fabc8; }

    /* Matching */
    .matching-table { display: grid; gap: 0.55rem; }
    .matching-row { display: flex; align-items: center; gap: 0.75rem; }
    .matching-left { flex: 1; padding: 0.5rem 0.75rem; background: #f0f6ff; border-radius: 0.5rem; color: #1e3a5a; font-size: 0.9rem; font-weight: 500; }
    .matching-select { flex: 1; padding: 0.5rem 0.65rem; border: 1.5px solid #d9e5f2; border-radius: 0.55rem; font-size: 0.88rem; color: #1e3a5a; outline: none; }

    /* Warning */
    .unanswered-warn { margin: 0; color: #ea580c; font-size: 0.8rem; font-weight: 600; }
  `],
})
export class ListeningQuestionRendererComponent implements OnInit {
  @Input({ required: true }) question!: ListeningQuestion;
  @Input({ required: true }) index!: number;
  @Input() showUnansweredWarning = false;
  @Input() initialAnswer: ListeningAnswer | null = null;

  @Output() answerChange = new EventEmitter<ListeningAnswer>();

  // internal state
  readonly singleSelected = signal<string>('');
  readonly multiSelected = signal<Set<string>>(new Set());
  readonly matchingMap = signal<Map<string, string>>(new Map());
  textValue = '';

  readonly modeLabel = computed(() => {
    const labels: Record<ListeningQuestionMode, string> = {
      single: 'Single Choice',
      multi: 'Multiple Choice',
      short_text: 'Short Answer',
      fill_blank: 'Fill in the Blank',
      matching: 'Matching',
      true_false: 'True / False',
      dropdown: 'Dropdown',
    };
    return labels[this.question.mode] ?? this.question.mode;
  });

  readonly isSingle = computed(() =>
    this.question.mode === ListeningQuestionMode.single ||
    this.question.mode === ListeningQuestionMode.true_false ||
    this.question.mode === ListeningQuestionMode.dropdown
  );

  readonly currentSingle = computed(() => this.singleSelected());

  readonly matchingOptions = computed(() => {
    if (this.question.mode !== ListeningQuestionMode.matching) return [];
    const custom = this.question.matchingOptions;
    if (custom?.length) return custom;
    return this.question.matchingPairs?.map((p) => p.right) ?? [];
  });

  ngOnInit(): void {
    if (!this.initialAnswer) return;
    const a = this.initialAnswer;
    if (a.selectedAnswerKeys?.length) {
      if (this.isSingle()) {
        this.singleSelected.set(a.selectedAnswerKeys[0]);
      } else {
        this.multiSelected.set(new Set(a.selectedAnswerKeys));
      }
    }
    if (a.textAnswer) this.textValue = a.textAnswer;
    if (a.matchingAnswers?.length) {
      const m = new Map<string, string>();
      a.matchingAnswers.forEach((ma) => m.set(ma.left, ma.selectedRight));
      this.matchingMap.set(m);
    }
  }

  hasAnswer(): boolean {
    switch (this.question.mode) {
      case ListeningQuestionMode.single:
      case ListeningQuestionMode.true_false:
      case ListeningQuestionMode.dropdown:
        return !!this.singleSelected();
      case ListeningQuestionMode.multi:
        return this.multiSelected().size > 0;
      case ListeningQuestionMode.short_text:
      case ListeningQuestionMode.fill_blank:
        return !!this.textValue.trim();
      case ListeningQuestionMode.matching:
        return this.matchingMap().size === (this.question.matchingPairs?.length ?? 0);
    }
  }

  selectSingle(id: string): void {
    this.singleSelected.set(id);
    this.emit();
  }

  onDropdown(event: Event): void {
    this.singleSelected.set((event.target as HTMLSelectElement).value);
    this.emit();
  }

  isMultiSelected(id: string): boolean {
    return this.multiSelected().has(id);
  }

  toggleMulti(id: string): void {
    const s = new Set(this.multiSelected());
    s.has(id) ? s.delete(id) : s.add(id);
    this.multiSelected.set(s);
    this.emit();
  }

  onTextChange(val: string): void {
    this.textValue = val;
    this.emit();
  }

  onMatchChange(left: string, event: Event): void {
    const right = (event.target as HTMLSelectElement).value;
    const m = new Map(this.matchingMap());
    m.set(left, right);
    this.matchingMap.set(m);
    this.emit();
  }

  getMatchRight(left: string): string {
    return this.matchingMap().get(left) ?? '';
  }

  private emit(): void {
    let answer: ListeningAnswer;

    if (this.isSingle()) {
      answer = {
        questionId: this.question.id,
        mode: this.question.mode,
        selectedAnswerKeys: this.singleSelected() ? [this.singleSelected()] : [],
      };
    } else if (this.question.mode === ListeningQuestionMode.multi) {
      answer = {
        questionId: this.question.id,
        mode: this.question.mode,
        selectedAnswerKeys: [...this.multiSelected()],
      };
    } else if (this.question.mode === ListeningQuestionMode.matching) {
      const matchingAnswers: ListeningMatchingAnswer[] = [];
      this.matchingMap().forEach((right, left) => matchingAnswers.push({ left, selectedRight: right }));
      answer = { questionId: this.question.id, mode: this.question.mode, matchingAnswers };
    } else {
      answer = {
        questionId: this.question.id,
        mode: this.question.mode,
        textAnswer: this.textValue,
      };
    }

    this.answerChange.emit(answer);
  }
}
