import { Component, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LanguageService } from '../../core/language.service';
import { MarketingFooterComponent } from './marketing-footer.component';
import { MarketingNavbarComponent } from './marketing-navbar.component';
import { MarketingPopupsComponent } from './marketing-popups.component';
import { MarketingShellComponent } from './marketing-shell.component';
import { MarketingSeoService } from './services/marketing-seo.service';

@Component({ selector: 'app-marketing-navbar', template: '<div data-testid="navbar"></div>' })
class StubMarketingNavbarComponent {}

@Component({ selector: 'app-marketing-footer', template: '<div data-testid="footer"></div>' })
class StubMarketingFooterComponent {}

@Component({ selector: 'app-marketing-popups', template: '<div data-testid="popups"></div>' })
class StubMarketingPopupsComponent {}

class MockLanguageService {
  readonly ready = signal(false);
  readonly isReady = computed(() => this.ready());
}

describe('MarketingShellComponent', () => {
  let languageService: MockLanguageService;

  beforeEach(async () => {
    languageService = new MockLanguageService();

    TestBed.overrideComponent(MarketingShellComponent, {
      remove: {
        imports: [MarketingNavbarComponent, MarketingFooterComponent, MarketingPopupsComponent],
      },
      add: {
        imports: [StubMarketingNavbarComponent, StubMarketingFooterComponent, StubMarketingPopupsComponent],
      },
    });

    await TestBed.configureTestingModule({
      imports: [MarketingShellComponent],
      providers: [
        provideRouter([]),
        { provide: LanguageService, useValue: languageService },
        { provide: MarketingSeoService, useValue: { setPageSeo: jasmine.createSpy('setPageSeo') } },
      ],
    }).compileComponents();
  });

  it('does not render marketing chrome before i18n is ready', () => {
    const fixture = TestBed.createComponent(MarketingShellComponent);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="navbar"]')).toBeNull();
    expect(root.querySelector('[data-testid="footer"]')).toBeNull();
    expect(root.querySelector('[data-testid="popups"]')).toBeNull();
  });

  it('renders marketing chrome once i18n is ready', () => {
    const fixture = TestBed.createComponent(MarketingShellComponent);

    languageService.ready.set(true);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="navbar"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="footer"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="popups"]')).not.toBeNull();
  });
});