import { Pipe, PipeTransform } from '@angular/core';
import { AppLang, LanguageService } from '../../core/language.service';

@Pipe({
  name: 'localizedField',
  standalone: true,
  pure: false,
})
export class LocalizedFieldPipe implements PipeTransform {
  constructor(private readonly langService: LanguageService) {}

  transform(field: string | Partial<Record<AppLang, string>> | null | undefined): string {
    if (!field) {
      return '';
    }

    if (typeof field === 'string') {
      return field;
    }

    const lang = this.langService.currentLang();
    return field[lang] ?? field.en ?? Object.values(field)[0] ?? '';
  }
}