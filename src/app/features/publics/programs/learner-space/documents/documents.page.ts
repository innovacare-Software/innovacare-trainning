import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { map, switchMap } from 'rxjs';
import { AuthService } from '../../../../../core/auth';
import { DOCUMENT_FILE_TYPE_LABELS, ProgramDocument } from '../../program.models';
import { PdfViewerComponent } from '../resources/pdf-viewer.component';
import { LearnerDocumentsService } from '../services/learner-documents.service';

@Component({
  selector: 'app-documents-page',
  standalone: true,
  imports: [CommonModule, PdfViewerComponent],
  template: `
    <div class="dp-page">
      <h1 class="dp-title">Documents & Files</h1>
      <p class="dp-subtitle">Reference materials, handouts, and study guides for your program.</p>

      @if (docs().length > 0) {
        <div class="dp-grid">
          @for (d of docs(); track d.id) {
            <div class="dp-card">
              <div class="dp-icon">
                {{ normalizedFileType(d) === 'pdf' ? '📕' : normalizedFileType(d) === 'docx' ? '📘' : normalizedFileType(d) === 'pptx' ? '📙' : normalizedFileType(d) === 'xlsx' ? '📗' : '📄' }}
              </div>
              <div class="dp-info">
                <h3 class="dp-name">{{ d.title }}</h3>
                @if (d.description) { <p class="dp-desc">{{ d.description }}</p> }
                <span class="dp-type">{{ fileTypeLabel(d.fileType) }}</span>
              </div>
              @if (isPdf(d)) {
                <button type="button" class="dp-view" (click)="openSecureViewer(d)">Secure View</button>
              } @else if (d.downloadable && d.fileUrl) {
                <a [href]="d.fileUrl" target="_blank" rel="noopener" class="dp-download">⬇ Download</a>
              } @else if (!d.downloadable && d.fileUrl) {
                <a [href]="d.fileUrl" target="_blank" rel="noopener" class="dp-view">👁 View</a>
              }
            </div>
          }
        </div>
      } @else {
        <div class="dp-empty"><span>📄</span><p>No documents available yet.</p></div>
      }

      @if (selectedDoc()) {
        <section class="dp-viewer-modal" (click)="closeSecureViewer()">
          <div class="dp-viewer-panel" (click)="$event.stopPropagation()">
            <header class="dp-viewer-head">
              <strong>{{ selectedDoc()!.title }}</strong>
              <button type="button" class="dp-close" (click)="closeSecureViewer()">Close</button>
            </header>

            @if (!usingExternalViewer()) {
              <app-pdf-viewer
                [resourceId]="selectedDoc()!.id"
                [programId]="programId()"
                kind="document"
                [watermarkEmail]="profile()?.email || ''"
                [watermarkOrgId]="profile()?.orgId || ''"
              />
            } @else {
              <div class="dp-external-stage">
                <iframe class="dp-external-frame" [src]="externalViewerUrl()" loading="lazy" referrerpolicy="no-referrer"></iframe>
              </div>
            }
          </div>
        </section>
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

    .dp-viewer-modal {
      position: fixed;
      inset: 0;
      background: rgba(7, 24, 43, 0.72);
      display: grid;
      place-items: center;
      z-index: 1200;
      padding: 1rem;
    }
    .dp-viewer-panel {
      width: min(1200px, 100%);
      max-height: calc(100vh - 2rem);
      background: #fff;
      border-radius: 1rem;
      border: 1px solid #d6e4f4;
      overflow: hidden;
      display: grid;
      grid-template-rows: auto 1fr;
    }
    .dp-viewer-head {
      display: flex;
      justify-content: space-between;
      gap: 0.6rem;
      align-items: center;
      padding: 0.75rem 0.9rem;
      border-bottom: 1px solid #e4edf8;
      background: #f8fbff;
    }
    .dp-close {
      border: 1px solid #c9daee;
      border-radius: 0.6rem;
      background: #fff;
      color: #1f4f7a;
      font-size: 0.8rem;
      font-weight: 700;
      padding: 0.35rem 0.75rem;
      cursor: pointer;
    }

    .dp-external-stage {
      height: min(80vh, 900px);
      background: #f4f7fb;
      padding: 0.75rem;
    }

    .dp-external-frame {
      width: 100%;
      height: 100%;
      border: 1px solid #d6e4f4;
      border-radius: 0.75rem;
      background: #fff;
    }

    .dp-empty { text-align: center; padding: 3rem 0; color: #9ca3af; font-size: .85rem; }
    .dp-empty span { font-size: 2rem; display: block; margin-bottom: .5rem; }
  `],
})
export class DocumentsPage {
  private readonly route = inject(ActivatedRoute);
  private readonly docsService = inject(LearnerDocumentsService);
  private readonly authService = inject(AuthService);
  private readonly sanitizer = inject(DomSanitizer);

