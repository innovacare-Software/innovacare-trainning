import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-listening-transcript-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="transcript-panel">
      <button type="button" class="transcript-toggle" (click)="toggle()">
        <span>📄 Transcript</span>
        <span class="toggle-arrow">{{ open() ? '▲' : '▼' }}</span>
      </button>
      @if (open()) {
        <div class="transcript-body">
          <p class="transcript-label">Full audio transcript</p>
          <div class="transcript-text" [innerHTML]="formattedTranscript()"></div>
        </div>
      }
    </div>
  `,
  styles: [`
    .transcript-panel { border: 1px solid #d9e5f2; border-radius: 0.85rem; overflow: hidden; }
    .transcript-toggle { width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 0.85rem 1.1rem; background: #f4f9ff; border: none; cursor: pointer; font-weight: 700; font-size: 0.93rem; color: #1a74c8; }
    .transcript-toggle:hover { background: #e8f4ff; }
    .toggle-arrow { font-size: 0.75rem; color: #5f7f9f; }
    .transcript-body { padding: 1rem 1.2rem; background: #fff; }
    .transcript-label { margin: 0 0 0.6rem; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #5f7f9f; }
    .transcript-text { color: #1e3a5a; font-size: 0.92rem; line-height: 1.8; white-space: pre-wrap; }
  `],
})
export class ListeningTranscriptPanelComponent {
  @Input({ required: true }) transcript!: string;
  readonly open = signal(false);

  toggle(): void { this.open.update((v) => !v); }

  formattedTranscript(): string {
    return this.transcript.replace(/\n/g, '<br>');
  }
}
