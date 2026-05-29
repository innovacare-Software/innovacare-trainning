import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';

import { EnrollmentService } from '../../../shared/services/enrollement';
import { CourseReturnComponent } from './course-return';

describe('CourseReturn', () => {
  let component: CourseReturnComponent;
  let fixture: ComponentFixture<CourseReturnComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CourseReturnComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: 'course-1' }),
              queryParamMap: convertToParamMap({ t: 'ticket-1', e: 'complete' }),
            },
          },
        },
        { provide: Router, useValue: { navigate: async () => true } },
        { provide: Auth, useValue: {} },
        { provide: EnrollmentService, useValue: {} },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(CourseReturnComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
