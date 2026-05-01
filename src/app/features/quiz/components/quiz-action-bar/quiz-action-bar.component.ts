import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-quiz-action-bar',
  templateUrl: './quiz-action-bar.component.html',
  styleUrls: ['./quiz-action-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizActionBarComponent {
  readonly marked = input(false);
  readonly disabled = input(false);
  readonly toggleMark = output<void>();
}
