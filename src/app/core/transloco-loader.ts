import { inject, Injectable } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

const I18N_CACHE_BUSTER = '2026-04-23-marketing-popups-structure-1';

@Injectable({ providedIn: 'root' })
export class TranslocoHttpLoader implements TranslocoLoader {
  private readonly http = inject(HttpClient);

  async getTranslation(lang: string): Promise<Translation> {
    const data = await firstValueFrom(
      this.http.get<Translation>(`/assets/i18n/${lang}.json?v=${I18N_CACHE_BUSTER}`)
    );
    return data;
  }
}
