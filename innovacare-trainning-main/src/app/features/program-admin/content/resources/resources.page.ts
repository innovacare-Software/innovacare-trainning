import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { ProgramDocumentsAdminService } from '../../services/program-documents-admin.service';
import { DOCUMENT_FILE_TYPE_LABELS } from '../../shared/content-builder.models';

@Component({
  selector: 'app-resources-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="resources-page">
      <header class="page-header">
        <a [routerLink]="['/program-admin/programs', programId(), 'content']" class="back-link">← Content Dashboard</a>
        <h1>Resources</h1>
        <p class="subtitle">All downloadable documents and materials for this program.</p>
      </header>

      <div class="resources-grid" *ngIf="(documents()?.length ?? 0) > 0; else empty">
        <article class="resource-card" *ngFor="let doc of documents()">
          <div class="resource-icon">
            <span>{{ getIcon(doc.fileType) }}</span>
          </div>
          <div class="resource-info">
            <strong>{{ doc.title }}</strong>
            <p>{{ doc.description }}</p>
            <div class="resource-meta">
              <span class="type-pill">{{ FILE_TYPE_LABELS[doc.fileType] }}</span>
              <span class="pill" *ngIf="doc.downloadable">Downloadable</span>
            </div>
          </div>
          <div class="resource-actions">
            <a [href]="doc.fileUrl" target="_blank" rel="noopener noreferrer" class="btn-view">View</a>
            <a *ngIf="doc.downloadable" [href]="doc.fileUrl" download class="btn-download">↓ Download</a>
          </div>
        </article>
      </div>

      <ng-template #empty>
        <div class="empty-state">
          <p>📁 No resources available yet.</p>
          <a [routerLink]="['/program-admin/programs', programId(), 'documents', 'new']" class="btn-add">+ Add Document</a>
        </div>
      </ng-template>
    </section>
  `,
  styles: [`
    .resources-page { display: grid; gap: 1rem; }

    .page-header {
      background: #fff;
      border: 1px solid #d4e2f0;
      border-radius: 1rem;
      padding: 1.2rem 1.4rem;
    }

    .back-link { color: #1a74c8; text-decoration: none; font-size: 0.85rem; font-weight: 600; }
    h1 { margin: 0.25rem 0; color: #0f3659; }
    .subtitle { margin: 0; color: #5f7a96; font-size: 0.9rem; }

    .resources-grid {
      display: grid;
      gap: 0.75rem;
    }

    .resource-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: #fff;
      border: 1px solid #d9e5f2;
      border-radius: 0.9rem;
      padding: 1rem 1.2rem;
      transition: box-shadow 0.15s;
    }

    .resource-card:hover { box-shadow: 0 2px 12px rgba(26,116,200,0.1); }

    .resource-icon {
      font-size: 2rem;
      width: 3rem;
      text-align: center;
      flex-shrink: 0;
    }

    .resource-info { flex: 1; min-width: 0; }

    .resource-info strong { color: #0f3659; display: block; margin-bottom: 0.2rem; }

    .resource-info p { margin: 0; color: #5f7a96; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .resource-meta { display: flex; gap: 0.4rem; margin-top: 0.4rem; flex-wrap: wrap; }

    .type-pill { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.72rem; font-weight: 600; background: #fef3c7; color: #92400e; }

    .pill { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.72rem; font-weight: 600; background: #d1fadf; color: #027a48; }

    .resource-actions { display: flex; gap: 0.5rem; flex-shrink: 0; }

    .btn-view {
      padding: 0.35rem 0.75rem;
      border-radius: 0.5rem;
      text-decoration: none;
      font-size: 0.82rem;
      font-weight: 600;
      background: #e8f0fc;
      color: #1a74c8;
    }

    .btn-download {
      padding: 0.35rem 0.75rem;
      border-radius: 0.5rem;
      text-decoration: none;
      font-size: 0.82rem;
      font-weight: 600;
      background: #d1fadf;
      color: #027a48;
    }

    .empty-state {
      background: #fff;
      border: 1px solid #d9e5f2;
      border-radius: 1rem;
      padding: 3rem;
      text-align: center;
      color: #5f7a96;
    }

    .btn-add {
      display: inline-block;
      margin-top: 1rem;
      padding: 0.55rem 1.2rem;
      background: linear-gradient(135deg, #0f3659, #1a74c8);
      color: #fff;
      border-radius: 0.65rem;
      text-decoration: none;
      font-size: 0.88rem;
      font-weight: 600;
    }
  `],
})
export class ResourcesPage {
  private readonly route = inject(ActivatedRoute);
  private readonly documentsService = inject(ProgramDocumentsAdminService);

  readonly programId = toSignal(
    this.route.params.pipe(switchMap((p) => [p['programId'] as string])),
    { initialValue: '' }
  );

  readonly documents = toSignal(
    this.route.params.pipe(switchMap((p) => this.documentsService.getDocuments(p['programId']))),
    { initialValue: [] }
  );

  protected readonly FILE_TYPE_LABELS = DOCUMENT_FILE_TYPE_LABELS;

  getIcon(fileType: string): string {
    const icons: Record<string, string> = {
      PDF: '📄',
      SLIDES: '📊',
      WORKSHEET: '📝',
      GUIDE: '📚',
      HANDOUT: '📋',
      OTHER: '📁',
    };
    return icons[fileType] ?? '📁';
  }
}
