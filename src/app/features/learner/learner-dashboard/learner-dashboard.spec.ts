import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { provideRouter } from '@angular/router';

import { LearnerDashboardComponent } from './learner-dashboard';

describe('LearnerDashboard', () => {
  let component: LearnerDashboardComponent;
  let fixture: ComponentFixture<LearnerDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LearnerDashboardComponent],
      providers: [
        provideRouter([]),
        {
          provide: Auth,
          useValue: {
            currentUser: null,
            onAuthStateChanged: (callback: (user: null) => void) => {
              callback(null);
              return () => {};
            },
            onIdTokenChanged: (callback: (user: null) => void) => {
              callback(null);
              return () => {};
            },
          },
        },
        { provide: Firestore, useValue: {} },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(LearnerDashboardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
