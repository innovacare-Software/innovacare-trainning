import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuizQuestion } from '../../models/question.model';
import { QuizQuestionPaneComponent } from '../quiz-question-pane/quiz-question-pane.component';
import { QuizExplanationPaneComponent } from '../quiz-explanation-pane/quiz-explanation-pane.component';

@Component({
  selector: 'app-quiz-question',
  imports: [CommonModule, QuizQuestionPaneComponent, QuizExplanationPaneComponent],
  templateUrl: './quiz-question.component.html',
  styleUrls: ['./quiz-question.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizQuestionComponent {
  readonly question = input.required<QuizQuestion>();
  readonly selectedAnswer = input<number | null>(null);
  readonly submitted = input(false);
  readonly paused = input(false);
  readonly optionPercentages = input<number[]>([]);
  readonly peerRightPct = input(0);
  readonly questionTime = input(0);
  readonly canSubmit = input(false);

  readonly answerSelected = output<number>();
  readonly answerSubmitted = output<void>();
}
