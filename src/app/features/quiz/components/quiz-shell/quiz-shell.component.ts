import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { firstValueFrom, map } from 'rxjs';
import { QuizDataService } from '../../services/quiz-data.service';
import { QuizStateService } from '../../services/quiz-state.service';
import { QuizTimerService } from '../../services/quiz-timer.service';
import { QuizStartComponent } from '../quiz-start/quiz-start.component';
import { QuizHeaderComponent } from '../quiz-header/quiz-header.component';
import { QuizActionBarComponent } from '../quiz-action-bar/quiz-action-bar.component';
import { QuizQuestionComponent } from '../quiz-question/quiz-question.component';
import { QuizBottomBarComponent } from '../quiz-bottom-bar/quiz-bottom-bar.component';
import { QuizCompleteComponent } from '../quiz-complete/quiz-complete.component';

@Component({
  selector: 'app-quiz-shell',
  imports: [
    CommonModule,
    QuizStartComponent,
    QuizHeaderComponent,
    QuizActionBarComponent,
    QuizQuestionComponent,
    QuizBottomBarComponent,
    QuizCompleteComponent,
  ],
  templateUrl: './quiz-shell.component.html',
  styleUrls: ['./quiz-shell.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown)': 'handleKeyboard($event)',
  },
})
export class QuizShellComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly quizData = inject(QuizDataService);
  readonly quizState = inject(QuizStateService);
  readonly quizTimer = inject(QuizTimerService);

  readonly loading = signal(true);
  readonly error = signal('');

  private readonly moduleId = toSignal(
    this.route.paramMap.pipe(map((params) => String(params.get('moduleId') || 'shock').trim().toLowerCase() || 'shock')),
    { initialValue: 'shock' }
  );

  readonly state = this.quizState.state;
  readonly currentQuestion = this.quizState.currentQuestion;
  readonly currentSubmitted = this.quizState.currentSubmitted;
  readonly currentAnswer = this.quizState.currentAnswer;
  readonly optionPercentages = computed(() => {
    const question = this.currentQuestion();
    return question ? this.quizState.getOptionPercentages(question) : [];
  });
  readonly peerRightPct = computed(() => {
    const question = this.currentQuestion();
    return question ? this.quizState.pseudoPctRight(question.id, question.difficulty) : 0;
  });
  readonly qid = computed(() => this.quizState.makeQid(this.currentQuestion()));
  readonly timerText = computed(() => this.formatClock(this.quizTimer.totalElapsed()));
  readonly counterText = computed(() => `${this.state().currentIdx + 1} of ${this.state().questions.length}`);
  readonly questionTime = computed(() => this.quizState.getCurrentQuestionTime());
  readonly moduleCopy = computed(() => this.quizData.getModuleCopy(this.moduleId(), this.state().questions.length));
  readonly nextLabel = computed(() => {
    const isLastQuestion = this.state().currentIdx === this.state().questions.length - 1;
    return isLastQuestion && this.currentSubmitted() ? 'Finish ✓' : 'Next →';
  });
  readonly totalTime = computed(() => this.formatShortTime(this.state().totalElapsed));

  constructor() {
    effect(() => {
      void this.loadModule(this.moduleId());
    });
  }

  startQuiz(): void {
    this.quizState.startQuiz();
  }

  selectAnswer(index: number): void {
    this.quizState.selectAnswer(index);
  }

  submitAnswer(): void {
    this.quizState.submitAnswer();
  }

  prev(): void {
    this.quizState.prev();
  }

  next(): void {
    this.quizState.next();
  }

  toggleMark(): void {
    this.quizState.toggleMark();
  }

  togglePause(): void {
    if (this.state().paused) {
      this.quizState.resume();
      return;
    }
    this.quizState.pause();
  }

  endQuiz(): void {
    const confirmed = window.confirm('End the quiz now? Your unanswered questions will be marked incorrect.');
    if (confirmed) {
      this.quizState.endQuiz();
    }
  }

  restart(): void {
    this.quizState.restart();
  }

  handleKeyboard(event: KeyboardEvent): void {
    if (this.state().status !== 'in-progress' || this.state().paused) {
      return;
    }

    if (event.key === 'ArrowRight' && this.quizState.canGoNext()) {
      event.preventDefault();
      this.next();
    }

    if (event.key === 'ArrowLeft' && this.quizState.canGoPrev()) {
      event.preventDefault();
      this.prev();
    }

    if (event.key === 'Enter' && this.quizState.canSubmit()) {
      event.preventDefault();
      this.submitAnswer();
    }
  }

  private async loadModule(moduleId: string): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const questions = await firstValueFrom(this.quizData.loadQuestions(moduleId));
      this.quizState.initialize(moduleId, questions);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Unable to load the quiz module.');
    } finally {
      this.loading.set(false);
    }
  }

  private formatClock(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
      .toString()
      .padStart(2, '0');
    const minutes = Math.floor((seconds % 3600) / 60)
      .toString()
      .padStart(2, '0');
    const remainingSeconds = Math.floor(seconds % 60)
      .toString()
      .padStart(2, '0');
    return `${hours}:${minutes}:${remainingSeconds}`;
  }

  private formatShortTime(seconds: number): string {
    if (seconds < 60) {
      return `${Math.floor(seconds)} s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return remainingSeconds > 0 ? `${minutes} m ${remainingSeconds} s` : `${minutes} m`;
  }
}
