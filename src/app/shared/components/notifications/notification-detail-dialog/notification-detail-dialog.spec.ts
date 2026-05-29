import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { NotificationService } from '../../../services/notification';
import { NotificationDetailDialogComponent } from './notification-detail-dialog';

describe('NotificationDetailDialog', () => {
  let component: NotificationDetailDialogComponent;
  let fixture: ComponentFixture<NotificationDetailDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationDetailDialogComponent],
      providers: [
        { provide: NotificationService, useValue: { markAsRead: async () => {} } },
        { provide: Router, useValue: { navigateByUrl: async () => true } },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotificationDetailDialogComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
