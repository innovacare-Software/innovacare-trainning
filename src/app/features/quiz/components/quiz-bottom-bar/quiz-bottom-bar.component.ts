import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-quiz-bottom-bar',
  templateUrl: './quiz-bottom-bar.component.html',
  styleUrls: ['./quiz-bottom-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizBottomBarComponent {
  readonly canPrev = input(false);
  readonly canNext = input(false);
  readonly paused = input(false);
  readonly nextLabel = input('Next →');

  readonly prev = output<void>();
  readonly next = output<void>();
  readonly end = output<void>();
  readonly pauseToggle = output<void>();
}
