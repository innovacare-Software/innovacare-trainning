import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ChatbotComponent } from './shared/components/chatbot/chatbot.component';
import { GlobalSearchPanelComponent } from './shared/global-search/global-search-panel.component';
import { OnboardingPanelComponent } from './shared/onboarding/onboarding-panel.component';
import { LanguageService } from './core/language.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ChatbotComponent, GlobalSearchPanelComponent, OnboardingPanelComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly languageService = inject(LanguageService);

  readonly isReady = this.languageService.isReady;
}
