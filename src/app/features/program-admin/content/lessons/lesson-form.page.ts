import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { Storage, getDownloadURL, ref, uploadBytes } from '@angular/fire/storage';
import { ProgramLessonsAdminService } from '../services/program-lessons-admin.service';
import { ProgramModulesAdminService } from '../services/program-modules-admin.service';
import { ContentStatus, LessonType, ProgramContentModule } from '../models/content-builder.models';
import { LessonPresentationComponent } from '../../../../shared/components/lesson-presentation/lesson-presentation.component';
import { AiContentStudioComponent } from '../ai/ai-content-studio.component';
import { AiContentDomain, AiContentLocale } from '../ai/ai-content.models';
import { OrgContextService } from '../../../../core/organization/org-context.service';

@Component({
  selector: 'app-lesson-form-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, LessonPresentationComponent, AiContentStudioComponent],
  template: `
    <section class="form-page">
      <header class="form-header">
        <a [routerLink]="['/program-admin/programs', programId, 'lessons']" class="back-link">← Lessons</a>
        <h1>{{ isEditMode ? 'Edit Lesson' : 'New Lesson' }}</h1>
      </header>

      <form class="form-card" [formGroup]="form" (ngSubmit)="onSubmit()">
        <div class="form-grid">
          <div class="field">
            <label>Module *</label>
            <select formControlName="moduleId">
              <option value="">— Select Module —</option>
              <option *ngFor="let m of modules" [value]="m.id">{{ m.title }}</option>
            </select>
          </div>
          <div class="field">
            <label>Lesson Type *</label>
            <select formControlName="lessonType">
              <option value="VIDEO">Video</option>
              <option value="TEXT">Text</option>
              <option value="DOCUMENT">Document</option>
              <option value="MIXED">Mixed</option>
              <option value="WEB">Web Page</option>
            </select>
          </div>
          <div class="field">
            <label>Title *</label>
            <input type="text" formControlName="title" placeholder="Lesson title" />
          </div>
          <div class="field">
            <label>Slug</label>
            <input type="text" formControlName="slug" placeholder="lesson-slug" />
          </div>
          <div class="field full">
            <label>Description</label>
            <textarea formControlName="description" rows="2" placeholder="Brief description"></textarea>
          </div>
          <div class="field full" *ngIf="showVideoUrl">
            <label>Video URL *</label>
            <input type="text" formControlName="videoUrl" placeholder="https://..." />
            <div class="field-hint">Accepted: YouTube, Vimeo, or direct MP4/WebM/Ogg links.</div>
            <div class="field-actions">
              <label class="upload-btn" [class.is-busy]="uploadingVideo">
                <input type="file" accept="video/mp4,video/webm,video/ogg,video/*" (change)="onVideoSelected($event)" [disabled]="uploadingVideo" />
                {{ uploadingVideo ? 'Uploading…' : 'Upload Video' }}
              </label>
              <button type="button" class="btn-clear-video" *ngIf="form.value.videoUrl" (click)="clearVideoUrl()">Clear</button>
            </div>
            <div class="field-hint" *ngIf="videoSourceLabel">Detected source: {{ videoSourceLabel }}</div>
            <div class="video-preview" *ngIf="videoPreviewUrl">
              <ng-container *ngIf="isDirectVideoPreview; else embeddedPreview">
                <video class="video-preview__media" [src]="videoPreviewUrl" controls playsinline preload="metadata"></video>
              </ng-container>
              <ng-template #embeddedPreview>
                <iframe class="video-preview__media" [src]="safeVideoPreviewUrl()" allowfullscreen></iframe>
              </ng-template>
            </div>
            <p class="error-msg inline" *ngIf="videoUrlRequired">Video URL is required for Video or Mixed lessons.</p>
            <p class="error-msg inline" *ngIf="videoUrlInvalid">Enter a valid YouTube, Vimeo, or direct video file URL.</p>
            <p class="error-msg inline" *ngIf="uploadError">{{ uploadError }}</p>
          </div>
          <div class="field full lesson-content-studio">
            <div class="lesson-content-studio__editor">
              <label>Content HTML</label>
              <!-- AI action buttons -->
              <div class="lesson-content-actions lesson-ai-actions">
                <button type="button" class="btn-ai" (click)="openAiStudio('generateLesson')">
                  <span aria-hidden="true">✦</span> Generate with AI
                </button>
                <button type="button" class="btn-ai btn-ai--secondary" (click)="openAiStudio('improveHtml')">
                  ✏️ Improve HTML
                </button>
                <button type="button" class="btn-ai btn-ai--secondary" (click)="openAiStudio('generateQuiz')">
                  🧩 Generate Quiz
                </button>
                <button type="button" class="btn-ai btn-ai--secondary" (click)="openAiStudio('translate')">
                  🌐 Translate
                </button>
                <button type="button" class="btn-ai btn-ai--secondary" (click)="openAiStudio('summarize')">
                  📋 Summarize
                </button>
                <button type="button" class="btn-ai btn-ai--secondary" (click)="openAiStudio('createObjectives')">
                  🎯 Learning Objectives
                </button>
              </div>
              <div class="lesson-content-actions" *ngIf="isWebLesson">
                <button type="button" class="btn-template" (click)="insertWebStarterTemplate()">Insert Web Starter</button>
                <button type="button" class="btn-template btn-template--accent" (click)="insertNgnDemoTemplate()">Insert NGN Demo</button>
              </div>
              <textarea formControlName="contentHtml" rows="14" placeholder="Lesson HTML content"></textarea>
              <div class="field-hint">
                The preview below uses the same renderer as the learner lesson page.
                @if (isWebLesson) {
                  Web lessons accept a full HTML document, including head, CSS, and JavaScript.
                } @else {
                  Standard lessons support rich HTML/CSS authored for the course body.
                }
              </div>
            </div>
            <div class="lesson-content-studio__preview">
              <div class="lesson-content-studio__preview-label">Learner Preview</div>
              <app-lesson-presentation
                [title]="previewTitle"
                [description]="previewDescription"
                [lessonType]="previewLessonType"
                [contentHtml]="previewContentHtml"
                [videoUrl]="previewVideoUrl"
                [durationMin]="previewDurationMin"
                [isPreview]="previewIsPreview"
                [previewMode]="true"
              />
            </div>
          </div>
          <div class="field">
            <label>Duration (minutes)</label>
            <input type="number" formControlName="durationMin" min="0" />
          </div>
          <div class="field">
            <label>Order</label>
            <input type="number" formControlName="order" min="0" />
          </div>
          <div class="field">
            <label>Status</label>
            <select formControlName="status">
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
          <div class="field checkboxes">
            <label class="checkbox-label">
              <input type="checkbox" formControlName="isPreview" /> Preview
            </label>
            <label class="checkbox-label">
              <input type="checkbox" formControlName="downloadable" /> Downloadable
            </label>
            <label class="checkbox-label">
              <input type="checkbox" formControlName="active" /> Active
            </label>
          </div>
        </div>

        <div class="form-actions">
          <a [routerLink]="['/program-admin/programs', programId, 'lessons']" class="btn-cancel">Cancel</a>
          <button type="submit" class="btn-save" [disabled]="form.invalid || saving">
            {{ saving ? 'Saving…' : (isEditMode ? 'Update Lesson' : 'Create Lesson') }}
          </button>
        </div>
        <p class="error-msg" *ngIf="error">{{ error }}</p>
      </form>
    </section>

    <!-- AI Content Studio drawer -->
    <app-ai-content-studio
      *ngIf="studioOpen()"
      [orgId]="orgId"
      [programId]="programId"
      [moduleId]="form.value.moduleId || ''"
      [lessonId]="lessonId || ''"
      [currentTitle]="previewTitle"
      [currentDescription]="previewDescription"
      [currentContentHtml]="previewContentHtml"
      [domain]="aiDomain"
      [locale]="aiLocale"
      (generatedHtmlSelected)="onAiHtmlSelected($event)"
      (studioClose)="studioOpen.set(false)"
    />
  `,
  styles: [`
    .form-page { display: grid; gap: 1rem; }
    .form-header { background: #fff; border: 1px solid #d4e2f0; border-radius: 1rem; padding: 1.2rem 1.4rem; }
    .back-link { color: #1a74c8; text-decoration: none; font-size: 0.85rem; font-weight: 600; }
    h1 { margin: 0.25rem 0; color: #0f3659; }
    .form-card { background: #fff; border: 1px solid #d9e5f2; border-radius: 1rem; padding: 1.5rem; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .field { display: flex; flex-direction: column; gap: 0.35rem; }
    .field.full { grid-column: 1 / -1; }
    label { font-size: 0.82rem; font-weight: 600; color: #4f7097; }
    input[type="text"], input[type="number"], textarea, select { padding: 0.55rem 0.75rem; border: 1px solid #c8dff7; border-radius: 0.55rem; font-size: 0.9rem; color: #1e3a5a; outline: none; width: 100%; box-sizing: border-box; }
    input:focus, textarea:focus, select:focus { border-color: #1a74c8; }
    textarea { resize: vertical; }
    .field-hint { color: #6b8aaa; font-size: 0.78rem; }
    .lesson-content-studio { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 1rem; align-items: start; }
    .lesson-content-studio__editor,
    .lesson-content-studio__preview { display: grid; gap: 0.45rem; }
    .lesson-content-studio__preview-label { color: #4f7097; font-size: 0.82rem; font-weight: 700; }
    .lesson-content-actions { display: flex; gap: 0.55rem; flex-wrap: wrap; }
    .btn-template {
      min-height: 34px; padding: 0 0.85rem; border-radius: 0.6rem; border: 1px solid #bfdbfe;
      background: #eff6ff; color: #1a74c8; font-size: 0.8rem; font-weight: 700; cursor: pointer;
    }
    .btn-template--accent { background: linear-gradient(135deg, #0f3659, #1a74c8); color: #fff; border-color: transparent; }
    /* AI action buttons */
    .lesson-ai-actions { margin-bottom: 6px; }
    .btn-ai {
      min-height: 34px; padding: 0 0.9rem; border-radius: 0.65rem; border: none;
      background: linear-gradient(135deg, #0f3659, #1a74c8); color: #fff;
      font-size: 0.8rem; font-weight: 700; cursor: pointer;
      box-shadow: 0 3px 10px rgba(26,116,200,.28); transition: opacity 0.15s, transform 0.15s;
    }
    .btn-ai:hover { opacity: .9; transform: translateY(-1px); }
    .btn-ai--secondary {
      background: #eff6ff; color: #1a74c8; border: 1px solid #bfdbfe; box-shadow: none;
    }
    .btn-ai--secondary:hover { background: #dbeafe; transform: translateY(-1px); }
    .field-actions { display: flex; gap: 0.65rem; align-items: center; flex-wrap: wrap; margin-top: 0.2rem; }
    .upload-btn {
      display: inline-flex; align-items: center; justify-content: center; min-height: 38px; padding: 0 1rem;
      border-radius: 0.65rem; background: #eff6ff; color: #1a74c8; font-size: 0.84rem; font-weight: 700; cursor: pointer;
      border: 1px solid #bfdbfe;
    }
    .upload-btn.is-busy { opacity: 0.7; cursor: wait; }
    .upload-btn input { display: none; }
    .btn-clear-video {
      min-height: 38px; padding: 0 1rem; border-radius: 0.65rem; border: 1px solid #d9e5f2;
      background: #fff; color: #4f7097; font-size: 0.84rem; font-weight: 700; cursor: pointer;
    }
    .video-preview {
      margin-top: 0.45rem; border-radius: 0.9rem; overflow: hidden; border: 1px solid #d9e5f2;
      background: linear-gradient(135deg, #0f3659, #1a74c8); aspect-ratio: 16 / 9;
    }
    .video-preview__media { width: 100%; height: 100%; border: 0; display: block; background: #000; }
    .checkboxes { flex-direction: row; align-items: center; gap: 1rem; padding-top: 1.4rem; flex-wrap: wrap; }
    .checkbox-label { display: flex; align-items: center; gap: 0.35rem; font-size: 0.88rem; color: #1e3a5a; cursor: pointer; }
    .form-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #e8f0fb; }
    .btn-cancel { padding: 0.5rem 1rem; border-radius: 0.55rem; text-decoration: none; font-size: 0.88rem; font-weight: 600; background: #f1f5fb; color: #4f7097; }
    .btn-save { padding: 0.55rem 1.4rem; border-radius: 0.65rem; border: none; cursor: pointer; font-size: 0.9rem; font-weight: 700; background: linear-gradient(135deg, #0f3659, #1a74c8); color: #fff; }
    .btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
    .error-msg { color: #b91c1c; font-size: 0.85rem; margin-top: 0.5rem; }
    .error-msg.inline { margin-top: 0; }

    @media (max-width: 1120px) {
      .lesson-content-studio { grid-template-columns: 1fr; }
    }
  `],
})
export class LessonFormPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly storage = inject(Storage);
  private readonly lessonsService = inject(ProgramLessonsAdminService);
  private readonly modulesService = inject(ProgramModulesAdminService);
  private readonly orgCtx = inject(OrgContextService);

  programId = '';
  orgId = '';
  lessonId: string | null = null;
  isEditMode = false;
  saving = false;
  uploadingVideo = false;
  error = '';
  uploadError = '';
  modules: ProgramContentModule[] = [];

  /* ── AI Content Studio state ── */
  readonly studioOpen = signal(false);
  readonly studioInitialAction = signal<import('../ai/ai-content.models').AiContentAction>('generateLesson');
  readonly aiDomain: AiContentDomain = 'general';
  readonly aiLocale: AiContentLocale = 'en';

  readonly form = this.fb.group({
    moduleId: ['', Validators.required],
    title: ['', Validators.required],
    slug: [''],
    description: [''],
    lessonType: [LessonType.VIDEO, Validators.required],
    contentHtml: [''],
    videoUrl: ['', videoUrlValidator()],
    durationMin: [0],
    order: [0],
    isPreview: [false],
    downloadable: [false],
    active: [true],
    status: [ContentStatus.DRAFT],
  });

  get showVideoUrl(): boolean {
    const t = this.form.get('lessonType')?.value;
    return t === LessonType.VIDEO || t === LessonType.MIXED;
  }

  get isWebLesson(): boolean {
    return this.form.get('lessonType')?.value === LessonType.WEB;
  }

  get videoUrlInvalid(): boolean {
    const control = this.form.get('videoUrl');
    return !!control && control.touched && control.hasError('invalidVideoUrl');
  }

  get videoUrlRequired(): boolean {
    const control = this.form.get('videoUrl');
    return !!control && control.touched && control.hasError('requiredVideoUrl');
  }

  get videoSourceLabel(): string {
    const rawUrl = String(this.form.get('videoUrl')?.value || '').trim();
    if (!rawUrl) {
      return '';
    }
    if (isYouTubeUrl(rawUrl)) {
      return 'YouTube';
    }
    if (isVimeoUrl(rawUrl)) {
      return 'Vimeo';
    }
    if (isDirectVideoUrl(rawUrl)) {
      return 'Direct video file';
    }
    if (rawUrl.includes('firebasestorage')) {
      return 'Firebase Storage';
    }
    return 'External video';
  }

  get videoPreviewUrl(): string {
    const rawUrl = String(this.form.get('videoUrl')?.value || '').trim();
    if (!rawUrl || !isSupportedVideoUrl(rawUrl)) {
      return '';
    }
    return toPreviewUrl(rawUrl);
  }

  get isDirectVideoPreview(): boolean {
    const rawUrl = String(this.form.get('videoUrl')?.value || '').trim();
    return !!rawUrl && (isDirectVideoUrl(rawUrl) || isFirebaseStorageVideoUrl(rawUrl));
  }

  get previewTitle(): string {
    return String(this.form.controls.title.value || '').trim();
  }

  get previewDescription(): string {
    return String(this.form.controls.description.value || '').trim();
  }

  get previewLessonType(): string {
    return String(this.form.controls.lessonType.value || '').trim();
  }

  get previewContentHtml(): string {
    return String(this.form.controls.contentHtml.value || '');
  }

  get previewVideoUrl(): string {
    return String(this.form.controls.videoUrl.value || '').trim();
  }

  get previewDurationMin(): number {
    return Number(this.form.controls.durationMin.value || 0);
  }

  get previewIsPreview(): boolean {
    return !!this.form.controls.isPreview.value;
  }

  safeVideoPreviewUrl() {
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.videoPreviewUrl);
  }

  ngOnInit(): void {
    this.programId = this.getRequiredProgramId();
    this.lessonId = this.route.snapshot.params['lessonId'] ?? null;
    this.isEditMode = !!this.lessonId;

    // Resolve orgId from the active org context (the route has no :orgId param)
    this.orgCtx.context$.subscribe((ctx) => {
      if (ctx.activeOrgId) this.orgId = ctx.activeOrgId;
    });

    this.modulesService.getModules(this.programId).subscribe((m) => (this.modules = m));
    this.form.controls.lessonType.valueChanges.subscribe(() => {
      this.form.controls.videoUrl.updateValueAndValidity();
    });

    if (this.isEditMode && this.lessonId) {
      this.lessonsService.getLessonById(this.programId, this.lessonId).subscribe((lesson) => {
        if (!lesson) return;
        this.form.patchValue({
          moduleId: lesson.moduleId,
          title: lesson.title,
          slug: lesson.slug,
          description: lesson.description,
          lessonType: lesson.lessonType,
          contentHtml: lesson.contentHtml,
          videoUrl: lesson.videoUrl ?? '',
          durationMin: lesson.durationMin,
          order: lesson.order,
          isPreview: lesson.isPreview,
          downloadable: lesson.downloadable,
          active: lesson.active,
          status: lesson.status,
        });
      });
    }
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;
    this.saving = true;
    this.error = '';
    try {
      const raw = this.form.getRawValue();
      const payload = {
        programId: this.programId,
        moduleId: raw.moduleId ?? '',
        title: raw.title ?? '',
        slug: raw.slug ?? '',
        description: raw.description ?? '',
        lessonType: raw.lessonType as LessonType,
        contentHtml: raw.contentHtml ?? '',
        videoUrl: raw.videoUrl ?? '',
        durationMin: raw.durationMin ?? 0,
        order: raw.order ?? 0,
        isPreview: raw.isPreview ?? false,
        downloadable: raw.downloadable ?? false,
        active: raw.active ?? true,
        status: raw.status as ContentStatus,
      };
      if (this.isEditMode && this.lessonId) {
        await this.lessonsService.updateLesson(this.programId, this.lessonId, payload);
      } else {
        await this.lessonsService.createLesson(this.programId, payload);
      }
      await this.router.navigate(['/program-admin/programs', this.programId, 'lessons']);
    } catch (e: unknown) {
      this.error = e instanceof Error ? e.message : 'An error occurred';
    } finally {
      this.saving = false;
    }
  }

  async onVideoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('video/')) {
      this.uploadError = 'Please select a valid video file.';
      input!.value = '';
      return;
    }

    this.uploadingVideo = true;
    this.uploadError = '';
    try {
      const moduleId = String(this.form.controls.moduleId.value || 'unassigned');
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-');
      const path = `programLessons/${this.programId}/${moduleId}/${Date.now()}-${safeName}`;
      const storageRef = ref(this.storage, path);
      await uploadBytes(storageRef, file, { contentType: file.type });
      const downloadUrl = await getDownloadURL(storageRef);
      this.form.controls.videoUrl.setValue(downloadUrl);
      this.form.controls.videoUrl.markAsTouched();
      this.form.controls.videoUrl.updateValueAndValidity();
    } catch (error: unknown) {
      this.uploadError = error instanceof Error ? error.message : 'Video upload failed.';
    } finally {
      this.uploadingVideo = false;
      if (input) {
        input.value = '';
      }
    }
  }

  clearVideoUrl(): void {
    this.form.controls.videoUrl.setValue('');
    this.form.controls.videoUrl.markAsTouched();
    this.form.controls.videoUrl.updateValueAndValidity();
    this.uploadError = '';
  }

  insertWebStarterTemplate(): void {
    this.form.controls.contentHtml.setValue(buildWebStarterTemplate({
      title: this.previewTitle || 'Lesson title',
      description: this.previewDescription || 'Use this starter to build a complete lesson web page.',
    }));
    this.form.controls.contentHtml.markAsDirty();
  }

  insertNgnDemoTemplate(): void {
    this.form.controls.contentHtml.setValue(buildNgnDemoTemplate({
      title: this.previewTitle || 'All About New Generation NCLEX',
      description: this.previewDescription || 'Premium LMS lesson page for NGN orientation and clinical judgment practice.',
    }));
    this.form.controls.contentHtml.markAsDirty();
  }

  openAiStudio(action: import('../ai/ai-content.models').AiContentAction): void {
    this.studioInitialAction.set(action);
    this.studioOpen.set(true);
  }

  onAiHtmlSelected(html: string): void {
    this.form.controls.contentHtml.setValue(html);
    this.form.controls.contentHtml.markAsDirty();
    this.studioOpen.set(false);
  }

  private getRequiredProgramId(): string {
    const programId = this.route.snapshot.pathFromRoot
      .map((routeSnapshot) => routeSnapshot.paramMap.get('programId'))
      .find((value): value is string => !!value?.trim());

    if (!programId) {
      throw new Error('Missing programId in route. Open this page from a specific program.');
    }

    return programId;
  }
}

function videoUrlValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const url = String(control.value || '').trim();
    const lessonType = String(control.parent?.get('lessonType')?.value || '');
    const requiresVideo = lessonType === LessonType.VIDEO || lessonType === LessonType.MIXED;

    if (!url) {
      return requiresVideo ? { requiredVideoUrl: true } : null;
    }
    return isSupportedVideoUrl(url) ? null : { invalidVideoUrl: true };
  };
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

function isSupportedVideoUrl(url: string): boolean {
  return isYouTubeUrl(url) || isVimeoUrl(url) || isDirectVideoUrl(url) || isFirebaseStorageVideoUrl(url);
}

function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)/i.test(url);
}

function isVimeoUrl(url: string): boolean {
  return /vimeo\.com\/(\d+)/i.test(url) || /player\.vimeo\.com\/video\/(\d+)/i.test(url);
}

function isDirectVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(url);
}

function isFirebaseStorageVideoUrl(url: string): boolean {
  return /firebasestorage\.(app|googleapis\.com)/i.test(url) || /storage\.googleapis\.com/i.test(url);
}

function buildWebStarterTemplate(input: { title: string; description: string }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(input.title)}</title>
  <style>
    :root {
      --brand: #1a74c8;
      --brand-dark: #0f3659;
      --surface: #ffffff;
      --surface-soft: #f4f8fc;
      --text: #18324d;
      --muted: #607d99;
      --line: #d7e4f2;
      --radius: 20px;
    }

    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      font-family: Inter, "Segoe UI", Arial, sans-serif;
      color: var(--text);
      background: linear-gradient(180deg, #f8fbff 0%, #eef5fb 100%);
    }

    .container {
      width: min(1120px, calc(100% - 2rem));
      margin: 0 auto;
    }

    .topbar {
      position: sticky;
      top: 0;
      z-index: 10;
      backdrop-filter: blur(14px);
      background: rgba(255, 255, 255, .82);
      border-bottom: 1px solid rgba(26, 116, 200, .08);
    }

    .topbar__inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 0;
    }

    .brand {
      font-weight: 800;
      color: var(--brand);
      letter-spacing: .04em;
      text-transform: uppercase;
      font-size: .85rem;
    }

    .nav {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .nav a {
      color: var(--muted);
      text-decoration: none;
      font-weight: 700;
      font-size: .92rem;
    }

    .hero {
      padding: 2rem 0 1rem;
    }

    .hero__panel {
      border-radius: 32px;
      padding: 2rem;
      color: #fff;
      background: linear-gradient(135deg, #0f3659 0%, #1a74c8 100%);
      box-shadow: 0 30px 70px rgba(15, 54, 89, .2);
    }

    .hero h1 {
      margin: 0 0 1rem;
      font-size: clamp(2rem, 4vw, 3.6rem);
      line-height: 1.05;
    }

    .hero p {
      margin: 0;
      max-width: 760px;
      color: rgba(255,255,255,.86);
      line-height: 1.8;
      font-size: 1rem;
    }

    .section {
      padding: 1rem 0;
    }

    .card {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      padding: 1.5rem;
      box-shadow: 0 18px 36px rgba(15, 52, 96, .06);
    }

    .kicker {
      margin: 0 0 .55rem;
      color: var(--brand);
      font-size: .75rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: .14em;
    }

    .grid {
      display: grid;
      grid-template-columns: 1.3fr .9fr;
      gap: 1rem;
    }

    .pill-row {
      display: flex;
      gap: .6rem;
      flex-wrap: wrap;
      margin-top: 1rem;
    }

    .pill {
      display: inline-flex;
      align-items: center;
      min-height: 34px;
      padding: 0 .85rem;
      border-radius: 999px;
      background: #e8f4ff;
      color: var(--brand);
      font-size: .84rem;
      font-weight: 700;
    }

    .stats {
      display: grid;
      gap: .8rem;
    }

    .stat {
      border-radius: 18px;
      padding: 1rem;
      background: var(--surface-soft);
      border: 1px solid var(--line);
    }

    .stat strong {
      display: block;
      font-size: 1.6rem;
      color: var(--brand-dark);
    }

    .stat span {
      color: var(--muted);
      font-size: .88rem;
    }

    @media (max-width: 920px) {
      .grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <header class="topbar">
    <div class="container topbar__inner">
      <div class="brand">Innovacare LMS</div>
      <nav class="nav">
        <a href="#overview">Overview</a>
        <a href="#lesson">Lesson</a>
        <a href="#resources">Resources</a>
      </nav>
    </div>
  </header>

  <main class="container">
    <section class="hero" id="overview">
      <div class="hero__panel">
        <p class="kicker" style="color:#9fd8ff;">Web Lesson</p>
        <h1>${escapeHtml(input.title)}</h1>
        <p>${escapeHtml(input.description)}</p>
        <div class="pill-row">
          <span class="pill">HTML</span>
          <span class="pill">CSS</span>
          <span class="pill">JavaScript</span>
        </div>
      </div>
    </section>

    <section class="section grid" id="lesson">
      <article class="card">
        <p class="kicker">Lesson Body</p>
        <h2>Replace this with your own complete page content</h2>
        <p style="line-height:1.8; color:var(--muted);">
          This starter accepts a full web page document. You can add navigation, hero sections, accordions,
          charts, Bootstrap, custom JavaScript, or any other interactive lesson experience.
        </p>
      </article>

      <aside class="stats">
        <div class="stat"><strong>6</strong><span>Suggested sections</span></div>
        <div class="stat"><strong>75%</strong><span>Target readiness threshold</span></div>
        <div class="stat"><strong>WEB</strong><span>Lesson renderer mode</span></div>
      </aside>
    </section>

    <section class="section" id="resources">
      <div class="card">
        <p class="kicker">Resources</p>
        <p style="margin:0; color:var(--muted); line-height:1.8;">
          Add links, downloads, worksheets, embedded tools, or instructor prompts here.
        </p>
      </div>
    </section>
  </main>
</body>
</html>`;
}

function buildNgnDemoTemplate(input: { title: string; description: string }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(input.title)}</title>
  <meta name="description" content="${escapeHtml(input.description)}" />
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css" rel="stylesheet">
  <style>
    :root{
      --brand:#53b6ff;
      --brand-2:#0d6efd;
      --brand-dark:#0b1f36;
      --bg-soft:#f4f8fc;
      --card-shadow:0 20px 45px rgba(15,52,96,.08);
      --radius:1.25rem;
    }
    html{scroll-behavior:smooth;}
    body{
      background:
        radial-gradient(circle at top right, rgba(83,182,255,.18), transparent 24rem),
        linear-gradient(180deg, #f7fbff 0%, #eef5fb 100%);
      color:#1c2d3f;
      font-family: Inter, "Segoe UI", Roboto, Arial, sans-serif;
    }
    .navbar-blur{backdrop-filter: blur(14px);background: rgba(255,255,255,.72);border-bottom:1px solid rgba(13,110,253,.08);}
    .hero-wrap{position:relative;overflow:hidden;border-radius:2rem;background:linear-gradient(120deg,#0b1f36 0%,#103a67 42%,#1f6dc6 100%);color:#fff;box-shadow:0 30px 70px rgba(6, 34, 64, .2);}
    .hero-slide{min-height:420px;position:relative;z-index:1;}
    .soft-card{background:rgba(255,255,255,.92);border:1px solid rgba(13,110,253,.08);border-radius:var(--radius);box-shadow:var(--card-shadow);}
    .glass-card{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);backdrop-filter: blur(10px);border-radius:1.25rem;}
    .stat-badge{display:inline-flex;align-items:center;gap:.5rem;padding:.5rem .9rem;border-radius:999px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.14);color:#fff;font-size:.92rem;}
    .feature-chip{background:#e8f4ff;color:#0f5fb6;border-radius:999px;padding:.45rem .8rem;font-size:.85rem;font-weight:600;}
    .module-sidebar{position:sticky; top:5.5rem;max-height:calc(100vh - 6.5rem); overflow:auto;}
    .module-sidebar .list-group-item{border:0;background:transparent;border-radius:1rem !important;margin-bottom:.35rem; padding:.8rem .9rem;transition:.2s ease;}
    .module-sidebar .list-group-item:hover,.module-sidebar .list-group-item.active{background:#e9f4ff;color:#0b5ed7;font-weight:700;box-shadow: inset 0 0 0 1px rgba(13,110,253,.12);}
    .lesson-kicker{letter-spacing:.12em;text-transform:uppercase;font-size:.72rem;font-weight:700;color:#53b6ff;}
    .mini-card{border-radius:1.25rem;border:1px solid rgba(13,110,253,.08);background:#fff;box-shadow:0 12px 24px rgba(15,52,96,.05);height:100%;}
    .score-pill{padding:.4rem .7rem;border-radius:999px;background:#eef7ff;color:#0b5ed7;font-weight:700;font-size:.85rem;}
    .module-header-anchor{scroll-margin-top:6rem;}
    @media (max-width: 991.98px){.module-sidebar{position:static; max-height:none;}.hero-slide{min-height:auto;}}
  </style>
</head>
<body>
  <nav class="navbar navbar-expand-lg sticky-top navbar-blur">
    <div class="container-xxl">
      <a class="navbar-brand fw-bold text-primary" href="#">Innovacare LMS</a>
      <div class="collapse navbar-collapse show">
        <ul class="navbar-nav ms-auto align-items-lg-center gap-lg-2">
          <li class="nav-item"><a class="nav-link" href="#overview">Overview</a></li>
          <li class="nav-item"><a class="nav-link" href="#curriculum">Curriculum</a></li>
          <li class="nav-item"><a class="nav-link" href="#assessment">Assessment</a></li>
        </ul>
      </div>
    </div>
  </nav>

  <main class="container-xxl py-4 py-lg-5">
    <section id="overview" class="module-header-anchor mb-4">
      <div class="hero-wrap p-4 p-lg-5">
        <div class="row align-items-center g-4 hero-slide">
          <div class="col-lg-7">
            <div class="lesson-kicker mb-2">Premium NCLEX Module</div>
            <h1 class="display-5 fw-bold mb-3">${escapeHtml(input.title)}</h1>
            <p class="lead text-white-50 mb-4">${escapeHtml(input.description)}</p>
            <div class="d-flex flex-wrap gap-2 mb-4">
              <span class="stat-badge">6 Sections</span>
              <span class="stat-badge">6–8 Hours</span>
              <span class="stat-badge">Clinical Judgment Focus</span>
            </div>
          </div>
          <div class="col-lg-5">
            <div class="glass-card p-4">
              <div class="row g-3">
                <div class="col-6">
                  <div class="soft-card p-3 h-100">
                    <div class="small text-secondary">Completion</div>
                    <div class="fw-bold fs-3 text-primary">68%</div>
                    <div class="small text-secondary">4/6 sections done</div>
                  </div>
                </div>
                <div class="col-6">
                  <div class="soft-card p-3 h-100">
                    <div class="small text-secondary">Quiz Average</div>
                    <div class="fw-bold fs-3 text-primary">84%</div>
                    <div class="small text-secondary">Strong progress</div>
                  </div>
                </div>
                <div class="col-12">
                  <div class="soft-card p-3">
                    <div class="d-flex justify-content-between mb-2">
                      <span class="fw-semibold">Readiness Path</span>
                      <span class="score-pill">On Track</span>
                    </div>
                    <div class="progress" style="height:10px"><div class="progress-bar progress-bar-striped progress-bar-animated" style="width:68%"></div></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="row g-4">
      <aside class="col-lg-3">
        <div class="module-sidebar">
          <div class="soft-card p-3 mb-4">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h2 class="h6 mb-0 fw-bold">Curriculum Map</h2>
              <span class="badge text-bg-primary rounded-pill">6</span>
            </div>
            <div class="list-group">
              <a href="#section-1" class="list-group-item list-group-item-action active">1. Understanding NGN</a>
              <a href="#section-2" class="list-group-item list-group-item-action">2. NCJMM Model</a>
              <a href="#section-3" class="list-group-item list-group-item-action">3. Item Types</a>
              <a href="#section-4" class="list-group-item list-group-item-action">4. Strategy</a>
              <a href="#section-5" class="list-group-item list-group-item-action">5. Case Studies</a>
              <a href="#section-6" class="list-group-item list-group-item-action">6. Final Readiness</a>
            </div>
          </div>
        </div>
      </aside>

      <section class="col-lg-9" id="curriculum">
        <div id="section-1" class="module-header-anchor mb-4">
          <div class="soft-card p-4">
            <div class="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
              <div>
                <div class="lesson-kicker mb-2">Section 1</div>
                <h2 class="fw-bold mb-1">Understanding the New Generation NCLEX</h2>
                <p class="text-secondary mb-0">Foundational overview of NGN, exam structure, and why students struggle with clinical judgment questions.</p>
              </div>
              <span class="score-pill">3 Lessons + Quiz</span>
            </div>

            <div class="row g-3">
              <div class="col-md-6"><div class="mini-card p-3"><strong>Lesson 1.1</strong><div class="small text-secondary mt-2">What Is the New Generation NCLEX?</div></div></div>
              <div class="col-md-6"><div class="mini-card p-3"><strong>Lesson 1.2</strong><div class="small text-secondary mt-2">How the NCLEX-RN Is Structured</div></div></div>
              <div class="col-md-6"><div class="mini-card p-3"><strong>Lesson 1.3</strong><div class="small text-secondary mt-2">Why Students Struggle With NGN</div></div></div>
              <div class="col-md-6"><div class="mini-card p-3"><strong>Quiz</strong><div class="small text-secondary mt-2">5 foundational questions</div></div></div>
            </div>
          </div>
        </div>

        <div id="assessment" class="module-header-anchor mb-4">
          <div class="soft-card p-4">
            <div class="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
              <div>
                <div class="lesson-kicker mb-2">Assessment Zone</div>
                <h2 class="fw-bold mb-1">Final Exam Preview</h2>
                <p class="text-secondary mb-0">This starter is simplified on purpose. Replace it with your full premium web lesson content.</p>
              </div>
              <span class="score-pill">20 Questions</span>
            </div>

            <div class="mini-card p-4">
              <h3 class="h5 fw-bold mb-3">Sample Question</h3>
              <p class="mb-3">The primary purpose of the NGN is to better measure:</p>
              <div class="d-grid gap-2">
                <button class="btn btn-outline-primary text-start">a. Speed reading</button>
                <button class="btn btn-outline-primary text-start">b. Memorization only</button>
                <button class="btn btn-primary text-start">c. Clinical judgment</button>
                <button class="btn btn-outline-primary text-start">d. Math skills</button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </main>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
