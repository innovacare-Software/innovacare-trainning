import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';
import { LanguageService } from '../../core/language.service';
import { MarketingPopupsComponent } from './marketing-popups.component';
import { MarketingLeadsService } from './services/marketing-leads.service';
import { MatSnackBar } from '@angular/material/snack-bar';

class MockLanguageService {
  readonly ready = signal(false);
  readonly isReady = computed(() => this.ready());

  instant(key: string): string {
    return (
      {
        'COMMON.close': 'Close',
        'MARKETING_POPUPS.engagement.tag': 'Community',
        'MARKETING_POPUPS.engagement.title': 'Join 300,000+ students',
        'MARKETING_POPUPS.engagement.body': 'Premium review experience.',
        'MARKETING_POPUPS.engagement.cta': 'Take the Quiz',
        'MARKETING_POPUPS.exit.email_required': 'Enter your email',
        'MARKETING_POPUPS.exit.success': 'Discount unlocked',
      }[key] ?? key
    );
  }
}

describe('MarketingPopupsComponent', () => {
  let languageService: MockLanguageService;

  beforeEach(async () => {
    languageService = new MockLanguageService();

    await TestBed.configureTestingModule({
      imports: [MarketingPopupsComponent],
      providers: [
        provideRouter([]),
        { provide: LanguageService, useValue: languageService },
        { provide: MarketingLeadsService, useValue: { submitLead: jasmine.createSpy('submitLead') } },
        { provide: MatSnackBar, useValue: { open: jasmine.createSpy('open') } },
        {
          provide: TranslocoService,
          useValue: {
            langChanges$: new BehaviorSubject('en'),
            getActiveLang: () => 'en',
          },
        },
      ],
    }).compileComponents();
  });

  it('does not render any popup content before i18n is ready', () => {
    const fixture = TestBed.createComponent(MarketingPopupsComponent);
    const component = fixture.componentInstance;

    component.active.set('engagement');
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.popup-backdrop')).toBeNull();
    expect(root.textContent ?? '').not.toContain('MARKETING_POPUPS.engagement.title');
  });

  it('queues early popup triggers and renders translated content once ready', () => {
    const fixture = TestBed.createComponent(MarketingPopupsComponent);
    const component = fixture.componentInstance;

    component.onMouseOut({ clientY: 0 } as MouseEvent);
    fixture.detectChanges();

    let root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.popup-backdrop')).toBeNull();

    languageService.ready.set(true);
    fixture.detectChanges();

    root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.popup-backdrop')).not.toBeNull();
    expect(root.textContent ?? '').toContain('Join 300,000+ students');
    expect(root.textContent ?? '').not.toContain('MARKETING_POPUPS.engagement.title');
  });
});