import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map, switchMap } from 'rxjs';
import { DOCUMENT_FILE_TYPE_LABELS } from '../../program.models';
import { LearnerDocumentsService } from '../services/learner-documents.service';

@Component({
  selector: 'app-documents-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dp-page">
      <h1 class="dp-title">Documents & Files</h1>
      <p class="dp-subtitle">Reference materials, handouts, and study guides for your program.</p>

      @if (docs().length > 0) {
        <div class="dp-grid">
          @for (d of docs(); track d.id) {
            <div class="dp-card">
              <div class="dp-icon">
                {{ d.fileType === 'pdf' ? '📕' : d.fileType === 'docx' ? '📘' : d.fileType === 'pptx' ? '📙' : d.fileType === 'xlsx' ? '📗' : '📄' }}
              </div>
              <div class="dp-info">
                <h3 class="dp-name">{{ d.title }}</h3>
                @if (d.description) { <p class="dp-desc">{{ d.description }}</p> }
                <span class="dp-type">{{ fileTypeLabel(d.fileType) }}</span>
              </div>
              @if (d.downloadable && d.fileUrl) {
                <a [href]="d.fileUrl" target="_blank" rel="noopener" class="dp-download">⬇ Download</a>
              }
              @if (!d.downloadable && d.fileUrl) {
                <a [href]="d.fileUrl" target="_blank" rel="noopener" class="dp-view">👁 View</a>
              }
            </div>
          }
        </div>
      } @else {
        <div class="dp-empty"><span>📄</span><p>No documents available yet.</p></div>
      }
    </div>
  `,
  styles: [`
    .dp-page { max-width: 900px; }
    .dp-title { font-size: 1.4rem; font-weight: 800; color: #111827; margin: 0 0 .3rem; }
    .dp-subtitle { font-size: .82rem; color: #6b7280; margin: 0 0 1.5rem; }

    .dp-grid { display: flex; flex-direction: column; gap: .6rem; }
    .dp-card {
      display: flex; align-items: center; gap: .8rem;
      background: #ffffff; border: 1px solid #e5e7eb;
      border-radius: 10px; padding: .8rem 1rem; transition: border-color .2s;
      box-shadow: 0 1px 2px rgba(0,0,0,.03);
    }
    .dp-card:hover { border-color: #6366f1; }
    .dp-icon { font-size: 1.6rem; flex-shrink: 0; }
    .dp-info { flex: 1; }
    .dp-name { font-size: .88rem; font-weight: 700; color: #111827; margin: 0 0 .1rem; }
    .dp-desc { font-size: .72rem; color: #6b7280; margin: 0 0 .2rem; }
    .dp-type { font-size: .62rem; color: #6366f1; text-transform: uppercase; letter-spacing: .04em; }
    .dp-download, .dp-view {
      font-size: .75rem; font-weight: 600; padding: .35rem .8rem; border-radius: 8px;
      text-decoration: none; white-space: nowrap; transition: all .2s;
    }
    .dp-download { background: #eef2ff; color: #4f46e5; }
    .dp-download:hover { background: #e0e7ff; }
    .dp-view { background: #ecfdf5; color: #059669; }
    .dp-view:hover { background: #d1fae5; }

    .dp-empty { text-align: center; padding: 3rem 0; color: #9ca3af; font-size: .85rem; }
    .dp-empty span { font-size: 2rem; display: block; margin-bottom: .5rem; }
  `],
})
export class DocumentsPage {
  private readonly route = inject(ActivatedRoute);
  private readonly docsService = inject(LearnerDocumentsService);

  private readonly programId$ = this.route.parent!.paramMap.pipe(map((p) => p.get('programId') || ''));

  readonly docs = toSignal(
    this.programId$.pipe(switchMap((id) => this.docsService.getDocuments(id))),
    { initialValue: [] }
  );

  fileTypeLabel(type: string): string {
    return (DOCUMENT_FILE_TYPE_LABELS as Record<string, string>)[type] || type;
  }
}
