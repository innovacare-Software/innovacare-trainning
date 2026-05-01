import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { map, switchMap } from 'rxjs';
import { AuthService } from '../../../../../core/auth';
import { DOCUMENT_FILE_TYPE_LABELS, ProgramDocument } from '../../program.models';
import { PdfViewerComponent } from './pdf-viewer.component';
import { LearnerDocumentsService } from '../services/learner-documents.service';

@Component({
  selector: 'app-resources-page',
  standalone: true,
  imports: [CommonModule, RouterModule, PdfViewerComponent],
  template: `
    <div class="rp-page">
      <h1 class="rp-title">Resources Library</h1>
      <p class="rp-subtitle">All program documents, guides, and reference materials in one place.</p>

      @if (docs().length > 0) {
        <div class="rp-list">
          @for (d of docs(); track d.id) {
            <div class="rp-item">
              <span class="rp-file-icon">
                {{ normalizedFileType(d) === 'pdf' ? '📕' : normalizedFileType(d) === 'docx' ? '📘' : normalizedFileType(d) === 'pptx' ? '📙' : normalizedFileType(d) === 'xlsx' ? '📗' : normalizedFileType(d) === 'image' ? '🖼️' : '📄' }}
              </span>
              <div class="rp-info">
                <span class="rp-name">{{ d.title }}</span>
                @if (d.description) { <span class="rp-desc">{{ d.description }}</span> }
                <span class="rp-meta">{{ fileTypeLabel(d.fileType) }}</span>
              </div>
              @if (isPdf(d)) {
                <button type="button" class="rp-action" (click)="openSecureViewer(d)">Secure View</button>
              } @else if (d.fileUrl) {
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

      @if (selectedDoc()) {
        <section class="rp-viewer-modal" (click)="closeSecureViewer()">
          <div class="rp-viewer-panel" (click)="$event.stopPropagation()">
            <header class="rp-viewer-head">
              <strong>{{ selectedDoc()!.title }}</strong>
              <button type="button" class="rp-close" (click)="closeSecureViewer()">Close</button>
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
              <div class="rp-external-stage">
                <iframe class="rp-external-frame" [src]="externalViewerUrl()" loading="lazy" referrerpolicy="no-referrer"></iframe>
              </div>
            }
          </div>
        </section>
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
      border: 0;
      font-size: .73rem; font-weight: 600; padding: .3rem .7rem; border-radius: 7px;
      text-decoration: none; background: #eef2ff; color: #4f46e5; transition: all .2s;
      cursor: pointer;
    }
    .rp-action:hover { background: #e0e7ff; }

    .rp-viewer-modal {
      position: fixed;
      inset: 0;
      background: rgba(7, 24, 43, 0.72);
      display: grid;
      place-items: center;
      z-index: 1200;
      padding: 1rem;
    }
    .rp-viewer-panel {
      width: min(1200px, 100%);
      max-height: calc(100vh - 2rem);
      background: #fff;
      border-radius: 1rem;
      border: 1px solid #d6e4f4;
      overflow: hidden;
      display: grid;
      grid-template-rows: auto 1fr;
    }
    .rp-viewer-head {
      display: flex;
      justify-content: space-between;
      gap: 0.6rem;
      align-items: center;
      padding: 0.75rem 0.9rem;
      border-bottom: 1px solid #e4edf8;
      background: #f8fbff;
    }
    .rp-close {
      border: 1px solid #c9daee;
      border-radius: 0.6rem;
      background: #fff;
      color: #1f4f7a;
      font-size: 0.8rem;
      font-weight: 700;
      padding: 0.35rem 0.75rem;
      cursor: pointer;
    }

    .rp-external-stage {
      height: min(80vh, 900px);
      background: #f4f7fb;
      padding: 0.75rem;
    }

    .rp-external-frame {
      width: 100%;
      height: 100%;
      border: 1px solid #d6e4f4;
      border-radius: 0.75rem;
      background: #fff;
    }

    .rp-empty { text-align: center; padding: 3rem 0; color: #9ca3af; }
    .rp-empty span { font-size: 2rem; display: block; margin-bottom: .5rem; }
  `],
})
export class ResourcesPage {
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