  private readonly programId$ = this.route.parent!.paramMap.pipe(map((p) => p.get('programId') || ''));

  readonly selectedDoc = signal<ProgramDocument | null>(null);
  readonly externalViewerUrl = signal<SafeResourceUrl | null>(null);

  readonly programId = toSignal(this.programId$, { initialValue: '' });

  readonly profile = toSignal(this.authService.profile$, { initialValue: null });

  readonly docs = toSignal(
    this.programId$.pipe(switchMap((id) => this.docsService.getDocuments(id))),
    { initialValue: [] }
  );

  fileTypeLabel(type: string): string {
    const normalizedType = String(type || '').toLowerCase();
    return (DOCUMENT_FILE_TYPE_LABELS as Record<string, string>)[normalizedType] || type;
  }

  normalizedFileType(doc: ProgramDocument): string {
    return String(doc.fileType || '').toLowerCase();
  }

  isPdf(doc: ProgramDocument): boolean {
    return this.normalizedFileType(doc) === 'pdf';
  }

  canOpenSecurePdf(doc: ProgramDocument): boolean {
    if (!this.isPdf(doc)) {
      return false;
    }

    const filePath = String((doc as unknown as Record<string, unknown>)['filePath'] || '').trim();
    if (filePath) {
      return true;
    }

    const fileUrl = String(doc.fileUrl || '').trim().toLowerCase();
    return fileUrl.includes('firebasestorage.googleapis.com') || fileUrl.includes('storage.googleapis.com');
  }

  openSecureViewer(doc: ProgramDocument): void {
    if (!this.canOpenSecurePdf(doc)) {
      const embedUrl = this.buildEmbeddedViewerUrl(doc.fileUrl);
      this.externalViewerUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl));
      this.selectedDoc.set(doc);
      return;
    }

    this.externalViewerUrl.set(null);
    this.selectedDoc.set(doc);
  }

  closeSecureViewer(): void {
    this.externalViewerUrl.set(null);
    this.selectedDoc.set(null);
  }

  usingExternalViewer(): boolean {
    return !!this.externalViewerUrl();
  }

  private buildEmbeddedViewerUrl(rawUrl?: string): string {
    const input = String(rawUrl || '').trim();
    if (!input) {
      return 'about:blank';
    }

    const fromDriveFile = input.match(/drive\.google\.com\/file\/d\/([^/]+)/i)?.[1];
    if (fromDriveFile) {
      return `https://drive.google.com/file/d/${fromDriveFile}/preview`;
    }

    const decoded = decodeURIComponent(input);
    const fromChromeExt = decoded.match(/drive\.usercontent\.google\.com\/download\?id=([^&]+)/i)?.[1];
    if (fromChromeExt) {
      return `https://drive.google.com/file/d/${fromChromeExt}/preview`;
    }

    const fromDriveDownload = input.match(/drive\.usercontent\.google\.com\/download\?id=([^&]+)/i)?.[1];
    if (fromDriveDownload) {
      return `https://drive.google.com/file/d/${fromDriveDownload}/preview`;
    }

    return /^https:\/\//i.test(input) ? input : 'about:blank';
  }
}
