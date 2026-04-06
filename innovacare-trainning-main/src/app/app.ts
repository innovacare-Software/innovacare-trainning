import { Component, inject } from '@angular/core';
import { RouterOutlet} from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { LanguageService } from './core/i18n/language.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HttpClientModule],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  // Eagerly inject LanguageService so it initializes and sets the language on startup
  private _lang = inject(LanguageService);
}
