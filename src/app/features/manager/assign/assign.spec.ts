import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Firestore } from '@angular/fire/firestore';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '../../../core/auth';
import { Assign } from './assign';

describe('Assign', () => {
  let component: Assign;
  let fixture: ComponentFixture<Assign>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Assign],
      providers: [
        provideRouter([]),
        { provide: Firestore, useValue: {} },
        { provide: AuthService, useValue: { profile$: of(null), currentUid: null } },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(Assign);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
