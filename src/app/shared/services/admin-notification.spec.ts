import { TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { Functions } from '@angular/fire/functions';

import { AuthService } from '../../core/auth';
import { AdminNotificationService } from './admin-notification';

describe('AdminNotification', () => {
  let service: AdminNotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Auth, useValue: {} },
        { provide: Firestore, useValue: {} },
        { provide: Functions, useValue: {} },
        { provide: AuthService, useValue: { profile$: { subscribe: () => ({ unsubscribe() {} }) } } },
      ],
    });
    service = TestBed.inject(AdminNotificationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
