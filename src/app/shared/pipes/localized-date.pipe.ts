import { DatePipe } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';
import { LanguageService } from '../../core/language.service';

@Pipe({
  name: 'localizedDate',
  standalone: true,
  pure: false,
})
export class LocalizedDatePipe implements PipeTransform {
  constructor(private readonly langService: LanguageService) {}

  transform(value: string | Date | null | undefined, format = 'mediumDate'): string {
    if (!value) {
      return '';
    }

    const locale = this.langService.currentLang() === 'fr' ? 'fr-FR' : 'en-US';
    return new DatePipe(locale).transform(value, format) ?? String(value);
  }
}