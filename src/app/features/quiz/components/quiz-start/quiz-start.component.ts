import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuizModuleCopy } from '../../services/quiz-data.service';

@Component({
  selector: 'app-quiz-start',
  imports: [CommonModule],
  templateUrl: './quiz-start.component.html',
  styleUrls: ['./quiz-start.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizStartComponent {
  readonly copy = input.required<QuizModuleCopy>();
  readonly start = output<void>();
}
