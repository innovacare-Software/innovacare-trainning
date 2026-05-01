import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  Input,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { SecurePdfKind, SecurePdfService } from '../services/secure-pdf.service';
import { firstValueFrom } from 'rxjs';

import * as pdfjsLib from 'pdfjs-dist';

// Required for pdfjs-dist v4: configure the worker before any getDocument() call
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).toString();

type PdfDocumentProxy = Awaited<ReturnType<typeof pdfjsLib.getDocument>>['promise'] extends Promise<infer T>
  ? T
  : never;

@Component({
  selector: 'app-pdf-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="pdf-viewer" (contextmenu)="blockContextMenu($event)">
      <header class="pdf-toolbar">
        <div class="pdf-toolbar__group">
          <button type="button" class="btn" (click)="prevPage()" [disabled]="currentPage() <= 1 || loading()">
            Prev
          </button>
          <span class="page-indicator">Page {{ currentPage() }} / {{ totalPages() }}</span>
          <button type="button" class="btn" (click)="nextPage()" [disabled]="currentPage() >= totalPages() || loading()">
            Next
          </button>
        </div>

        <div class="pdf-toolbar__group">
          <button type="button" class="btn" (click)="zoomOut()" [disabled]="loading()">-</button>
          <span class="zoom-indicator">{{ zoomPercent() }}%</span>
          <button type="button" class="btn" (click)="zoomIn()" [disabled]="loading()">+</button>
        </div>
      </header>

      <div class="pdf-stage">
        @if (loading()) {
          <div class="pdf-status">Loading secure PDF...</div>
        }

        @if (!!errorMessage()) {
          <div class="pdf-status pdf-status--error">{{ errorMessage() }}</div>
        }

        <canvas #pdfCanvas class="pdf-canvas" [class.is-hidden]="loading() || !!errorMessage()"></canvas>
      </div>
    </section>
  `,
  styles: [
    `
      .pdf-viewer {
        border: 1px solid #d9e5f2;
        border-radius: 0.9rem;
        background: #ffffff;
        overflow: hidden;
        user-select: none;
      }

      .pdf-toolbar {
        display: flex;
        justify-content: space-between;
        gap: 0.6rem;
        align-items: center;
        border-bottom: 1px solid #e5edf7;
        background: linear-gradient(180deg, #f8fbff 0%, #f2f7fd 100%);
        padding: 0.6rem 0.75rem;
      }

      .pdf-toolbar__group {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
      }

      .btn {
        border: 1px solid #c8d9ee;
        background: #ffffff;
        color: #0f3659;
        border-radius: 0.55rem;
        min-width: 40px;
        height: 34px;
        padding: 0 0.7rem;
        font-size: 0.8rem;
        font-weight: 700;
        cursor: pointer;
      }

      .btn:disabled {
        cursor: not-allowed;
        opacity: 0.45;
      }

      .page-indicator,
      .zoom-indicator {
        font-size: 0.78rem;
        color: #456485;
        font-weight: 700;
      }

      .pdf-stage {
        min-height: 540px;
        max-height: calc(100vh - 280px);
        overflow: auto;
        background: #eef3f9;
        display: grid;
        place-items: center;
        padding: 1rem;
      }

      .pdf-canvas {
        background: #fff;
        border-radius: 0.4rem;
        box-shadow: 0 16px 40px rgba(15, 54, 89, 0.15);
        max-width: 100%;
      }

      .pdf-canvas.is-hidden {
        display: none;
      }

      .pdf-status {
        font-size: 0.9rem;
        color: #3b5c7f;
        font-weight: 600;
      }

      .pdf-status--error {
        color: #b42318;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PdfViewerComponent implements AfterViewInit, OnDestroy {
  private readonly securePdfService = inject(SecurePdfService);

  @ViewChild('pdfCanvas') private canvasRef?: ElementRef<HTMLCanvasElement>;

  @Input({ required: true }) resourceId = '';
  @Input({ required: true }) programId = '';
  @Input() kind: SecurePdfKind = 'resource';
  @Input() watermarkEmail = '';
  @Input() watermarkOrgId = '';

  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly currentPage = signal(1);
  readonly totalPages = signal(1);
  readonly zoom = signal(1.1);
  readonly zoomPercent = computed(() => Math.round(this.zoom() * 100));

  private pdfDocument: PdfDocumentProxy | null = null;

  async ngAfterViewInit(): Promise<void> {
    await this.loadPdf();
  }

  ngOnDestroy(): void {
    void this.pdfDocument?.destroy();
  }

  @HostListener('window:keydown', ['$event'])
  onWindowKeydown(event: KeyboardEvent): void {
    const isModifier = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();
    if (isModifier && (key === 's' || key === 'p')) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  blockContextMenu(event: MouseEvent): void {
    event.preventDefault();
  }

  async prevPage(): Promise<void> {
    if (this.currentPage() <= 1) {
      return;
    }
    this.currentPage.update((value) => value - 1);
    await this.renderCurrentPage();
  }

  async nextPage(): Promise<void> {
    if (this.currentPage() >= this.totalPages()) {
      return;
    }
    this.currentPage.update((value) => value + 1);
    await this.renderCurrentPage();
  }

  async zoomIn(): Promise<void> {
    this.zoom.update((value) => Math.min(2.5, value + 0.15));
    await this.renderCurrentPage();
  }

  async zoomOut(): Promise<void> {
    this.zoom.update((value) => Math.max(0.7, value - 0.15));
    await this.renderCurrentPage();
  }

  private async loadPdf(): Promise<void> {
    if (!this.resourceId || !this.programId) {
      this.errorMessage.set('Missing PDF resource context.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const blob = await this.securePdfService
        .fetchPdfBlob(this.resourceId, this.programId, this.kind);
      const resolvedBlob = await firstValueFrom(blob);

      if (!resolvedBlob) {
        throw new Error('Secure stream returned no data.');
      }

      const arrayBuffer = await resolvedBlob.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        disableAutoFetch: true,
        disableStream: true,
      });

      this.pdfDocument = await loadingTask.promise;
      this.totalPages.set(this.pdfDocument.numPages || 1);
      this.currentPage.set(1);
      await this.renderCurrentPage();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to open secure PDF.';
      this.errorMessage.set(message);
    } finally {
      this.loading.set(false);
    }
  }

  private async renderCurrentPage(): Promise<void> {
    if (!this.pdfDocument || !this.canvasRef?.nativeElement) {
      return;
    }

    const page = await this.pdfDocument.getPage(this.currentPage());
    const viewport = page.getViewport({ scale: this.zoom() });
    const canvas = this.canvasRef.nativeElement;
    const context = canvas.getContext('2d', { alpha: false });

    if (!context) {
      this.errorMessage.set('Canvas context unavailable.');
      return;
    }

    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    canvas.style.width = `${Math.ceil(viewport.width)}px`;
    canvas.style.height = `${Math.ceil(viewport.height)}px`;

    context.save();
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.restore();

    await page.render({
      canvasContext: context,
      viewport,
    }).promise;

    this.drawWatermarkOverlay(context, canvas.width, canvas.height);
  }

  private drawWatermarkOverlay(context: CanvasRenderingContext2D, width: number, height: number): void {
    const now = new Date().toISOString();
    const email = this.watermarkEmail || 'learner';
    const org = this.watermarkOrgId || 'org';
    const text = `Confidential - ${email} - ${now} - ${org}`;

    context.save();
    context.globalAlpha = 0.12;
    context.fillStyle = '#1f3d5a';
    context.font = '600 16px "Segoe UI", sans-serif';
    context.translate(width / 2, height / 2);
    context.rotate((-30 * Math.PI) / 180);

    const stepX = 330;
    const stepY = 160;
    for (let y = -height; y <= height; y += stepY) {
      for (let x = -width; x <= width; x += stepX) {
        context.fillText(text, x, y);
      }
    }

    context.restore();
  }
}
