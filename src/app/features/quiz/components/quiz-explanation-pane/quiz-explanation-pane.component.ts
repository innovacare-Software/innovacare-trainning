import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuizQuestion } from '../../models/question.model';

@Component({
  selector: 'app-quiz-explanation-pane',
  imports: [CommonModule],
  templateUrl: './quiz-explanation-pane.component.html',
  styleUrls: ['./quiz-explanation-pane.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizExplanationPaneComponent {
  readonly question = input.required<QuizQuestion>();
}
