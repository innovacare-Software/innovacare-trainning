import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-status-pill',
  standalone: true,
  imports: [CommonModule],
  template: `<span class="pill" [class.warn]="tone() === 'warn'" [class.ok]="tone() === 'ok'">{{ label() }}</span>`,
  styles: [
    `
      .pill {
        border-radius: 999px;
        border: 1px solid #c9dbef;
        background: #eaf3ff;
        color: #24517d;
        padding: 0.16rem 0.52rem;
        font-size: 0.74rem;
        font-weight: 800;
        white-space: nowrap;
      }

      .pill.warn {
        border-color: #f1c6ce;
        background: #fff2f5;
        color: #8b3344;
      }

      .pill.ok {
        border-color: #bde5ca;
        background: #ebfbf1;
        color: #1f6b3f;
      }
    `,
  ],
})
export class StatusPillComponent {
  label = input<string>('');
  tone = input<'default' | 'warn' | 'ok'>('default');
}
