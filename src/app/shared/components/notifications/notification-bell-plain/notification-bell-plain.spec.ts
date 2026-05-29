import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { DEFAULT_NOTIFICATION_PREFERENCES, NotificationService } from '../../../services/notification';
import { NotificationBellPlainComponent } from './notification-bell-plain';

describe('NotificationBellPlain', () => {
  let component: NotificationBellPlainComponent;
  let fixture: ComponentFixture<NotificationBellPlainComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationBellPlainComponent],
      providers: [
        {
          provide: NotificationService,
          useValue: {
            unread$: of([]),
            preferences$: () => of(DEFAULT_NOTIFICATION_PREFERENCES),
            updateCategoryPreference: async () => {},
            markAsRead: async () => {},
          },
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(NotificationBellPlainComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
