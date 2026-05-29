import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Firestore } from '@angular/fire/firestore';
import { provideRouter } from '@angular/router';

import { PolicyService } from '../../../shared/services/policy';
import { PolicyAckReportPage } from './policy-ack-report.page';

describe('PolicyAckReportPage', () => {
  let component: PolicyAckReportPage;
  let fixture: ComponentFixture<PolicyAckReportPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PolicyAckReportPage],
      providers: [
        provideRouter([]),
        { provide: Firestore, useValue: {} },
        {
          provide: PolicyService,
          useValue: { listAcknowledgementsForPolicy: async () => [] },
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(PolicyAckReportPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
