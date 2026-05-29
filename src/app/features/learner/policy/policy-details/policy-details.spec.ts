import { ComponentFixture, TestBed } from '@angular/core/testing';
import { convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../../core/auth';
import { PolicyService } from '../../../../shared/services/policy';
import { PolicyDetails } from './policy-details';

describe('PolicyDetails', () => {
  let component: PolicyDetails;
  let fixture: ComponentFixture<PolicyDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PolicyDetails],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ id: 'policy-1' }) },
          },
        },
        {
          provide: PolicyService,
          useValue: { getPolicy: async () => null, ackExists: async () => false },
        },
        { provide: AuthService, useValue: { profile$: of(null), user$: of(null) } },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(PolicyDetails);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
