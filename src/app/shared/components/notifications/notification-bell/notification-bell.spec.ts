import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { DEFAULT_NOTIFICATION_PREFERENCES, NotificationService } from '../../../services/notification';
import { NotificationBell } from './notification-bell';

describe('NotificationBell', () => {
  let component: NotificationBell;
  let fixture: ComponentFixture<NotificationBell>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationBell],
      providers: [
        {
          provide: NotificationService,
          useValue: {
            unread$: of([]),
            preferences$: () => of(DEFAULT_NOTIFICATION_PREFERENCES),
            notifications$: () => of([]),
            visibleNotifications$: () => of([]),
            unreadCount$: () => of(0),
            markAsRead: async () => {},
            markAllVisibleAsRead: async () => {},
            updateCategoryPreference: async () => {},
          },
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotificationBell);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
