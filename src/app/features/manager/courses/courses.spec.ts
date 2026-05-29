import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '../../../core/auth';
import { CoursesRepo } from '../../../data/courses.repo';
import { Courses } from './courses';

describe('Courses', () => {
  let component: Courses;
  let fixture: ComponentFixture<Courses>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Courses],
      providers: [
        provideRouter([]),
        { provide: CoursesRepo, useValue: { all: () => [] } },
        { provide: AuthService, useValue: { profile$: of(null) } },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(Courses);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
