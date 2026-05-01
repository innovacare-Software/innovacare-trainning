import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  effect,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GlobalSearchService, type SearchResultType } from './global-search.service';

@Component({
  selector: 'app-global-search-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (search.isOpen()) {
      <div class="gs-backdrop" (click)="close()"></div>

      <section class="gs-panel" role="dialog" aria-modal="true" aria-label="Global search">
        <header class="gs-header">
          <div>
            <p class="gs-eyebrow">Unified Search</p>
            <h2>Find courses, programs, live content, and editorial assets</h2>
          </div>
          <div class="gs-header-actions">
            <button type="button" class="gs-ghost" (click)="refresh()">Refresh index</button>
            <button type="button" class="gs-close" (click)="close()" aria-label="Close search">x</button>
          </div>
        </header>

        <div class="gs-searchbar">
          <input
            #queryInput
            type="search"
            class="gs-input"
            placeholder="Search by title, topic, organization, level..."
            [ngModel]="search.query()"
            (ngModelChange)="search.setQuery($event)"
          />
          <span class="gs-shortcut">Ctrl/Cmd + K | Enter | Up/Down</span>
        </div>

        <div class="gs-filters">
          <label>
            <span>Type</span>
            <select [ngModel]="search.filters().type" (ngModelChange)="onTypeChange($event)">
              <option value="all">All</option>
              <option value="course">Course</option>
              <option value="program">Program</option>
              <option value="document">Document</option>
              <option value="live_session">Live session</option>
              <option value="resource">Resource</option>
              <option value="blog">Blog</option>
            </select>
          </label>

          <label>
            <span>Status</span>
            <select [ngModel]="search.filters().status" (ngModelChange)="search.updateFilters({ status: $event })">
              <option value="all">All</option>
              @for (status of search.statusOptions(); track status) {
                <option [value]="status">{{ status }}</option>
              }
            </select>
          </label>

          <label>
            <span>Organization</span>
            <select [ngModel]="search.filters().organization" (ngModelChange)="search.updateFilters({ organization: $event })">
              <option value="all">All</option>
              @for (organization of search.organizationOptions(); track organization) {
                <option [value]="organization">{{ organization }}</option>
              }
            </select>
          </label>

          <label>
            <span>Level</span>
            <select [ngModel]="search.filters().level" (ngModelChange)="search.updateFilters({ level: $event })">
              <option value="all">All</option>
              @for (level of search.levelOptions(); track level) {
                <option [value]="level">{{ level }}</option>
              }
            </select>
          </label>
        </div>

        <div class="gs-summary">
          <p>
            <strong>{{ search.resultCount() }}</strong>
            results
          </p>
          <button type="button" class="gs-reset" (click)="resetFilters()">Reset filters</button>
        </div>

        @if (search.isPristine() && (search.recentItems().length || search.frequentItems().length)) {
          <div class="gs-suggestions">
            @if (search.recentItems().length) {
              <section class="gs-suggestion-block">
                <div class="gs-suggestion-head">
                  <strong>Recent</strong>
                  <small>Fast resume across the platform</small>
                </div>
                <div class="gs-chip-grid">
                  @for (item of search.recentItems(); track item.type + ':' + item.programId + ':' + item.id) {
                    <button type="button" class="gs-chip" (click)="openResult(item)">
                      <span>{{ search.typeLabel(item.type) }}</span>
                      <strong>{{ item.title }}</strong>
                    </button>
                  }
                </div>
              </section>
            }

            @if (search.frequentItems().length) {
              <section class="gs-suggestion-block">
                <div class="gs-suggestion-head">
                  <strong>Frequent</strong>
                  <small>What you open the most</small>
                </div>
                <div class="gs-chip-grid">
                  @for (item of search.frequentItems(); track item.type + ':' + item.programId + ':' + item.id) {
                    <button type="button" class="gs-chip" (click)="openResult(item)">
                      <span>{{ search.typeLabel(item.type) }}</span>
                      <strong>{{ item.title }}</strong>
                    </button>
                  }
                </div>
              </section>
            }
          </div>
        }

        @if (search.loading()) {
          <div class="gs-state">Loading search index...</div>
        } @else if (search.error()) {
          <div class="gs-state gs-state--error">{{ search.error() }}</div>
        } @else if (!search.filteredResults().length && !search.isPristine()) {
          <div class="gs-state">No result matches the current query and filters.</div>
        } @else if (search.filteredResults().length) {
          <div class="gs-results">
            @for (item of search.filteredResults(); track item.type + ':' + item.programId + ':' + item.id; let idx = $index) {
              <button
                type="button"
                class="gs-result"
                [class.gs-result--active]="idx === search.highlightedIndex()"
                (mouseenter)="highlight(idx)"
                (click)="openResult(item)">
                <div class="gs-result__type">{{ search.typeLabel(item.type) }}</div>
                <div class="gs-result__body">
                  <strong>{{ item.title }}</strong>
                  <p>{{ item.summary || 'No summary available.' }}</p>
                  <small>{{ search.resultMeta(item) }}</small>
                </div>
              </button>
            }
          </div>
        }
      </section>
    }
  `,
  styles: [
    `
      .gs-backdrop {
        position: fixed;
        inset: 0;
        z-index: 1080;
        background: rgba(7, 16, 29, 0.44);
        backdrop-filter: blur(6px);
      }

      .gs-panel {
        position: fixed;
        top: 7vh;
        left: 50%;
        z-index: 1090;
        width: min(920px, calc(100vw - 32px));
        max-height: 84vh;
        transform: translateX(-50%);
        overflow: hidden;
        border: 1px solid rgba(15, 62, 104, 0.12);
        border-radius: 28px;
        background:
          radial-gradient(circle at top right, rgba(104, 216, 255, 0.16), transparent 32%),
          linear-gradient(180deg, rgba(255, 255, 255, 0.97), rgba(243, 248, 252, 0.98));
        box-shadow: 0 34px 90px rgba(7, 23, 44, 0.22);
      }

      .gs-header {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        padding: 1.35rem 1.4rem 1rem;
        border-bottom: 1px solid rgba(15, 62, 104, 0.08);
      }

      .gs-header h2 {
        margin: 0.22rem 0 0;
        color: #10233f;
        font-size: clamp(1.15rem, 2vw, 1.45rem);
      }

      .gs-eyebrow {
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        font-size: 0.72rem;
        font-weight: 800;
        color: #2872a5;
      }

      .gs-header-actions {
        display: flex;
        gap: 0.65rem;
        align-items: flex-start;
      }

      .gs-ghost,
      .gs-close,
      .gs-reset,
      .gs-chip {
        border: 0;
        border-radius: 999px;
        cursor: pointer;
      }

      .gs-ghost,
      .gs-reset {
        padding: 0.72rem 0.95rem;
        color: #143a5d;
        background: rgba(14, 76, 120, 0.08);
        font-weight: 700;
      }

      .gs-close {
        width: 40px;
        height: 40px;
        font-size: 1.5rem;
        color: #10233f;
        background: rgba(255, 255, 255, 0.78);
      }

      .gs-searchbar {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 0.75rem;
        align-items: center;
        padding: 1rem 1.4rem 0;
      }

      .gs-input,
      .gs-filters select {
        width: 100%;
        border: 1px solid rgba(15, 62, 104, 0.12);
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.92);
        color: #10233f;
      }

      .gs-input {
        padding: 0.95rem 1rem;
        font-size: 1rem;
      }

      .gs-shortcut {
        display: inline-flex;
        align-items: center;
        min-height: 48px;
        padding: 0 0.95rem;
        border-radius: 14px;
        color: #496682;
        background: rgba(15, 62, 104, 0.06);
        font-weight: 700;
        white-space: nowrap;
      }

      .gs-filters {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 0.9rem;
        padding: 1rem 1.4rem 0;
      }

      .gs-filters label {
        display: grid;
        gap: 0.38rem;
        color: #496682;
        font-size: 0.83rem;
        font-weight: 700;
      }

      .gs-filters select {
        padding: 0.85rem 0.9rem;
      }

      .gs-summary {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1.4rem 0.95rem;
        color: #496682;
      }

      .gs-summary p {
        margin: 0;
      }

      .gs-suggestions {
        display: grid;
        gap: 0.95rem;
        padding: 0 1.4rem 1rem;
      }

      .gs-suggestion-block {
        padding: 1rem;
        border: 1px solid rgba(15, 62, 104, 0.08);
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.86);
      }

      .gs-suggestion-head {
        display: flex;
        justify-content: space-between;
        gap: 0.8rem;
        margin-bottom: 0.75rem;
        color: #496682;
      }

      .gs-chip-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 0.65rem;
      }

      .gs-chip {
        display: inline-flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 0.18rem;
        padding: 0.8rem 0.95rem;
        color: #10233f;
        background: rgba(14, 76, 120, 0.08);
      }

      .gs-chip span {
        font-size: 0.72rem;
        font-weight: 800;
        color: #2872a5;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .gs-chip strong {
        font-size: 0.9rem;
      }

      .gs-results {
        display: grid;
        gap: 0.8rem;
        max-height: calc(84vh - 290px);
        overflow: auto;
        padding: 0 1.4rem 1.4rem;
      }

      .gs-result {
        display: grid;
        grid-template-columns: 110px minmax(0, 1fr);
        gap: 0.95rem;
        align-items: flex-start;
        width: 100%;
        padding: 1rem;
        border: 1px solid rgba(15, 62, 104, 0.08);
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.9);
        color: #10233f;
        text-align: left;
        cursor: pointer;
      }

      .gs-result:hover,
      .gs-result--active {
        transform: translateY(-1px);
        box-shadow: 0 16px 34px rgba(13, 34, 58, 0.1);
        border-color: rgba(21, 113, 170, 0.28);
      }

      .gs-result__type {
        display: inline-flex;
        justify-content: center;
        align-items: center;
        min-height: 34px;
        padding: 0.35rem 0.7rem;
        border-radius: 999px;
        background: linear-gradient(135deg, #caefff, #8edcf8);
        color: #082642;
        font-size: 0.78rem;
        font-weight: 800;
      }

      .gs-result__body strong {
        display: block;
        margin-bottom: 0.3rem;
        font-size: 1rem;
      }

      .gs-result__body p {
        margin: 0;
        color: #496682;
        line-height: 1.45;
      }

      .gs-result__body small {
        display: block;
        margin-top: 0.55rem;
        color: #2872a5;
        font-weight: 700;
      }

      .gs-state {
        padding: 1.6rem 1.4rem 1.8rem;
        color: #496682;
      }

      .gs-state--error {
        color: #8f2433;
      }

      @media (max-width: 880px) {
        .gs-panel {
          top: 3vh;
          max-height: 92vh;
          border-radius: 24px;
        }

        .gs-filters {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .gs-results {
          max-height: calc(92vh - 330px);
        }
      }

      @media (max-width: 640px) {
        .gs-header,
        .gs-searchbar,
        .gs-summary {
          grid-template-columns: 1fr;
          flex-direction: column;
          align-items: stretch;
        }

        .gs-searchbar,
        .gs-filters,
        .gs-summary,
        .gs-results,
        .gs-suggestions {
          padding-left: 1rem;
          padding-right: 1rem;
        }

        .gs-filters {
          grid-template-columns: 1fr;
        }

        .gs-result {
          grid-template-columns: 1fr;
        }

        .gs-shortcut {
          justify-content: center;
        }
      }
    `,
  ],
})
export class GlobalSearchPanelComponent {
  protected readonly search = inject(GlobalSearchService);

  @ViewChild('queryInput') private queryInput?: ElementRef<HTMLInputElement>;

  private readonly focusEffect = effect(() => {
    if (this.search.isOpen()) {
      requestAnimationFrame(() => this.queryInput?.nativeElement.focus());
    }
  });

  @HostListener('window:keydown', ['$event'])
  handleKeyboardShortcut(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.search.toggle();
      return;
    }

    if (!this.search.isOpen()) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.search.moveHighlight(1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.search.moveHighlight(-1);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      this.search.openHighlighted();
    }
  }

  close(): void {
    this.search.close();
  }

  resetFilters(): void {
    this.search.resetFilters();
  }

  refresh(): void {
    void this.search.refresh();
  }

  highlight(index: number): void {
    this.search.highlightedIndex.set(index);
  }

  onTypeChange(value: SearchResultType | 'all'): void {
    this.search.updateFilters({ type: value });
  }

  openResult(item: Parameters<GlobalSearchService['navigate']>[0]): void {
    void this.search.navigate(item);
  }
}