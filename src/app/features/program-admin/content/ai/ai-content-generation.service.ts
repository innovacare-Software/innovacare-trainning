import { Injectable, inject } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { GenerateLessonHtmlInput, GeneratedLessonHtml } from './ai-content.models';

@Injectable({ providedIn: 'root' })
export class AiContentGenerationService {
  private readonly fns = inject(Functions);
  private readonly callable = httpsCallable<GenerateLessonHtmlInput, GeneratedLessonHtml>(
    this.fns,
    'generateLessonHtml',
  );

  /**
   * Call the `generateLessonHtml` Firebase callable function.
   */
  async generateLessonHtml(input: GenerateLessonHtmlInput): Promise<GeneratedLessonHtml> {
    const result = await this.callable(input);
    return result.data;
  }
}
