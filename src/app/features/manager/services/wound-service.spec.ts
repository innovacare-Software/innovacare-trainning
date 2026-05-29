import { TestBed } from '@angular/core/testing';
import { Firestore } from '@angular/fire/firestore';
import { Storage } from '@angular/fire/storage';

import { WoundService } from './wound-service';

describe('WoundService', () => {
  let service: WoundService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Firestore, useValue: {} },
        { provide: Storage, useValue: {} },
      ],
    });
    service = TestBed.inject(WoundService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
