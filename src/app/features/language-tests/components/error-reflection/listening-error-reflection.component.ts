import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ListeningQuestion,
  ListeningAnswer,
  ListeningErrorCategory,
  ListeningErrorReflection,
  ERROR_CATEGORY_LABELS,
  GradingResult,
} from '../../models/listening-test.models';

@Component({
  selector: 'app-listening-error-reflection',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="reflection-panel">
      <div class="reflection-header">
        <span class="reflection-icon">🔍</span>
        <div>
          <h3>Error Reflection</h3>
          <p>For each incorrect answer, identify why you missed it and plan your improvement.</p>
        </div>
        <span class="reflection-progress">{{ completed() }} / {{ wrongAnswers().length }} completed</span>
      </div>

      @for (item of wrongAnswers(); track item.questionId; let i = $index) {
        @let q = getQuestion(item.questionId);
        @if (q) {
          <div class="reflection-card" [class.reflection-card--done]="isItemDone(item.questionId)">
            <div class="reflection-card__head">
              <div class="rf-num">{{ i + 1 }}</div>
              <div class="rf-question">
                <strong>Q: {{ q.prompt }}</strong>
                @if (showCorrectAnswers) {
                  <span class="rf-correct">Correct: {{ formatCorrect(q) }}</span>
                }
              </div>
              @if (isItemDone(item.questionId)) {
                <span class="rf-done-badge">✓ Done</span>
              }
            </div>

            <!-- Error category -->
            <div class="rf-field">
              <label class="rf-label">What caused this error?</label>
              <div class="category-chips">
                @for (cat of categories(); track cat) {
                  <button
                    type="button"
                    class="chip"
                    [class.chip--selected]="getReflection(item.questionId)?.selectedCategory === cat"
                    (click)="setCategory(item.questionId, cat)"
                  >
                    {{ getCategoryLabel(cat) }}
                  </button>
                }
              </div>
            </div>

            <!-- Learner explanation -->
            <div class="rf-field">
              <label class="rf-label">Why did you miss this question?</label>
              <textarea
                class="rf-textarea"
                rows="2"
                placeholder="Describe what you thought and what you missed…"
                [value]="getReflection(item.questionId)?.learnerExplanation ?? ''"
                (input)="setExplanation(item.questionId, $event)"
              ></textarea>
            </div>

            <!-- Correction plan -->
            <div class="rf-field">
              <label class="rf-label">What will you do differently next time?</label>
              <textarea
                class="rf-textarea"
                rows="2"
                placeholder="Describe your strategy to avoid this error in the future…"
                [value]="getReflection(item.questionId)?.correctionPlan ?? ''"
                (input)="setCorrectionPlan(item.questionId, $event)"
              ></textarea>
            </div>
          </div>
        }
      }

      <div class="reflection-footer">
        <p class="footer-note" *ngIf="completed() < wrongAnswers().length">
          ⚠ Please complete all {{ wrongAnswers().length }} reflection(s) before saving.
        </p>
        <button
          type="button"
          class="btn-save"
          [disabled]="completed() < wrongAnswers().length || saving()"
          (click)="save()"
        >
          {{ saving() ? 'Saving…' : '💾 Save Error Log' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .reflection-panel { display: grid; gap: 1rem; }

    .reflection-header { display: flex; align-items: flex-start; gap: 0.85rem; background: #fffbeb; border: 1px solid #fde68a; border-radius: 1rem; padding: 1.1rem 1.3rem; flex-wrap: wrap; }
    .reflection-icon { font-size: 2rem; flex-shrink: 0; }
    .reflection-header div { flex: 1; }
    .reflection-header h3 { margin: 0 0 0.2rem; color: #92400e; font-size: 1rem; }
    .reflection-header p { margin: 0; color: #78350f; font-size: 0.85rem; }
    .reflection-progress { color: #92400e; font-weight: 700; font-size: 0.85rem; white-space: nowrap; }

    .reflection-card { background: #fff; border: 1.5px solid #d9e5f2; border-radius: 1rem; overflow: hidden; }
    .reflection-card--done { border-color: #86efac; }
    .reflection-card__head { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.85rem 1rem; background: #f8fbff; border-bottom: 1px solid #e8f0fb; }
    .rf-num { width: 2rem; height: 2rem; border-radius: 0.45rem; background: #fee2e2; color: #dc2626; font-weight: 800; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .rf-question { flex: 1; }
    .rf-question strong { display: block; color: #0f2d4d; font-size: 0.93rem; line-height: 1.5; }
    .rf-correct { display: block; color: #16a34a; font-size: 0.78rem; margin-top: 0.2rem; font-weight: 600; }
    .rf-done-badge { padding: 0.2rem 0.55rem; background: #dcfce7; color: #16a34a; border-radius: 999px; font-size: 0.72rem; font-weight: 800; white-space: nowrap; }

    .rf-field { padding: 0.75rem 1rem; border-bottom: 1px solid #eef3fb; display: grid; gap: 0.5rem; }
    .rf-field:last-of-type { border-bottom: none; }
    .rf-label { font-size: 0.78rem; font-weight: 700; color: #5f7f9f; text-transform: uppercase; letter-spacing: 0.05em; }

    .category-chips { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .chip { padding: 0.25rem 0.65rem; border-radius: 999px; border: 1.5px solid #d9e5f2; background: #f8fbff; color: #5079a2; font-size: 0.78rem; font-weight: 600; cursor: pointer; transition: all 0.15s; }
    .chip:hover { border-color: #90b8e0; background: #e8f4ff; }
    .chip--selected { border-color: #f59e0b; background: #fef3c7; color: #92400e; }

    .rf-textarea { padding: 0.6rem 0.75rem; border: 1.5px solid #d9e5f2; border-radius: 0.6rem; font-size: 0.88rem; color: #1e3a5a; resize: vertical; outline: none; width: 100%; box-sizing: border-box; }
    .rf-textarea:focus { border-color: #1a74c8; }

    .reflection-footer { display: flex; justify-content: flex-end; align-items: center; gap: 1rem; flex-wrap: wrap; padding-top: 0.5rem; }
    .footer-note { margin: 0; color: #ea580c; font-size: 0.83rem; }
    .btn-save { padding: 0.6rem 1.5rem; border: none; border-radius: 0.65rem; background: linear-gradient(135deg, #065f46, #16a34a); color: #fff; font-weight: 700; font-size: 0.9rem; cursor: pointer; }
    .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
})
export class ListeningErrorReflectionComponent {
  @Input({ required: true }) questions!: ListeningQuestion[];
  @Input({ required: true }) grading!: GradingResult;
  @Input() errorCategories: ListeningErrorCategory[] = Object.values(ListeningErrorCategory);
  @Input() showCorrectAnswers = false;

  @Output() logSaved = new EventEmitter<ListeningErrorReflection[]>();

  readonly ERROR_CATEGORY_LABELS = ERROR_CATEGORY_LABELS;
  readonly saving = signal(false);

  private reflections = signal<Map<string, ListeningErrorReflection>>(new Map());

  readonly categories = computed(() =>
    this.errorCategories.length ? this.errorCategories : Object.values(ListeningErrorCategory)
  );

  readonly wrongAnswers = computed(() =>
    this.grading.answers.filter((a) => !a.isCorrect)
  );

  readonly completed = computed(() => {
    let count = 0;
    for (const a of this.wrongAnswers()) {
      const r = this.reflections().get(a.questionId);
      if (r?.selectedCategory) count++;
    }
    return count;
  });

  getQuestion(qId: string) {
    return this.questions.find((q) => q.id === qId) ?? null;
  }

  getReflection(qId: string): ListeningErrorReflection | undefined {
    return this.reflections().get(qId);
  }

  isItemDone(qId: string): boolean {
    return !!this.reflections().get(qId)?.selectedCategory;
  }

  getCategoryLabel(cat: ListeningErrorCategory): string {
    return ERROR_CATEGORY_LABELS[cat] ?? cat;
  }

  setCategory(qId: string, cat: ListeningErrorCategory): void {
    const m = new Map(this.reflections());
    const existing = m.get(qId) ?? { questionId: qId, selectedCategory: cat };
    m.set(qId, { ...existing, selectedCategory: cat });
    this.reflections.set(m);
  }

  setExplanation(qId: string, event: Event): void {
    const val = (event.target as HTMLTextAreaElement).value;
    const m = new Map(this.reflections());
    const existing = m.get(qId) ?? { questionId: qId, selectedCategory: ListeningErrorCategory.UNKNOWN };
    m.set(qId, { ...existing, learnerExplanation: val });
    this.reflections.set(m);
  }

  setCorrectionPlan(qId: string, event: Event): void {
    const val = (event.target as HTMLTextAreaElement).value;
    const m = new Map(this.reflections());
    const existing = m.get(qId) ?? { questionId: qId, selectedCategory: ListeningErrorCategory.UNKNOWN };
    m.set(qId, { ...existing, correctionPlan: val });
    this.reflections.set(m);
  }

  save(): void {
    this.saving.set(true);
    const log: ListeningErrorReflection[] = [];
    for (const a of this.wrongAnswers()) {
      const r = this.reflections().get(a.questionId);
      if (r) log.push(r);
    }
    this.logSaved.emit(log);
    this.saving.set(false);
  }

  formatCorrect(q: ListeningQuestion): string {
    if (q.acceptedAnswers?.length) return q.acceptedAnswers.join(' / ');
    if (q.matchingPairs?.length) return q.matchingPairs.map((p) => `${p.left} → ${p.right}`).join(' | ');
    const keys = q.correctAnswerKey ?? [];
    if (!keys.length) return '—';
    const choice = q.choices?.find((c) => c.id === keys[0]);
    return choice ? `${keys[0]}: ${choice.text}` : keys.join(', ');
  }
}
