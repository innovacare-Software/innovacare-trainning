import { TestBed } from '@angular/core/testing';
import { Firestore } from '@angular/fire/firestore';

import { PolicyService } from './policy';

describe('Policy', () => {
  let service: PolicyService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: Firestore, useValue: {} }],
    });
    service = TestBed.inject(PolicyService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
