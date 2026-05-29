import { TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';

import { RewardsService } from './rewards';

describe('Rewards', () => {
  let service: RewardsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Firestore, useValue: {} },
        { provide: Auth, useValue: {} },
      ],
    });
    service = TestBed.inject(RewardsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
