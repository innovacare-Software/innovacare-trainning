import { TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';

import { NotificationService } from './notification';

describe('Notification', () => {
  let service: NotificationService;

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
            onIdTokenChanged: (callback: (user: null) => void) => {
              callback(null);
              return () => {};
            },
          },
        },
        { provide: Firestore, useValue: {} },
      ],
    });
    service = TestBed.inject(NotificationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
