import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Firestore, doc, setDoc, serverTimestamp } from '@angular/fire/firestore';
import { Storage, getDownloadURL, ref, uploadBytes } from '@angular/fire/storage';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { of, switchMap } from 'rxjs';
import { AuthService } from '../../../core/auth';
import { StripeConnectService, ConnectAccountStatus, StripeConnectStatusResult } from '../../../core/stripe-connect.service';
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

type PartnerPayoutMethod = 'MTN_MOBILE_MONEY' | 'ORANGE_MONEY' | 'WISE' | 'BANK_TRANSFER' | 'MANUAL_OTHER';
type PartnerPayoutUiStatus = 'payout_method_missing' | 'manual_payout_ready' | 'payout_pending' | 'payout_paid' | 'stripe_connect_optional';

@Component({
  selector: 'app-africa-quick-launch',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, DragDropModule],
  templateUrl: './africa-quick-launch.component.html',
  styleUrls: ['./africa-quick-launch.component.css'],
})
export class AfricaQuickLaunchComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly firestore = inject(Firestore);
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
  // ─── Stripe Connect state machine ────────────────────────────────────────
  readonly stripeConnectBusy = signal(false);
  readonly stripeConnectError = signal('');
  readonly stripeStatusLoading = signal(false);
  readonly stripeStatusCheckedAt = signal<string | null>(null);
  readonly connectStatus = signal<ConnectAccountStatus | null>(null);
  readonly connectStatusResult = signal<StripeConnectStatusResult | null>(null);
  readonly payoutSaveBusy = signal(false);
  readonly payoutSaveError = signal('');
  readonly payoutSaveSuccess = signal('');
  readonly payoutPendingCount = signal(0);
  readonly payoutPaidCount = signal(0);
  readonly payoutMethod = signal<PartnerPayoutMethod>('MANUAL_OTHER');
  readonly payoutCountry = signal('');
  readonly payoutCurrency = signal('USD');
  readonly accountHolderName = signal('');
  readonly mobileMoneyProvider = signal('');
  readonly mobileMoneyPhone = signal('');
  readonly bankName = signal('');
  readonly bankInstructions = signal('');
  readonly payoutNotes = signal('');
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
    const status = this.connectStatus();
    if (!status) {
      const account = this.stripeAccount();
      if (!account?.stripeAccountId) return 'Non connecté';
      if (account.stripeChargesEnabled && account.stripePayoutsEnabled) return 'Prêt à recevoir les paiements';
      if (account.stripeDetailsSubmitted) return 'Vérification en cours';
      return 'Intégration Stripe en cours';
    }
    const labels: Record<ConnectAccountStatus, string> = {
      missing_account: 'Compte Stripe non créé',
      onboarding_required: 'Intégration requise',
      pending_verification: 'Vérification Stripe en cours',
      charges_enabled: 'Paiements activés',
      fully_active: 'Stripe actif — prêt à recevoir les paiements',
      restricted: 'Compte restreint — informations manquantes',
    };
    return labels[status] ?? 'Statut inconnu';
  });

  readonly isStripeFullyActive = computed(() => this.connectStatus() === 'fully_active');
  readonly isStripeMissingAccount = computed(() => this.connectStatus() === 'missing_account');
  readonly isStripeOnboardingRequired = computed(() =>
    this.connectStatus() === 'onboarding_required' || this.connectStatus() === null
  );
  readonly isStripePendingVerification = computed(() => this.connectStatus() === 'pending_verification');
  readonly isStripeRestricted = computed(() => this.connectStatus() === 'restricted');
  readonly isStripeChargesEnabled = computed(() => this.connectStatus() === 'charges_enabled');
  readonly isManualPayoutConfigured = computed(() => this.stripeAccount()?.payoutMethodConfigured === true);
  readonly payoutUiStatus = computed<PartnerPayoutUiStatus>(() => {
    if (this.payoutPendingCount() > 0) return 'payout_pending';
    if (this.payoutPaidCount() > 0) return 'payout_paid';
    if (this.isManualPayoutConfigured()) return 'manual_payout_ready';
    return 'payout_method_missing';
  });

  readonly payoutStatusLabel = computed(() => {
    const labels: Record<PartnerPayoutUiStatus, string> = {
      payout_method_missing: 'Méthode de reversement à configurer',
      manual_payout_ready: 'Reversement manuel activé',
      payout_pending: 'Reversement en attente',
      payout_paid: 'Reversement effectué',
      stripe_connect_optional: 'Stripe Connect optionnel',
    };
    return labels[this.payoutUiStatus()];
  });

  private readonly payoutHydrationEffect = effect(() => {
    const account = this.stripeAccount();
    if (!account) return;
    this.payoutMethod.set((account.payoutMethod as PartnerPayoutMethod) || this.payoutMethod());
    if (!this.payoutCountry()) this.payoutCountry.set(String(account.payoutCountry || ''));
    if (!this.payoutCurrency()) this.payoutCurrency.set(String(account.payoutCurrency || 'USD'));
    if (!this.accountHolderName()) this.accountHolderName.set(String(account.accountHolderName || ''));
    if (!this.mobileMoneyProvider()) this.mobileMoneyProvider.set(String(account.mobileMoneyProvider || ''));
    if (!this.mobileMoneyPhone()) this.mobileMoneyPhone.set(String(account.mobileMoneyPhoneMasked || ''));
    if (!this.bankName()) this.bankName.set(String(account.bankName || ''));
    if (!this.bankInstructions()) this.bankInstructions.set(String(account.bankAccountMasked || ''));
    if (!this.payoutNotes()) this.payoutNotes.set(String(account.payoutNotes || ''));
  });

  ngOnInit(): void {
    // Rafraîchir le statut réel au chargement et à chaque retour depuis Stripe
    this.route.queryParamMap.subscribe((params) => {
      const stripeParam = params.get('stripe');
      if (stripeParam === 'return' || stripeParam === 'refresh') {
        // Effacer le param de l'URL sans naviguer
        this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
        // Forcer un rechargement du statut depuis Stripe API
        this.loadConnectAccountStatus();
      } else {
        this.loadConnectAccountStatus();
      }
    });

    this.hydratePayoutFormFromOrganization();
    this.loadPartnerPayoutSummary();
  }

  hydratePayoutFormFromOrganization(): void {
    const account = this.stripeAccount();
    if (!account) return;
    this.payoutMethod.set((account.payoutMethod as PartnerPayoutMethod) || 'MANUAL_OTHER');
    this.payoutCountry.set(String(account.payoutCountry || ''));
    this.payoutCurrency.set(String(account.payoutCurrency || 'USD'));
    this.accountHolderName.set(String(account.accountHolderName || ''));
    this.mobileMoneyProvider.set(String(account.mobileMoneyProvider || ''));
    this.mobileMoneyPhone.set(String(account.mobileMoneyPhoneMasked || ''));
    this.bankName.set(String(account.bankName || ''));
    this.bankInstructions.set(String(account.bankAccountMasked || ''));
    this.payoutNotes.set(String(account.payoutNotes || ''));
  }

  async loadPartnerPayoutSummary(): Promise<void> {
    try {
      const pending = await this.stripeConnectService.getPartnerPayoutRecords('pending', 100);
      const paid = await this.stripeConnectService.getPartnerPayoutRecords('paid', 100);
      this.payoutPendingCount.set(Number(pending.count || 0));
      this.payoutPaidCount.set(Number(paid.count || 0));
    } catch {
      this.payoutPendingCount.set(0);
      this.payoutPaidCount.set(0);
    }
  }

  async loadConnectAccountStatus(): Promise<void> {
    const orgId = String(this.profile()?.orgId || '').trim();
    if (!orgId) return;

    this.stripeStatusLoading.set(true);
    this.stripeConnectError.set('');

    try {
      const result = await this.stripeConnectService.getConnectAccountStatus(orgId);
      this.connectStatus.set(result.status);
      this.connectStatusResult.set(result);
      this.stripeStatusCheckedAt.set(result.checkedAt);
    } catch {
      // En cas d'erreur silencieuse, on utilise les données Firestore déjà chargées
    } finally {
      this.stripeStatusLoading.set(false);
    }
  }

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
          'https://res.cloudinary.com/dtdpx59sc/image/upload/v1778121784/ChatGPT_Image_6_mai_2026_22_40_14_4_khn31u.png',
        durationText: 'Self-paced',
        scheduleText: 'Flexible schedule',
        level: ProgramLevel.BEGINNER,
        deliveryMode: ProgramDeliveryMode.ONLINE,
        isFeatured: false,
        active: true,
        status: ProgramStatus.PUBLISHED,
        ownerType: 'partner',
        payoutMode: 'manual',
        platformFeePercent: 30,
        partnerSharePercent: 70,
        payoutMethodConfigured: Boolean(this.payoutMethod()),
        payoutMethod: this.payoutMethod(),
        payoutCountry: this.payoutCountry().trim() || undefined,
        payoutCurrency: this.payoutCurrency().trim().toUpperCase() || 'USD',
        accountHolderName: this.accountHolderName().trim() || undefined,
        mobileMoneyProvider: this.mobileMoneyProvider().trim() || undefined,
        mobileMoneyPhoneMasked: this.mobileMoneyPhone().trim() || undefined,
        bankName: this.bankName().trim() || undefined,
        bankAccountMasked: this.bankInstructions().trim() || undefined,
        payoutNotes: this.payoutNotes().trim() || undefined,
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
      this.stripeConnectError.set("Votre compte doit être lié à une organisation avant d'activer les virements.");
      return;
    }

    this.stripeConnectBusy.set(true);
    this.stripeConnectError.set('');

    try {
      const result = await this.stripeConnectService.connectStripeAccount(orgId);
      window.location.href = result.onboardingUrl;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible d'ouvrir l'intégration Stripe.";
      const normalized = message.toLowerCase();

      if (
        normalized.includes('platform profile') ||
        normalized.includes('questionnaire') ||
        normalized.includes('failed-precondition')
      ) {
        this.stripeConnectError.set(
          '⚠️ Votre profil de plateforme Stripe Connect est incomplet. ' +
          'Ouvrez le Dashboard Stripe, complétez le questionnaire "Profil de la plateforme Connect", puis réessayez.'
        );
      } else {
        this.stripeConnectError.set(message);
      }
    } finally {
      this.stripeConnectBusy.set(false);
    }
  }

  openStripeConnectDashboard(): void {
    window.open('https://dashboard.stripe.com/connect/accounts/overview', '_blank', 'noopener');
  }

  payoutStatusClass(): string {
    const status = this.payoutUiStatus();
    if (status === 'manual_payout_ready' || status === 'payout_paid') return 'am-stripe-pill--ready';
    if (status === 'payout_pending') return 'am-stripe-pill--pending';
    return 'am-stripe-pill--error';
  }

  async saveManualPayoutSettings(): Promise<void> {
    const orgId = String(this.profile()?.orgId || '').trim();
    if (!orgId) {
      this.payoutSaveError.set('Organisation introuvable pour enregistrer la méthode de reversement.');
      return;
    }

    this.payoutSaveBusy.set(true);
    this.payoutSaveError.set('');
    this.payoutSaveSuccess.set('');

    try {
      await setDoc(
        doc(this.firestore, `organizations/${orgId}`),
        {
          payoutMethodConfigured: true,
          payoutMode: 'manual',
          payoutMethod: this.payoutMethod(),
          payoutCountry: this.payoutCountry().trim() || null,
          payoutCurrency: this.payoutCurrency().trim().toUpperCase() || 'USD',
          accountHolderName: this.accountHolderName().trim() || null,
          mobileMoneyProvider: this.mobileMoneyProvider().trim() || null,
          mobileMoneyPhoneMasked: this.mobileMoneyPhone().trim() || null,
          bankName: this.bankName().trim() || null,
          bankAccountMasked: this.bankInstructions().trim() || null,
          payoutNotes: this.payoutNotes().trim() || null,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      this.payoutSaveSuccess.set('Méthode de reversement enregistrée.');
      this.loadPartnerPayoutSummary();
    } catch {
      this.payoutSaveError.set('Impossible d’enregistrer la méthode de reversement.');
    } finally {
      this.payoutSaveBusy.set(false);
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
