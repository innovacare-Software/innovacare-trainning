import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuizQuestion } from '../../models/question.model';

@Component({
  selector: 'app-quiz-question-pane',
  imports: [CommonModule],
  templateUrl: './quiz-question-pane.component.html',
  styleUrls: ['./quiz-question-pane.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizQuestionPaneComponent {
  readonly question = input.required<QuizQuestion>();
  readonly selectedAnswer = input<number | null>(null);
  readonly submitted = input(false);
  readonly optionPercentages = input<number[]>([]);
  readonly peerRightPct = input(0);
  readonly questionTime = input(0);
  readonly canSubmit = input(false);

  readonly answerSelected = output<number>();
  readonly answerSubmitted = output<void>();

  readonly letters = ['A', 'B', 'C', 'D'];
  readonly isCorrect = computed(() => this.selectedAnswer() === this.question().correct);
  readonly statusClass = computed(() => (this.isCorrect() ? 'correct' : 'incorrect'));
  readonly correctLetter = computed(() => this.letters[this.question().correct] ?? 'A');

  select(index: number): void {
    if (this.submitted()) {
      return;
    }
    this.answerSelected.emit(index);
  }

  formatShortTime(seconds: number): string {
    if (seconds <= 0) {
      return '—';
    }
    if (seconds < 60) {
      return `${Math.floor(seconds)} s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return remainingSeconds > 0 ? `${minutes} m ${remainingSeconds} s` : `${minutes} m`;
  }

  isCorrectOption(index: number): boolean {
    return this.submitted() && index === this.question().correct;
  }

  isIncorrectSelection(index: number): boolean {
    return this.submitted() && this.selectedAnswer() === index && index !== this.question().correct;
  }
}
