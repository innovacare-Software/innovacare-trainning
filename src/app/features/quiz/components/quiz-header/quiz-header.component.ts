import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-quiz-header',
  templateUrl: './quiz-header.component.html',
  styleUrls: ['./quiz-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizHeaderComponent {
  readonly qid = input.required<string>();
  readonly timerText = input.required<string>();
  readonly counterText = input.required<string>();
}
