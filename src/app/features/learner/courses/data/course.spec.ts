import { TestBed } from '@angular/core/testing';
import { Firestore } from 'firebase/firestore';

import { Course } from './course';

describe('Course', () => {
  let service: Course;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: Firestore, useValue: {} }],
    });
    service = TestBed.inject(Course);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
