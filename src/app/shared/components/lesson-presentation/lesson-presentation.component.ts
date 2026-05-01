import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

let nextLessonFrameId = 0;

@Component({
  selector: 'app-lesson-presentation',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="lesson-presentation" [class.lesson-presentation--preview]="previewMode">
      <header class="lesson-presentation__header">
        <div class="lesson-presentation__type">{{ resolvedTypeLabel }}</div>
        <h2 class="lesson-presentation__title">{{ resolvedTitle }}</h2>
        @if (resolvedDescription) {
          <p class="lesson-presentation__description">{{ resolvedDescription }}</p>
        }
        <div class="lesson-presentation__meta">
          <span>⏱ {{ durationMin || 0 }} min</span>
          @if (isPreview) {
            <span class="lesson-presentation__preview-flag">Preview</span>
          }
        </div>
      </header>

      @if (showVideoBlock) {
        <section class="lesson-presentation__media-card">
          @if (isDirectVideo) {
            <video
              class="lesson-presentation__video"
              [src]="videoUrl"
              controls
              playsinline
              preload="metadata"
              (timeupdate)="onDirectVideoTimeUpdate($event)"
              (ended)="onDirectVideoEnded()"
            ></video>
          } @else {
            <iframe
              class="lesson-presentation__video"
              [src]="safeVideoUrl()"
              allowfullscreen
              loading="lazy"
              referrerpolicy="strict-origin-when-cross-origin"
            ></iframe>
          }
        </section>
      }

      @if (shouldShowContentCard) {
        <section class="lesson-presentation__content-card">
          @if (hasContentHtml) {
            @if (usesWebDocumentMode) {
              <iframe
                #contentFrame
                class="lesson-presentation__content-frame"
                scrolling="no"
                sandbox="allow-scripts allow-forms allow-modals allow-popups allow-downloads"
                loading="lazy"
                title="Lesson content"
                (load)="onContentFrameLoad()"
              ></iframe>
            } @else {
              <iframe
                #contentFrame
                class="lesson-presentation__content-frame"
                sandbox="allow-same-origin allow-scripts allow-popups"
                loading="lazy"
                title="Lesson content"
                (load)="onContentFrameLoad()"
              ></iframe>
            }
          } @else {
            <div class="lesson-presentation__empty-state">
              Add HTML content to preview the learner rendering.
            </div>
          }
        </section>
      }

      @if (showDocumentBlock) {
        <section class="lesson-presentation__document-card">
          <a [href]="resolvedDocumentUrl" target="_blank" rel="noopener" class="lesson-presentation__document-link">
            {{ documentActionLabel }}
          </a>
        </section>
      }
    </section>
  `,
  styles: [`
    .lesson-presentation {
      display: grid;
      gap: 1.15rem;
    }

    .lesson-presentation__header {
      background:
        radial-gradient(circle at top right, rgba(59, 130, 246, 0.18), transparent 34%),
        linear-gradient(160deg, #ffffff, #eff6ff);
      border: 1px solid #dbe7f5;
      border-radius: 1.1rem;
      padding: 1.35rem;
      box-shadow: 0 18px 40px rgba(15, 23, 42, 0.05);
    }

    .lesson-presentation__type {
      display: inline-flex;
      align-items: center;
      min-height: 30px;
      padding: 0 0.75rem;
      border-radius: 999px;
      background: #dbeafe;
      color: #1d4ed8;
      font-size: 0.75rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .lesson-presentation__title {
      margin: 0.75rem 0 0;
      font-size: clamp(1.5rem, 2vw, 2rem);
      line-height: 1.08;
      font-weight: 800;
      color: #0f172a;
    }

    .lesson-presentation__description {
      margin: 0.75rem 0 0;
      max-width: 68ch;
      color: #475569;
      font-size: 0.98rem;
      line-height: 1.7;
    }

    .lesson-presentation__meta {
      display: flex;
      gap: 0.65rem;
      flex-wrap: wrap;
      margin-top: 0.9rem;
      color: #64748b;
      font-size: 0.82rem;
      font-weight: 600;
    }

    .lesson-presentation__preview-flag {
      color: #1d4ed8;
    }

    .lesson-presentation__media-card,
    .lesson-presentation__content-card,
    .lesson-presentation__document-card {
      background: #ffffff;
      border: 1px solid #dbe7f5;
      border-radius: 1.1rem;
      box-shadow: 0 16px 32px rgba(15, 23, 42, 0.05);
    }

    /* video needs clip for aspect-ratio; content card must NOT clip the iframe */
    .lesson-presentation__media-card {
      overflow: hidden;
    }

    .lesson-presentation__content-card {
      overflow: visible;
    }

    .lesson-presentation__video {
      display: block;
      width: 100%;
      aspect-ratio: 16 / 9;
      border: 0;
      background: #020617;
    }

    .lesson-presentation__content-frame {
      display: block;
      width: 100%;
      min-height: 900px;
      border: 0;
      background: #ffffff;
      overflow: visible;
    }

    .lesson-presentation__empty-state {
      padding: 2rem 1.25rem;
      color: #64748b;
      font-size: 0.92rem;
      text-align: center;
      background:
        linear-gradient(180deg, rgba(239, 246, 255, 0.7), rgba(255, 255, 255, 0.92));
    }

    .lesson-presentation__document-card {
      padding: 1.1rem;
    }

    .lesson-presentation__document-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      padding: 0 1rem;
      border-radius: 0.85rem;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1d4ed8;
      font-size: 0.92rem;
      font-weight: 700;
      text-decoration: none;
    }

    .lesson-presentation--preview .lesson-presentation__header {
      border-style: dashed;
    }

    @media (max-width: 720px) {
      .lesson-presentation__header {
        padding: 1.1rem;
      }
    }
  `],
})
export class LessonPresentationComponent implements AfterViewInit, OnChanges {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly frameId = `lesson-frame-${++nextLessonFrameId}`;
  private readonly minFrameHeight = 900;
  private readonly onWindowMessageBound = (event: MessageEvent) => this.onWindowMessage(event);
  private frameHeightBurstTimer: ReturnType<typeof window.setInterval> | null = null;
  private frameHeightBurstEndAt = 0;

  @ViewChild('contentFrame') private contentFrame?: ElementRef<HTMLIFrameElement>;

  @Input() title = '';
  @Input() description = '';
  @Input() lessonType = '';
  @Input() contentHtml = '';
  @Input() videoUrl = '';
  @Input() documentUrl = '';
  @Input() downloadable = false;
  @Input() durationMin = 0;
  @Input() isPreview = false;
  @Input() previewMode = false;
  @Output() videoProgress = new EventEmitter<number>();

  ngAfterViewInit(): void {
    window.addEventListener('message', this.onWindowMessageBound);
    this.renderContentFrame();
  }

  ngOnChanges(): void {
    this.renderContentFrame();
  }

  ngOnDestroy(): void {
    window.removeEventListener('message', this.onWindowMessageBound);
    this.stopFrameHeightBurst();
  }

  get hasContentHtml(): boolean {
    return !!this.contentHtml?.trim();
  }

  get shouldShowContentCard(): boolean {
    return this.hasContentHtml || this.previewMode;
  }

  get usesWebDocumentMode(): boolean {
    return this.normalizedLessonType === 'web';
  }

  get normalizedLessonType(): string {
    return String(this.lessonType || '').trim().toLowerCase();
  }

  get resolvedTypeLabel(): string {
    switch (this.normalizedLessonType) {
      case 'video':
        return 'Video';
      case 'text':
        return 'Text';
      case 'reading':
        return 'Reading';
      case 'document':
        return 'Document';
      case 'mixed':
        return 'Mixed';
      case 'web':
        return 'Web Page';
      default:
        return this.lessonType || 'Lesson';
    }
  }

  get resolvedTitle(): string {
    return this.title?.trim() || (this.previewMode ? 'Lesson title preview' : 'Lesson');
  }

  get resolvedDescription(): string {
    return this.description?.trim();
  }

  get showVideoBlock(): boolean {
    return !!this.videoUrl?.trim() && (this.normalizedLessonType === 'video' || this.normalizedLessonType === 'mixed');
  }

  get showDocumentBlock(): boolean {
    return !!this.resolvedDocumentUrl && this.normalizedLessonType === 'document';
  }

  get resolvedDocumentUrl(): string {
    return String(this.documentUrl || this.videoUrl || '').trim();
  }

  get documentActionLabel(): string {
    return this.downloadable ? 'Download Document' : 'Open Document';
  }

  get isDirectVideo(): boolean {
    return isDirectVideoUrl(this.videoUrl) || isFirebaseStorageVideoUrl(this.videoUrl);
  }

  safeVideoUrl() {
    return this.sanitizer.bypassSecurityTrustResourceUrl(toPreviewUrl(this.videoUrl));
  }

  onDirectVideoTimeUpdate(event: Event): void {
    const video = event.target as HTMLVideoElement | null;
    if (!video) {
      return;
    }

    const duration = Number(video.duration || 0);
    const currentTime = Number(video.currentTime || 0);
    const pct = duration > 0 ? Math.max(0, Math.min(100, Math.round((currentTime / duration) * 100))) : 0;
    this.videoProgress.emit(pct);
  }

  onDirectVideoEnded(): void {
    this.videoProgress.emit(100);
  }

  onContentFrameLoad(): void {
    this.syncFrameHeight();
    window.setTimeout(() => this.syncFrameHeight(), 80);
    window.setTimeout(() => this.syncFrameHeight(), 220);
    window.setTimeout(() => this.syncFrameHeight(), 600);
    window.setTimeout(() => this.syncFrameHeight(), 1200);
    this.startFrameHeightBurst(5000);
  }

  private renderContentFrame(): void {
    window.setTimeout(() => {
      const iframe = this.contentFrame?.nativeElement;
      if (!iframe) {
        return;
      }

      if (!this.hasContentHtml) {
        iframe.removeAttribute('srcdoc');
        return;
      }

      iframe.srcdoc = buildLessonDocument(this.contentHtml, {
        frameId: this.frameId,
        webMode: this.usesWebDocumentMode,
        hostOrigin: window.location.origin,
      });

      iframe.style.height = `${this.minFrameHeight}px`;
      this.startFrameHeightBurst(5000);

      if (!this.usesWebDocumentMode) {
        this.syncFrameHeight();
      }
    });
  }

  private syncFrameHeight(): void {
    if (this.usesWebDocumentMode) {
      return;
    }

    const iframe = this.contentFrame?.nativeElement;
    let doc: Document | null = null;
    try {
      doc = iframe?.contentDocument ?? null;
    } catch (_) {
      return; // cross-origin guard
    }
    if (!iframe || !doc || !doc.body) {
      return;
    }

    // Collect all candidate heights to capture multi-column grids
    const candidates: number[] = [
      doc.documentElement?.scrollHeight ?? 0,
      doc.documentElement?.offsetHeight ?? 0,
      doc.body.scrollHeight,
      doc.body.offsetHeight,
      this.minFrameHeight,
    ];

    // Walk every direct child of body to find the true rendered bottom
    try {
      const children = doc.body.children;
      const scrollTop = doc.documentElement?.scrollTop ?? 0;
      for (let i = 0; i < children.length; i++) {
        const el = children[i] as HTMLElement;
        candidates.push(el.offsetTop + el.offsetHeight + scrollTop);
      }
    } catch (_) { /* sandboxed child access */ }

    iframe.style.height = `${Math.max(...candidates)}px`;
  }

  private onWindowMessage(event: MessageEvent): void {
    const iframe = this.contentFrame?.nativeElement;
    const data = event.data as { type?: string; frameId?: string; height?: number } | null;
    if (!iframe || !data || data.type !== 'lesson-frame-height' || data.frameId !== this.frameId) {
      return;
    }

    const nextHeight = Math.max(Number(data.height || 0), this.minFrameHeight);
    iframe.style.height = `${nextHeight}px`;
  }

  private startFrameHeightBurst(durationMs: number): void {
    this.frameHeightBurstEndAt = Date.now() + Math.max(0, durationMs);
    if (this.frameHeightBurstTimer) {
      return;
    }

    this.frameHeightBurstTimer = window.setInterval(() => {
      this.syncFrameHeight();

      if (Date.now() >= this.frameHeightBurstEndAt) {
        this.stopFrameHeightBurst();
      }
    }, 120);
  }

  private stopFrameHeightBurst(): void {
    if (this.frameHeightBurstTimer) {
      window.clearInterval(this.frameHeightBurstTimer);
      this.frameHeightBurstTimer = null;
    }
  }
}

function buildLessonDocument(contentHtml: string, options: { frameId: string; webMode: boolean; hostOrigin: string }): string {
  if (options.webMode) {
    return buildWebLessonDocument(contentHtml, options.frameId, options.hostOrigin);
  }

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <base target="_blank" />
    <style>
      :root {
        color-scheme: light;
        --lesson-page-bg: #f8fafc;
        --lesson-card-bg: #ffffff;
        --lesson-text: #0f172a;
        --lesson-muted: #6b7280;
        --lesson-border: #e2e8f0;
        --lesson-surface: #ffffff;
        --lesson-surface-alt: #f8fbff;
        --lesson-accent: #234a84;
        --lesson-accent-hover: #1b3a68;
        --lesson-accent-soft: #eef3fb;
        --lesson-code-bg: #0f172a;
        --lesson-info-bg: #eef6ff;
        --lesson-info-border: #cce2ff;
        --lesson-info-text: #153a6b;
        --lesson-warn-bg: #fff1f2;
        --lesson-warn-border: #fecdd3;
        --lesson-warn-text: #7f1d1d;
        --lesson-success-bg: #ecfdf5;
        --lesson-success-border: #bbf7d0;
        --lesson-success-text: #065f46;
        --lesson-shadow-sm: 0 2px 8px rgba(3, 10, 26, .04);
        --lesson-shadow-md: 0 6px 18px rgba(3, 10, 26, .08);
        --lesson-radius: 14px;
        --lesson-radius-lg: 18px;
      }

      * { box-sizing: border-box; }

      html, body {
        margin: 0;
        padding: 0;
        height: auto;
        overflow: visible;
        background: var(--lesson-page-bg);
        color: var(--lesson-text);
        font: 400 16px/1.6 system-ui, -apple-system, "Segoe UI", Inter, Roboto, "Helvetica Neue", Arial, sans-serif;
      }

      body {
        padding: 18px;
      }

      .lesson-html-root {
        width: 100%;
        margin: 0 auto;
        color: var(--lesson-text);
        font-size: 1rem;
        line-height: 1.75;
        overflow-wrap: anywhere;
      }

      .lesson-html-root,
      .lesson-html-root .container,
      .lesson-html-root .container-fluid {
        max-width: 100%;
      }

      .lesson-html-root > :first-child { margin-top: 0; }
      .lesson-html-root > :last-child { margin-bottom: 0; }

      .lesson-html-root h1,
      .lesson-html-root h2,
      .lesson-html-root h3,
      .lesson-html-root h4,
      .lesson-html-root h5,
      .lesson-html-root h6 {
        margin: 1.5em 0 0.55em;
        line-height: 1.12;
        letter-spacing: -0.03em;
        color: #020617;
        font-weight: 950;
      }

      .lesson-html-root h1 { font-size: clamp(2rem, 4vw, 3rem); }
      .lesson-html-root h2 { font-size: clamp(1.55rem, 3vw, 2.2rem); }
      .lesson-html-root h3 { font-size: clamp(1.2rem, 2vw, 1.6rem); }
      .lesson-html-root h4 { font-size: 1.05rem; }

      .lesson-html-root p,
      .lesson-html-root ul,
      .lesson-html-root ol,
      .lesson-html-root blockquote,
      .lesson-html-root pre,
      .lesson-html-root table,
      .lesson-html-root figure {
        margin: 0 0 1rem;
      }

      .lesson-html-root ul,
      .lesson-html-root ol {
        padding-left: 1.4rem;
      }

      .lesson-html-root li + li {
        margin-top: 0.35rem;
      }

      .lesson-html-root a {
        color: var(--lesson-accent);
        text-decoration: underline;
        text-decoration-thickness: 0.08em;
        text-underline-offset: 0.18em;
      }

      .lesson-html-root a:hover {
        color: var(--lesson-accent-hover);
      }

      .lesson-html-root strong {
        color: #020617;
      }

      .lesson-html-root blockquote {
        padding: 1rem 1.2rem;
        border-left: 4px solid var(--lesson-accent);
        border-radius: 0 1rem 1rem 0;
        background: linear-gradient(135deg, rgba(219, 234, 254, 0.55), rgba(248, 250, 252, 0.95));
        color: var(--lesson-muted);
      }

      .lesson-html-root code {
        padding: 0.14rem 0.45rem;
        border-radius: 0.55rem;
        background: #e2e8f0;
        color: #0f172a;
        font-family: "Cascadia Code", "Consolas", monospace;
        font-size: 0.92em;
      }

      .lesson-html-root pre {
        overflow: auto;
        padding: 1rem;
        border-radius: 1rem;
        background: var(--lesson-code-bg);
        color: #e2e8f0;
      }

      .lesson-html-root pre code {
        padding: 0;
        background: transparent;
        color: inherit;
      }

      .lesson-html-root hr {
        margin: 1.5rem 0;
        border: 0;
        border-top: 1px solid var(--lesson-border);
      }

      .lesson-html-root img,
      .lesson-html-root video,
      .lesson-html-root iframe {
        display: block;
        max-width: 100%;
        height: auto;
        border-radius: 12px;
      }

      .lesson-html-root img {
        box-shadow: var(--lesson-shadow-sm);
        background: #f3f4f6;
      }

      .lesson-html-root table {
        width: 100%;
        border-collapse: collapse;
        background: var(--lesson-surface-alt);
        border: 1px solid var(--lesson-border);
        border-radius: 1rem;
        overflow: hidden;
      }

      .lesson-html-root th,
      .lesson-html-root td {
        padding: 0.8rem 0.9rem;
        border-bottom: 1px solid var(--lesson-border);
        text-align: left;
        vertical-align: top;
      }

      .lesson-html-root th {
        background: rgba(219, 234, 254, 0.55);
        font-size: 0.82rem;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #334155;
      }

      .lesson-html-root tr:last-child td {
        border-bottom: 0;
      }

      .lesson-html-root figure {
        max-width: 100%;
        overflow: hidden;
      }

      .lesson-html-root figcaption {
        color: var(--lesson-muted);
        font-size: 0.9rem;
        margin-top: 6px;
      }

      .lesson-html-root .audio,
      .lesson-html-root .video,
      .lesson-html-root .quiz,
      .lesson-html-root .callout,
      .lesson-html-root .card,
      .lesson-html-root .rounded-4.border,
      .lesson-html-root .rounded-4.border.bg-white,
      .lesson-html-root .rounded-4.border.shadow-sm,
      .lesson-html-root .rounded-4.border.bg-white.shadow-sm {
        border: 1px solid var(--lesson-border);
        border-radius: var(--lesson-radius);
        background: var(--lesson-card-bg);
        box-shadow: var(--lesson-shadow-sm);
      }

      .lesson-html-root .audio,
      .lesson-html-root .video,
      .lesson-html-root .quiz,
      .lesson-html-root .callout {
        padding: 12px 14px;
      }

      .lesson-html-root .audio audio {
        width: 100%;
      }

      .lesson-html-root .callout.info {
        background: var(--lesson-info-bg);
        border-color: var(--lesson-info-border);
        color: var(--lesson-info-text);
      }

      .lesson-html-root .callout.warn {
        background: var(--lesson-warn-bg);
        border-color: var(--lesson-warn-border);
        color: var(--lesson-warn-text);
      }

      .lesson-html-root .callout.success {
        background: var(--lesson-success-bg);
        border-color: var(--lesson-success-border);
        color: var(--lesson-success-text);
      }

      .lesson-html-root details {
        border: 1px solid var(--lesson-border);
        border-radius: 12px;
        background: #f8fafc;
        padding: 10px 12px;
      }

      .lesson-html-root details summary {
        cursor: pointer;
        font-weight: 600;
      }

      .lesson-html-root .accordion {
        display: grid;
        gap: 12px;
      }

      .lesson-html-root .accordion-item {
        border: 1px solid var(--lesson-border);
        border-radius: 16px;
        overflow: hidden;
        background: #ffffff;
        box-shadow: var(--lesson-shadow-sm);
      }

      .lesson-html-root .accordion-header {
        margin: 0;
      }

      .lesson-html-root .accordion-button {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        border: 0;
        padding: 14px 16px;
        background: #f8fbff;
        color: var(--lesson-text);
        font: inherit;
        font-weight: 800;
        text-align: left;
      }

      .lesson-html-root .accordion-button::after {
        content: 'Open';
        font-size: 0.74rem;
        font-weight: 700;
        color: var(--lesson-accent);
      }

      .lesson-html-root .accordion-button.collapsed::after {
        content: 'Section';
      }

      .lesson-html-root .accordion-button.collapsed {
        background: #ffffff;
      }

      .lesson-html-root .accordion-collapse {
        display: block;
      }

      .lesson-html-root .accordion-body {
        padding: 16px;
      }

      .lesson-html-root .progress {
        width: 100%;
        overflow: hidden;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.2);
      }

      .lesson-html-root .progress-bar {
        height: 100%;
        min-height: 10px;
        border-radius: 999px;
        background: var(--lesson-accent);
      }

      .lesson-html-root .badge {
        display: inline-flex;
        align-items: center;
        min-height: 28px;
        padding: 0 10px;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 800;
        line-height: 1;
      }

      .lesson-html-root .rounded-pill {
        border-radius: 999px;
      }

      .lesson-html-root .badge.text-bg-primary,
      .lesson-html-root .text-bg-primary {
        background: var(--lesson-accent);
        color: #ffffff;
      }

      .lesson-html-root .badge.text-bg-info,
      .lesson-html-root .text-bg-info {
        background: #dbeafe;
        color: #1e40af;
      }

      .lesson-html-root .badge.text-bg-light,
      .lesson-html-root .text-bg-light {
        background: #ffffff;
        color: var(--lesson-accent);
      }

      .lesson-html-root .bg-light,
      .lesson-html-root .bg-light-subtle {
        background: #f8fafc;
      }

      .lesson-html-root .bg-white {
        background: #ffffff;
      }

      .lesson-html-root .text-white {
        color: #ffffff;
      }

      .lesson-html-root .text-primary {
        color: var(--lesson-accent);
      }

      .lesson-html-root .text-secondary,
      .lesson-html-root .small.text-secondary {
        color: var(--lesson-muted);
      }

      .lesson-html-root .small {
        font-size: 0.875rem;
      }

      .lesson-html-root .fw-bold,
      .lesson-html-root .fw-semibold {
        font-weight: 800;
      }

      .lesson-html-root .text-uppercase {
        text-transform: uppercase;
      }

      .lesson-html-root .shadow-sm {
        box-shadow: var(--lesson-shadow-sm);
      }

      .lesson-html-root .border {
        border: 1px solid var(--lesson-border);
      }

      .lesson-html-root .rounded-3 {
        border-radius: 12px;
      }

      .lesson-html-root .rounded-4 {
        border-radius: var(--lesson-radius-lg);
      }

      .lesson-html-root .overflow-hidden {
        overflow: hidden;
      }

      .lesson-html-root .p-2 { padding: 0.75rem; }
      .lesson-html-root .p-3 { padding: 1rem; }
      .lesson-html-root .p-4 { padding: 1.25rem; }
      .lesson-html-root .p-5 { padding: 1.5rem; }
      .lesson-html-root .mb-0 { margin-bottom: 0; }
      .lesson-html-root .mb-1 { margin-bottom: 0.25rem; }
      .lesson-html-root .mb-2 { margin-bottom: 0.5rem; }
      .lesson-html-root .mb-3 { margin-bottom: 1rem; }
      .lesson-html-root .mb-4 { margin-bottom: 1.25rem; }
      .lesson-html-root .gap-2 { gap: 0.5rem; }
      .lesson-html-root .gap-4 { gap: 1.25rem; }
      .lesson-html-root .ps-3 { padding-left: 1rem; }
      .lesson-html-root .px-0 { padding-left: 0; padding-right: 0; }
      .lesson-html-root .h-100 { height: 100%; }

      .lesson-html-root .d-flex {
        display: flex;
      }

      .lesson-html-root .vstack {
        display: flex;
        flex-direction: column;
      }

      .lesson-html-root .align-items-center {
        align-items: center;
      }

      .lesson-html-root .justify-content-between {
        justify-content: space-between;
      }

      .lesson-html-root .justify-content-center {
        justify-content: center;
      }

      .lesson-html-root .flex-wrap {
        flex-wrap: wrap;
      }

      .lesson-html-root .text-center {
        text-align: center;
      }

      .lesson-html-root .container-fluid {
        width: 100%;
      }

      .lesson-html-root .row {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1rem;
      }

      .lesson-html-root [class*="col-lg-"] {
        min-width: 0;
      }

      .lesson-html-root .h2,
      .lesson-html-root .h5,
      .lesson-html-root .h6 {
        margin-top: 0;
        color: var(--lesson-text);
      }

      .lesson-html-root .h2 { font-size: clamp(1.6rem, 3vw, 2.2rem); }
      .lesson-html-root .h5 { font-size: 1.1rem; }
      .lesson-html-root .h6 { font-size: 1rem; }

      @media (max-width: 680px) {
        body {
          padding: 1rem;
        }

        .lesson-html-root {
          font-size: 0.96rem;
          line-height: 1.68;
        }

        .lesson-html-root .p-4,
        .lesson-html-root .p-5,
        .lesson-html-root .p-lg-4,
        .lesson-html-root .p-lg-5 {
          padding: 1rem;
        }
      }

      @media (min-width: 992px) {
        .lesson-html-root .row {
          grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
          align-items: start;
        }

        .lesson-html-root .row > .col-lg-8 {
          grid-column: span 1;
        }

        .lesson-html-root .row > .col-lg-4 {
          grid-column: span 1;
        }

        .lesson-html-root .p-lg-4 { padding: 1.5rem; }
        .lesson-html-root .p-lg-5 { padding: 2rem; }
      }
    </style>
  </head>
  <body>
    <div class="lesson-html-root">${contentHtml}</div>
  </body>
</html>`;
}

function buildWebLessonDocument(contentHtml: string, frameId: string, hostOrigin: string): string {
  if (looksLikeFullHtmlDocument(contentHtml)) {
    let documentHtml = sanitizeEmbeddedWebDocument(contentHtml, hostOrigin);

    if (!/<head[\s>]/i.test(documentHtml)) {
      documentHtml = documentHtml.replace(/<html([^>]*)>/i, '<html$1><head></head>');
    }

    if (!/<body[\s>]/i.test(documentHtml)) {
      if (/<\/head>/i.test(documentHtml)) {
        documentHtml = documentHtml.replace(/<\/head>/i, '</head><body>');
        documentHtml += '</body>';
      } else {
        documentHtml += '<body></body>';
      }
    }

    documentHtml = injectIntoHead(documentHtml, `
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      html, body {
        margin: 0;
      }
    </style>`);

    return injectBeforeBodyEnd(documentHtml, buildResizeScript(frameId, hostOrigin));
  }

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        background: #ffffff;
      }
    </style>
  </head>
  <body>
    ${contentHtml}
    ${buildResizeScript(frameId, hostOrigin)}
  </body>
</html>`;
}

function sanitizeEmbeddedWebDocument(documentHtml: string, hostOrigin: string): string {
  let sanitized = documentHtml.replace(/<base\b[^>]*>/gi, '');

  sanitized = sanitized.replace(/<script\b([^>]*)\bsrc=(['"])([^'"]+)\2([^>]*)>\s*<\/script>/gi, (fullTag, beforeSrc, quote, src, afterSrc) => {
    return shouldStripEmbeddedScriptSource(src, hostOrigin) ? '' : fullTag;
  });

  sanitized = sanitized.replace(/<link\b[^>]*\brel=(['"])(?:modulepreload|preload)\1[^>]*\bhref=(['"])([^'"]+)\2[^>]*>/gi, (fullTag, _relQuote, _hrefQuote, href) => {
    return shouldStripEmbeddedScriptSource(href, hostOrigin) ? '' : fullTag;
  });

  return sanitized;
}

function shouldStripEmbeddedScriptSource(source: string, hostOrigin: string): boolean {
  const rawSource = String(source || '').trim();
  if (!rawSource || /^(data:|blob:)/i.test(rawSource)) {
    return false;
  }

  const looksLikeJavaScriptAsset = /\.(?:m?js)(?:[?#]|$)/i.test(rawSource);
  const looksLikeAngularBundle = /(^|\/)(?:main|polyfills|runtime|scripts|chunk-[^/]+)\.(?:m?js)(?:[?#]|$)/i.test(rawSource);
  if (!looksLikeJavaScriptAsset && !looksLikeAngularBundle) {
    return false;
  }

  if (/^(?:\/|\.\/|\.\.\/)/.test(rawSource)) {
    return true;
  }

  if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:/i.test(rawSource)) {
    return true;
  }

  try {
    const parsed = new URL(rawSource, hostOrigin || 'https://lesson.local/');
    return !!hostOrigin && parsed.origin === hostOrigin;
  } catch {
    return true;
  }
}

function looksLikeFullHtmlDocument(contentHtml: string): boolean {
  return /^\s*(<!doctype html\b|<html\b|<head\b|<body\b)/i.test(contentHtml || '');
}

function injectIntoHead(documentHtml: string, headContent: string): string {
  if (/<\/head>/i.test(documentHtml)) {
    return documentHtml.replace(/<\/head>/i, `${headContent}\n  </head>`);
  }

  return documentHtml;
}

function injectBeforeBodyEnd(documentHtml: string, bodyContent: string): string {
  if (/<\/body>/i.test(documentHtml)) {
    return documentHtml.replace(/<\/body>/i, `${bodyContent}\n  </body>`);
  }

  return `${documentHtml}${bodyContent}`;
}

function buildResizeScript(frameId: string, hostOrigin: string): string {
  return `<script>
    (function() {
      const frameId = ${JSON.stringify(frameId)};
      const hostOrigin = ${JSON.stringify(hostOrigin)};

      function isExternalHref(href) {
        return /^(https?:)?\/\//i.test(href) || /^(mailto:|tel:)/i.test(href);
      }

      function isInternalLessonHref(href) {
        if (!href || /^javascript:/i.test(href)) {
          return false;
        }

        if (href.startsWith('#')) {
          return true;
        }

        if (!/^([a-zA-Z][a-zA-Z\d+\-.]*:)?\/\//i.test(href) && !/^(mailto:|tel:)/i.test(href)) {
          return true;
        }

        try {
          const parsed = new URL(href, hostOrigin || 'https://lesson.local');
          return !!parsed.hash && (!!hostOrigin && parsed.origin === hostOrigin);
        } catch {
          return false;
        }
      }

      function findAnchorTarget(hash) {
        const anchorId = decodeURIComponent(String(hash || '').replace(/^#/, ''));
        if (!anchorId) {
          return null;
        }

        return document.getElementById(anchorId)
          || document.querySelector('[name="' + CSS.escape(anchorId) + '"]');
      }

      function handleLinkClick(event) {
        const link = event.target && event.target.closest ? event.target.closest('a[href]') : null;
        if (!link) {
          return;
        }

        const href = String(link.getAttribute('href') || '').trim();
        if (!href || /^javascript:/i.test(href)) {
          return;
        }

        if (isExternalHref(href) && !isInternalLessonHref(href)) {
          link.setAttribute('target', '_blank');
          link.setAttribute('rel', 'noopener noreferrer');
          return;
        }

        let hash = '';
        if (href.startsWith('#')) {
          hash = href;
        } else {
          try {
            const url = new URL(href, hostOrigin || 'https://lesson.local/');
            hash = url.hash || '';
          } catch {
            hash = '';
          }
        }

        if (hash) {
          const target = findAnchorTarget(hash);
          if (target) {
            event.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            if (window.history && window.history.replaceState) {
              window.history.replaceState(null, '', hash);
            }
            window.setTimeout(sendHeight, 160);
            return;
          }
        }

        if (!isExternalHref(href)) {
          event.preventDefault();
        }
      }

      function sendHeight() {
        const html = document.documentElement;
        const body = document.body;

        // Scan direct body children to capture tallest grid/flex column
        let maxChildBottom = 0;
        try {
          const kids = body ? body.children : null;
          if (kids) {
            for (let i = 0; i < kids.length; i++) {
              const r = kids[i].getBoundingClientRect();
              const bottom = r.bottom + (window.scrollY || window.pageYOffset || 0);
              if (bottom > maxChildBottom) maxChildBottom = bottom;
            }
          }
        } catch(e) {}

        const height = Math.max(
          html ? html.scrollHeight : 0,
          html ? html.offsetHeight : 0,
          body ? body.scrollHeight : 0,
          body ? body.offsetHeight : 0,
          maxChildBottom,
          320
        );

        window.parent.postMessage({
          type: 'lesson-frame-height',
          frameId,
          height
        }, '*');
      }

      document.addEventListener('click', handleLinkClick);
      window.addEventListener('load', sendHeight);
      window.addEventListener('resize', sendHeight);

      if (window.ResizeObserver) {
        const observer = new ResizeObserver(sendHeight);
        if (document.documentElement) observer.observe(document.documentElement);
        if (document.body) observer.observe(document.body);
      }

      window.setTimeout(sendHeight, 0);
      window.setTimeout(sendHeight, 120);
      window.setTimeout(sendHeight, 400);
    })();
  </script>`;
}

function toPreviewUrl(url: string): string {
  const youtube = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^?&/]+)/i);
  if (youtube?.[1]) {
    return `https://www.youtube.com/embed/${youtube[1]}?rel=0&modestbranding=1`;
  }

  const vimeo = url.match(/(?:vimeo\.com\/(\d+)|player\.vimeo\.com\/video\/(\d+))/i);
  const vimeoId = vimeo?.[1] || vimeo?.[2];
  if (vimeoId) {
    return `https://player.vimeo.com/video/${vimeoId}`;
  }

  return url;
}

function isDirectVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(url || '');
}

function isFirebaseStorageVideoUrl(url: string): boolean {
  return /firebasestorage\.(app|googleapis\.com)/i.test(url || '') || /storage\.googleapis\.com/i.test(url || '');
}