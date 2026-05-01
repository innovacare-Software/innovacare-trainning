import { TestBed } from '@angular/core/testing';
import { QuizStateService } from './quiz-state.service';
import { QuizTimerService } from './quiz-timer.service';
import { QuizQuestion } from '../models/question.model';

const QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    qnum: 'Q1',
    stem: 'Question 1',
    options: ['A1', 'B1', 'C1', 'D1'],
    correct: 0,
    difficulty: 'Easy',
    subject: 'Adult Health',
    lesson: 'Shock',
    needArea: 'Physiological Adaptation',
    needTopic: 'Hemodynamics',
    qType: 'MCQ',
    rationale: '<p>Rationale 1</p>',
    distractors: '<p>Distractors 1</p>',
    additional: '<p>Additional 1</p>',
  },
  {
    id: 2,
    qnum: 'Q2',
    stem: 'Question 2',
    options: ['A2', 'B2', 'C2', 'D2'],
    correct: 2,
    difficulty: 'Medium',
    subject: 'Adult Health',
    lesson: 'Shock',
    needArea: 'Physiological Adaptation',
    needTopic: 'Hemodynamics',
    qType: 'MCQ',
    rationale: '<p>Rationale 2</p>',
    distractors: '<p>Distractors 2</p>',
    additional: '<p>Additional 2</p>',
  },
];

describe('QuizStateService', () => {
  let service: QuizStateService;
  let timer: QuizTimerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [QuizStateService, QuizTimerService],
    });

    service = TestBed.inject(QuizStateService);
    timer = TestBed.inject(QuizTimerService);
    service.initialize('shock', QUESTIONS);
    service.startQuiz();
  });

  afterEach(() => {
    timer.reset();
  });

  it('stores the selected answer for the current question', () => {
    service.selectAnswer(1);

    expect(service.state().answers[0]).toBe(1);
    expect(service.canSubmit()).toBeTrue();
  });

  it('marks the current question as submitted', () => {
    service.selectAnswer(0);
    service.submitAnswer();

    expect(service.state().submitted[0]).toBeTrue();
    expect(service.currentSubmitted()).toBeTrue();
  });

  it('navigates between questions and preserves the current index', () => {
    service.next();
    expect(service.currentIdx()).toBe(1);

    service.prev();
    expect(service.currentIdx()).toBe(0);
  });

  it('computes the score from correct answers', () => {
    service.selectAnswer(0);
    service.submitAnswer();
    service.next();
    service.selectAnswer(2);
    service.submitAnswer();
    service.endQuiz();

    expect(service.score()).toBe(2);
    expect(service.scorePercent()).toBe(100);
  });
});
