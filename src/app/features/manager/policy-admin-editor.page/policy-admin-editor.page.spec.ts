import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '../../../core/auth';
import { PolicyService } from '../../../shared/services/policy';
import { PolicyAdminEditorPage } from './policy-admin-editor.page';

describe('PolicyAdminEditorPage', () => {
  let component: PolicyAdminEditorPage;
  let fixture: ComponentFixture<PolicyAdminEditorPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PolicyAdminEditorPage],
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
          useValue: { getPolicy: async () => null, createPolicy: async () => '', updatePolicy: async () => {} },
        },
        { provide: AuthService, useValue: { profile$: of(null), user$: of(null) } },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(PolicyAdminEditorPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
