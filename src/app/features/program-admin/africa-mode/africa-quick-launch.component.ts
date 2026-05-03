import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Storage, getDownloadURL, ref, uploadBytes } from '@angular/fire/storage';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { of, switchMap } from 'rxjs';
import { AuthService } from '../../../core/auth';
import { StripeConnectService } from '../../../core/stripe-connect.service';
import {
  ProgramCategory,
  ProgramDeliveryMode,
  ProgramLessonType,
  ProgramLevel,
  ProgramModule,
  ProgramModuleLessonSeed,
  ProgramStatus,
} from '../../publics/programs/program.models';
import { ProgramEnrollmentsService } from '../../publics/programs/program-enrollments.service';
import { ProgramsService } from '../../publics/programs/programs.service';

export interface AfricaLesson {
  moduleId: string;
  title: string;
  text: string;
  videoUrl: string;
  imageFile: File | null;
  imageUrl: string | null;
  imagePreviewUrl: string | null;
}

export interface AfricaModule {
  id: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-africa-quick-launch',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, DragDropModule],
  templateUrl: './africa-quick-launch.component.html',
  styleUrls: ['./africa-quick-launch.component.css'],
})
export class AfricaQuickLaunchComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly storage = inject(Storage);
  private readonly authService = inject(AuthService);
  private readonly programsService = inject(ProgramsService);
  private readonly enrollmentsService = inject(ProgramEnrollmentsService);
  private readonly stripeConnectService = inject(StripeConnectService);
  private moduleCounter = 0;

  readonly profile = toSignal(this.authService.profile$, { initialValue: null });
  readonly programs = toSignal(this.programsService.getAdminPrograms(), { initialValue: [] });
  readonly enrollments = toSignal(this.enrollmentsService.getAllEnrollmentsForAdmin(), {
    initialValue: [],
  });
  readonly stripeAccount = toSignal(
    this.authService.profile$.pipe(
      switchMap((profile) => {
        const orgId = String(profile?.orgId || '').trim();
        return orgId ? this.stripeConnectService.watchOrganizationStripeAccount(orgId) : of(null);
      })
    ),
    { initialValue: null }
  );

  readonly wizardOpen = signal(false);
  readonly wizardStep = signal(1);
  readonly creating = signal(false);
  readonly errorMessage = signal('');
  readonly stripeConnectBusy = signal(false);
  readonly stripeConnectError = signal('');
  readonly stripeConnectNotice = signal('');
  readonly isPublished = signal(false);
  readonly publishedProgramId = signal('');
  readonly publishedTitle = signal('');
  readonly generatedLink = signal('');
  readonly shareLink = signal('');
  readonly selectedProgramId = signal('');
  readonly selectedImageFile = signal<File | null>(null);
  readonly imagePreviewUrl = signal<string | null>(null);
  readonly uploadingImage = signal(false);
  readonly isPreviewMode = signal(false);

  modules: AfricaModule[] = [this.emptyModule()];

  // Lesson builder
  lessons: AfricaLesson[] = [this.emptyLesson()];

  readonly latestProgram = computed(() => {
    const items = [...this.programs()];
    if (!items.length) return undefined;
    return items.sort((a, b) => this.toEpoch(b.createdAt) - this.toEpoch(a.createdAt))[0];
  });

  readonly totalCourses = computed(() => this.programs().length);
  readonly totalStudents = computed(() => this.enrollments().length);
  readonly revenuePlaceholder = computed(() => 0);
  readonly stripeStatusLabel = computed(() => {
    const account = this.stripeAccount();
    if (!account?.stripeAccountId) {
      return 'Not connected';
    }
    if (account.stripeChargesEnabled && account.stripePayoutsEnabled) {
      return 'Ready to receive payouts';
    }
    if (account.stripeDetailsSubmitted) {
      return 'Stripe linked, final checks pending';
    }
    return 'Stripe onboarding in progress';
  });

  readonly form = this.fb.group({
    courseTitle: this.fb.nonNullable.control('', [Validators.required]),
    description: this.fb.nonNullable.control(''),
    price: this.fb.nonNullable.control(0, [Validators.required, Validators.min(0)]),
    currency: this.fb.nonNullable.control('USD', [Validators.required]),
  });

  emptyModule(): AfricaModule {
    this.moduleCounter += 1;
    return {
      id: `module-${this.moduleCounter}`,
      title: `Module ${this.moduleCounter}`,
      description: '',
    };
  }

  // ─── Lesson Management ────────────────────────────────────────────────────

  emptyLesson(): AfricaLesson {
    return {
      moduleId: this.modules[0]?.id || 'module-1',
      title: '',
      text: '',
      videoUrl: '',
      imageFile: null,
      imageUrl: null,
      imagePreviewUrl: null,
    };
  }

  addModule(): void {
    const module = this.emptyModule();
    this.modules = [...this.modules, module];
  }

  removeModule(index: number): void {
    if (this.modules.length <= 1) {
      return;
    }

    const removed = this.modules[index];
    const remaining = this.modules.filter((_, currentIndex) => currentIndex !== index);
    const fallbackModuleId = remaining[0]?.id || '';

    this.modules = remaining;
    this.lessons = this.lessons.map((lesson) =>
      lesson.moduleId === removed.id ? { ...lesson, moduleId: fallbackModuleId } : lesson
    );
  }

  addLesson(): void {
    this.lessons = [...this.lessons, this.emptyLesson()];
  }

  removeLesson(index: number): void {
    if (this.lessons.length <= 1) return;
    this.lessons = this.lessons.filter((_, i) => i !== index);
  }

  dropLesson(event: CdkDragDrop<AfricaLesson[]>): void {
    moveItemInArray(this.lessons, event.previousIndex, event.currentIndex);
  }

  onLessonImageSelected(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const updated = [...this.lessons];
    updated[index] = { ...updated[index], imageFile: file, imagePreviewUrl: URL.createObjectURL(file) };
    this.lessons = updated;
  }

  // ─── Preview ─────────────────────────────────────────────────────────────

  togglePreview(): void {
    this.isPreviewMode.update(v => !v);
  }

  getLessonsForModule(moduleId: string): AfricaLesson[] {
    return this.lessons.filter((lesson) => lesson.moduleId === moduleId);
  }

  getModuleTitle(moduleId: string): string {
    return this.modules.find((module) => module.id === moduleId)?.title || 'Unassigned module';
  }

  trackByModuleId(_: number, module: AfricaModule): string {
    return module.id;
  }

  // ─── Image Upload ─────────────────────────────────────────────────────────

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.selectedImageFile.set(file);
    this.imagePreviewUrl.set(URL.createObjectURL(file));
  }

  async uploadImage(): Promise<string | null> {
    const file = this.selectedImageFile();
    if (!file) return null;
    this.uploadingImage.set(true);
    try {
      const path = `program-images/${Date.now()}_${file.name}`;
      const storageRef = ref(this.storage, path);
      await uploadBytes(storageRef, file);
      return await getDownloadURL(storageRef);
    } finally {
      this.uploadingImage.set(false);
    }
  }

  async uploadLessonImage(file: File): Promise<string> {
    const path = `lesson-images/${Date.now()}_${file.name}`;
    const storageRef = ref(this.storage, path);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  }

  // ─── HTML Generation ──────────────────────────────────────────────────────

  generateLessonHTML(lesson: AfricaLesson): string {
    const sanitizedTitle = lesson.title.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const sanitizedText = lesson.text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const videoEmbedUrl = lesson.videoUrl ? this.toEmbedUrl(lesson.videoUrl) : '';
    return `<h2>${sanitizedTitle}</h2>
<p>${sanitizedText}</p>
${videoEmbedUrl ? `<div class="video-wrapper"><iframe src="${videoEmbedUrl}" frameborder="0" allowfullscreen style="width:100%;aspect-ratio:16/9;border-radius:0.5rem;"></iframe></div>` : ''}
${lesson.imageUrl ? `<img src="${lesson.imageUrl}" alt="${sanitizedTitle}" style="max-width:100%;border-radius:0.5rem;margin-top:0.5rem;" />` : ''}`;
  }

  private toEmbedUrl(url: string): string {
    try {
      const u = new URL(url);
      if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
        const videoId = u.searchParams.get('v') || u.pathname.split('/').pop() || '';
        return `https://www.youtube.com/embed/${videoId}`;
      }
      if (u.hostname.includes('vimeo.com')) {
        const id = u.pathname.split('/').pop() || '';
        return `https://player.vimeo.com/video/${id}`;
      }
      return url;
    } catch {
      return url;
    }
  }

  // ─── Wizard Navigation ────────────────────────────────────────────────────

  openWizard(): void {
    this.errorMessage.set('');
    this.isPublished.set(false);
    this.selectedImageFile.set(null);
    this.imagePreviewUrl.set(null);
    this.isPreviewMode.set(false);
    this.lessons = [this.emptyLesson()];
    this.wizardStep.set(1);
    this.wizardOpen.set(true);
  }

  closeWizard(): void {
    if (this.creating()) return;
    this.wizardOpen.set(false);
    this.wizardStep.set(1);
  }

  nextStep(): void {
    if (this.wizardStep() === 1 && this.form.controls.courseTitle.invalid) {
      this.form.controls.courseTitle.markAsTouched();
      return;
    }
    if (this.wizardStep() === 2) {
      this.form.controls.price.markAsTouched();
      this.form.controls.currency.markAsTouched();
      if (this.form.controls.price.invalid || this.form.controls.currency.invalid) return;
    }
    if (this.wizardStep() === 3 && !this.validateStructure()) {
      return;
    }
    this.isPreviewMode.set(false);
    this.wizardStep.update((v) => Math.min(4, v + 1));
  }

  previousStep(): void {
    this.isPreviewMode.set(false);
    this.wizardStep.update((v) => Math.max(1, v - 1));
  }

  // ─── Publish ─────────────────────────────────────────────────────────────

  async createAndPublish(): Promise<void> {
    if (this.creating()) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    if (!this.validateStructure()) {
      this.wizardStep.set(3);
      return;
    }

    const value = this.form.getRawValue();
    const courseTitle = value.courseTitle.trim();
    const description = value.description.trim();
    const price = Number(value.price || 0);
    const currency = (value.currency || 'USD').toUpperCase();

    this.creating.set(true);
    this.errorMessage.set('');

    try {
      const uploadedImageUrl = await this.uploadImage();

      const lessonSeedsByModule = new Map<string, ProgramModuleLessonSeed[]>();
      for (const module of this.modules) {
        lessonSeedsByModule.set(module.id, []);
      }

      for (let i = 0; i < this.lessons.length; i++) {
        const lesson = this.lessons[i];
        let lessonImageUrl = lesson.imageUrl;

        if (lesson.imageFile) {
          lessonImageUrl = await this.uploadLessonImage(lesson.imageFile);
          const updated = [...this.lessons];
          updated[i] = { ...updated[i], imageUrl: lessonImageUrl };
          this.lessons = updated;
        }

        const htmlContent = this.generateLessonHTML({ ...lesson, imageUrl: lessonImageUrl });
        const moduleLessons = lessonSeedsByModule.get(lesson.moduleId) || [];
        moduleLessons.push({
          title: lesson.title || `Lesson ${i + 1}`,
          type: lesson.videoUrl ? ProgramLessonType.MIXED : ProgramLessonType.READING,
          description: lesson.text || '',
          contentHtml: htmlContent,
          videoUrl: lesson.videoUrl || '',
          durationMin: 15,
          isPreview: false,
          downloadable: false,
          active: true,
          status: ProgramStatus.PUBLISHED,
          order: moduleLessons.length + 1,
        });
        lessonSeedsByModule.set(lesson.moduleId, moduleLessons);
      }

      const modulesPayload: ProgramModule[] = this.modules.map((module, index) => ({
        id: this.slugify(module.title || module.id),
        title: module.title.trim() || `Module ${index + 1}`,
        description: module.description.trim(),
        order: index + 1,
        estimatedMinutes: Math.max(15, (lessonSeedsByModule.get(module.id)?.length || 0) * 15),
        lessons: lessonSeedsByModule.get(module.id) || [],
        active: true,
      }));

      const createdProgramId = await this.programsService.createProgram({
        title: courseTitle,
        description,
        price,
        currency: (['USD', 'CAD', 'AED', 'EUR', 'GBP'] as const).includes(currency as any)
          ? (currency as 'USD' | 'CAD' | 'AED' | 'EUR' | 'GBP')
          : 'USD',
        slug: this.slugify(courseTitle),
        subtitle: courseTitle,
        category: ProgramCategory.OTHER,
        tags: [],
        imageUrl: uploadedImageUrl ??
          'https://res.cloudinary.com/dtdpx59sc/image/upload/q_auto/f_auto/v1775876293/8B3AC2EB-D700-4446-8E63-CFC050AB7704_aj4s69.png',
        durationText: 'Self-paced',
        scheduleText: 'Flexible schedule',
        level: ProgramLevel.BEGINNER,
        deliveryMode: ProgramDeliveryMode.ONLINE,
        isFeatured: false,
        active: true,
        status: ProgramStatus.PUBLISHED,
        requirements: [],
        outcomes: [],
        modules: modulesPayload,
        moduleIds: modulesPayload.map((module) => module.id),
        linkedCourseIds: [],
      });

      this.selectedProgramId.set(createdProgramId);
      const link = this.generateShareLink(createdProgramId);
      this.shareLink.set(link);
      this.generatedLink.set(link);
      this.publishedProgramId.set(createdProgramId);
      this.publishedTitle.set(courseTitle);
      this.isPublished.set(true);
      this.wizardOpen.set(false);
    } catch (error) {
      console.error(error);
      this.errorMessage.set('Unable to create your course. Please try again.');
    } finally {
      this.creating.set(false);
    }
  }

  // ─── Share & Link ─────────────────────────────────────────────────────────

  onGetCourseLink(): void {
    const targetId = this.selectedProgramId() || this.latestProgram()?.id || '';
    if (!targetId) { this.errorMessage.set('Create a course first to get a share link.'); return; }
    this.errorMessage.set('');
    this.selectedProgramId.set(targetId);
    this.shareLink.set(this.generateShareLink(targetId));
  }

  async connectWithStripe(): Promise<void> {
    const orgId = String(this.profile()?.orgId || '').trim();
    if (!orgId) {
      this.stripeConnectError.set('Your account must be linked to an organization before payouts can be enabled.');
      return;
    }

    this.stripeConnectBusy.set(true);
    this.stripeConnectError.set('');
    this.stripeConnectNotice.set('');

    try {
      const result = await this.stripeConnectService.connectStripeAccount(orgId);
      this.stripeConnectNotice.set('Redirecting you to Stripe onboarding...');
      window.location.href = result.onboardingUrl;
    } catch (error) {
      console.error(error);
      this.stripeConnectError.set(
        error instanceof Error ? error.message : 'Unable to open Stripe onboarding right now.'
      );
    } finally {
      this.stripeConnectBusy.set(false);
    }
  }

  shareOnWhatsApp(): void {
    const title = this.publishedTitle() ||
      this.programs().find((item) => item.id === this.selectedProgramId())?.title ||
      this.latestProgram()?.title || '';
    const link = this.generatedLink() || this.shareLink() ||
      (this.selectedProgramId() ? this.generateShareLink(this.selectedProgramId()) : '');
    if (!title || !link) { this.errorMessage.set('Create a course first to share it.'); return; }
    const message = encodeURIComponent(`🚀 I just launched a training!\n\n📚 ${title}\n\n💰 Join now and upgrade your career:\n${link}`);
    window.open(`https://wa.me/?text=${message}`, '_blank', 'noopener');
  }

  copyLink(link: string): void {
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => { this.showToast('Link copied successfully'); });
  }

  showToast(message: string): void {
    alert(message);
  }

  async goToPublishedDashboard(): Promise<void> {
    const programId = this.publishedProgramId();
    if (!programId) return;
    await this.router.navigate(['/program-admin/programs', programId, 'content']);
  }

  generateShareLink(programId: string): string {
    return `${window.location.origin}/programs/public/${programId}`;
  }

  private validateStructure(): boolean {
    const hasEmptyModule = this.modules.some((module) => !module.title.trim());
    if (hasEmptyModule) {
      this.errorMessage.set('Each module needs a title before publishing.');
      return false;
    }

    const hasInvalidLesson = this.lessons.some(
      (lesson) => !lesson.title.trim() || !lesson.moduleId || !this.modules.some((module) => module.id === lesson.moduleId)
    );

    if (hasInvalidLesson) {
      this.errorMessage.set('Each lesson needs a title and must belong to a module.');
      return false;
    }

    this.errorMessage.set('');
    return true;
  }

  trackByIndex(index: number): number { return index; }

  trackByProgramId(_: number, row: { id: string }): string { return row.id; }

  private slugify(value: string): string {
    return value.toLowerCase().trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private toEpoch(value: unknown): number {
    if (!value || typeof value !== 'object') return 0;
    if ('seconds' in (value as Record<string, unknown>)) {
      const seconds = Number((value as { seconds: number }).seconds);
      return Number.isFinite(seconds) ? seconds * 1000 : 0;
    }
    if ('toDate' in (value as Record<string, unknown>)) {
      const date = (value as { toDate: () => Date }).toDate();
      return date instanceof Date ? date.getTime() : 0;
    }
    return 0;
  }
}
