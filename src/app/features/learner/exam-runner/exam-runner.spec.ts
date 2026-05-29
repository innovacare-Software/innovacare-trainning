import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { ActivatedRoute, Router } from '@angular/router';

import { EnrollmentService } from '../../../shared/services/enrollement';
import { RewardsService } from '../../../shared/services/rewards';
import { ExamRunnerComponent } from './exam-runner';

describe('ExamRunner', () => {
  let component: ExamRunnerComponent;
  let fixture: ComponentFixture<ExamRunnerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExamRunnerComponent],
      providers: [
        { provide: ActivatedRoute, useValue: {} },
        { provide: Router, useValue: {} },
        { provide: Firestore, useValue: {} },
        { provide: Auth, useValue: {} },
        { provide: EnrollmentService, useValue: {} },
        { provide: RewardsService, useValue: {} },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExamRunnerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
