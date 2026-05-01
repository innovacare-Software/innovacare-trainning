import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { QuizTimerService } from './quiz-timer.service';

describe('QuizTimerService', () => {
  let service: QuizTimerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [QuizTimerService],
    });

    service = TestBed.inject(QuizTimerService);
  });

  afterEach(() => {
    service.reset();
  });

  it('starts and increments both timers', fakeAsync(() => {
    service.start();
    service.beginQuestion();

    tick(2100);

    expect(service.totalElapsed()).toBeGreaterThanOrEqual(2);
    expect(service.currentQuestionElapsed()).toBeGreaterThanOrEqual(2);
  }));

  it('pauses and resumes without losing elapsed time', fakeAsync(() => {
    service.start();
    service.beginQuestion();
    tick(1200);

    service.pause();
    const pausedTotal = service.totalElapsed();
    const pausedQuestion = service.currentQuestionElapsed();

    tick(2000);
    expect(service.totalElapsed()).toBe(pausedTotal);
    expect(service.currentQuestionElapsed()).toBe(pausedQuestion);

    service.resume();
    tick(1100);

    expect(service.totalElapsed()).toBeGreaterThan(pausedTotal);
    expect(service.currentQuestionElapsed()).toBeGreaterThan(pausedQuestion);
  }));
});
