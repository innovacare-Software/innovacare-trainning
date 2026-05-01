import { TestBed } from '@angular/core/testing';
import { QuizQuestionComponent } from './quiz-question.component';
import { QuizQuestion } from '../../models/question.model';

const QUESTION: QuizQuestion = {
  id: 1,
  qnum: 'Q1',
  stem: 'Question stem',
  options: ['Option A', 'Option B', 'Option C', 'Option D'],
  correct: 1,
  difficulty: 'Medium',
  subject: 'Adult Health',
  lesson: 'Shock',
  needArea: 'Physiological Adaptation',
  needTopic: 'Hemodynamics',
  qType: 'MCQ',
  rationale: '<p>Rationale</p>',
  distractors: '<p>Distractors</p>',
  additional: '<p>Additional</p>',
};

describe('QuizQuestionComponent', () => {
  it('shows correct and incorrect states after submit and disables radios', async () => {
    await TestBed.configureTestingModule({
      imports: [QuizQuestionComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(QuizQuestionComponent);
    fixture.componentRef.setInput('question', QUESTION);
    fixture.componentRef.setInput('selectedAnswer', 0);
    fixture.componentRef.setInput('submitted', true);
    fixture.componentRef.setInput('paused', false);
    fixture.componentRef.setInput('optionPercentages', [21, 58, 11, 10]);
    fixture.componentRef.setInput('peerRightPct', 58);
    fixture.componentRef.setInput('questionTime', 44);
    fixture.componentRef.setInput('canSubmit', false);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.opt.correct')).not.toBeNull();
    expect(host.querySelector('.opt.incorrect')).not.toBeNull();

    const radios = Array.from(host.querySelectorAll('input[type="radio"]')) as HTMLInputElement[];
    expect(radios.every((radio) => radio.disabled)).toBeTrue();
  });
});
