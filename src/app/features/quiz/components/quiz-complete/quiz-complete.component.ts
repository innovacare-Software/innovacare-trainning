import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-quiz-complete',
  templateUrl: './quiz-complete.component.html',
  styleUrls: ['./quiz-complete.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizCompleteComponent {
  readonly percent = input(0);
  readonly correct = input(0);
  readonly incorrect = input(0);
  readonly total = input(0);
  readonly totalTime = input.required<string>();
  readonly gradeMessage = input.required<string>();
  readonly restart = output<void>();
}
