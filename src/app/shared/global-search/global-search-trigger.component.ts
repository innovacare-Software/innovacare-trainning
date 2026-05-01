import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { GlobalSearchService } from './global-search.service';

@Component({
  selector: 'app-global-search-trigger',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button type="button" class="search-trigger" (click)="open()" aria-label="Open global search">
      <span class="search-trigger__icon">S</span>
      <span class="search-trigger__copy">
        <strong>Search</strong>
        <small>Ctrl/Cmd + K</small>
      </span>
    </button>
  `,
  styles: [
    `
      .search-trigger {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        min-height: 40px;
        padding: 6px 12px 6px 8px;
        border: 1px solid rgba(15, 62, 104, 0.12);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.88);
        color: #10233f;
        box-shadow: 0 10px 24px rgba(8, 23, 44, 0.08);
        cursor: pointer;
      }

      .search-trigger__icon {
        display: grid;
        place-items: center;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: linear-gradient(135deg, #d6f3ff, #8fdff8);
        font-size: 15px;
        font-weight: 800;
      }

      .search-trigger__copy {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        line-height: 1.1;
      }

      .search-trigger__copy strong {
        font-size: 12px;
      }

      .search-trigger__copy small {
        font-size: 11px;
        color: #52657f;
      }
    `,
  ],
})
export class GlobalSearchTriggerComponent {
  private readonly search = inject(GlobalSearchService);

  open(): void {
    this.search.open();
  }
}