import { inject, Injectable } from '@angular/core';
import { Translation, TranslocoLoader } from '@jsverse/transloco';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TranslocoHttpLoader implements TranslocoLoader {
  private readonly http = inject(HttpClient);

  async getTranslation(lang: string): Promise<Translation> {
    const data = await firstValueFrom(
      this.http.get<Translation>(`/assets/i18n/${lang}.json`)
    );
    return data;
  }
}
