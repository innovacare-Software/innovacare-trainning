import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AdminNotificationService } from '../../../shared/services/admin-notification';
import { AdminNotificationsPage } from './admin-notifications-page';

describe('AdminNotificationsPage', () => {
  let component: AdminNotificationsPage;
  let fixture: ComponentFixture<AdminNotificationsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminNotificationsPage],
      providers: [
        {
          provide: AdminNotificationService,
          useValue: { recentNotifications$: () => of([]) },
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminNotificationsPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
