import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { combineLatest, map, switchMap } from 'rxjs';
import { DOCUMENT_FILE_TYPE_LABELS } from '../../program.models';
import { LearnerDocumentsService } from '../services/learner-documents.service';
import { LearnerModulesService } from '../services/learner-modules.service';

@Component({
  selector: 'app-resources-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="rp-page">
      <h1 class="rp-title">Resources Library</h1>
      <p class="rp-subtitle">All program documents, guides, and reference materials in one place.</p>

      @if (docs().length > 0) {
        <div class="rp-list">
          @for (d of docs(); track d.id) {
            <div class="rp-item">
              <span class="rp-file-icon">
                {{ d.fileType === 'pdf' ? '📕' : d.fileType === 'docx' ? '📘' : d.fileType === 'pptx' ? '📙' : d.fileType === 'xlsx' ? '📗' : d.fileType === 'image' ? '🖼️' : '📄' }}
              </span>
              <div class="rp-info">
                <span class="rp-name">{{ d.title }}</span>
                @if (d.description) { <span class="rp-desc">{{ d.description }}</span> }
                <span class="rp-meta">{{ fileTypeLabel(d.fileType) }}</span>
              </div>
              @if (d.fileUrl) {
                <a [href]="d.fileUrl" target="_blank" rel="noopener" class="rp-action">
                  {{ d.downloadable ? '⬇ Download' : '👁 View' }}
                </a>
              }
            </div>
          }
        </div>
      } @else {
        <div class="rp-empty"><span>📁</span><p>No resources available yet.</p></div>
      }
    </div>
  `,
  styles: [`
    .rp-page { max-width: 900px; }
    .rp-title { font-size: 1.4rem; font-weight: 800; color: #111827; margin: 0 0 .3rem; }
    .rp-subtitle { font-size: .82rem; color: #6b7280; margin: 0 0 1.5rem; }

    .rp-list { display: flex; flex-direction: column; gap: .5rem; }
    .rp-item {
      display: flex; align-items: center; gap: .7rem;
      background: #ffffff; border: 1px solid #e5e7eb;
      border-radius: 10px; padding: .7rem .9rem; transition: border-color .2s;
      box-shadow: 0 1px 2px rgba(0,0,0,.03);
    }
    .rp-item:hover { border-color: #6366f1; }
    .rp-file-icon { font-size: 1.5rem; flex-shrink: 0; }
    .rp-info { flex: 1; display: flex; flex-direction: column; gap: .1rem; }
    .rp-name { font-size: .85rem; font-weight: 700; color: #111827; }
    .rp-desc { font-size: .72rem; color: #6b7280; }
    .rp-meta { font-size: .6rem; color: #6366f1; text-transform: uppercase; }
    .rp-action {
      font-size: .73rem; font-weight: 600; padding: .3rem .7rem; border-radius: 7px;
      text-decoration: none; background: #eef2ff; color: #4f46e5; transition: all .2s;
    }
    .rp-action:hover { background: #e0e7ff; }

    .rp-empty { text-align: center; padding: 3rem 0; color: #9ca3af; }
    .rp-empty span { font-size: 2rem; display: block; margin-bottom: .5rem; }
  `],
})
export class ResourcesPage {
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
