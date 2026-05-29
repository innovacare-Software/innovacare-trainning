import { TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';

import { UserDirectoryService } from './user-directory';

describe('UserDirectory', () => {
  let service: UserDirectoryService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: Auth,
          useValue: {
            currentUser: null,
            onAuthStateChanged: (callback: (user: null) => void) => {
              callback(null);
              return () => {};
            },
          },
        },
        { provide: Firestore, useValue: {} },
      ],
    });
    service = TestBed.inject(UserDirectoryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
