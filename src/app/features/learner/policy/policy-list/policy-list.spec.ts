import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '../../../../core/auth';
import { PolicyService } from '../../../../shared/services/policy';
import { PolicyList } from './policy-list';

describe('PolicyList', () => {
  let component: PolicyList;
  let fixture: ComponentFixture<PolicyList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PolicyList],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { profile$: of(null), user$: of(null) } },
        { provide: PolicyService, useValue: { listPolicies: async () => [] } },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(PolicyList);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
