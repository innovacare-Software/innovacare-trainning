import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';

import { AuthService } from '../../../core/auth';
import { ManagerShell } from './manager-shell';

describe('ManagerShell', () => {
  let component: ManagerShell;
  let fixture: ComponentFixture<ManagerShell>;

  beforeEach(async () => {
    TestBed.overrideComponent(ManagerShell, {
      set: { template: '' },
    });

    await TestBed.configureTestingModule({
      imports: [ManagerShell],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { profile$: of(null), user$: of(null) } },
        {
          provide: TranslocoService,
          useValue: {
            langChanges$: new BehaviorSubject('en'),
            getActiveLang: () => 'en',
          },
        },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManagerShell);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
