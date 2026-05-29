import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { WoundService } from '../services/wound-service';
import { AddWound } from './add-wound';

describe('AddWound', () => {
  let component: AddWound;
  let fixture: ComponentFixture<AddWound>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddWound],
      providers: [provideRouter([]), { provide: WoundService, useValue: {} }],
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddWound);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
