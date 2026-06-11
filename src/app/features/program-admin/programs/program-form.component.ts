import { CommonModule } from '@angular/common';
import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  Program,
  ProgramCategory,
  ProgramDeliveryMode,
  ProgramLevel,
  ProgramPaymentPlanType,
  ProgramStatus,
} from '../shared/program-admin.models';
import { ProgramsAdminService } from '../services/programs-admin.service';
import { DEFAULT_PROGRAMS_SEED } from '../../publics/programs/programs.seed';
import { ProgramLessonType } from '../../publics/programs/program.models';
import type { ProgramModuleLessonSeed } from '../../publics/programs/program.models';

@Component({
  selector: 'app-program-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './program-form.component.html',
  styleUrls: ['./program-form.component.css'],
})
export class ProgramFormComponent {
  mode = input<'create' | 'edit'>('create');

  private readonly fb = inject(FormBuilder);
  private readonly programsService = inject(ProgramsAdminService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly categories = Object.values(ProgramCategory);
  readonly levels = Object.values(ProgramLevel);
  readonly deliveryModes = Object.values(ProgramDeliveryMode);
  readonly statuses = Object.values(ProgramStatus);
  readonly paymentPlanTypes: ProgramPaymentPlanType[] = ['one_time', 'monthly_subscription', 'installments'];
  readonly selectedSeedSlug = signal('');
  readonly seedTemplates = DEFAULT_PROGRAMS_SEED.map((program) => ({
    slug: program.slug || '',
    title: program.title,
    category: program.category,
    moduleCount: program.modules?.length || 0,
  }));

  private editingProgramId = '';
  readonly lessonTypes = Object.values(ProgramLessonType);

  readonly form = this.fb.group({
    title: this.fb.nonNullable.control('', [Validators.required]),
    slug: this.fb.nonNullable.control('', [Validators.required]),
    subtitle: this.fb.nonNullable.control('', [Validators.required]),
    description: this.fb.nonNullable.control('', [Validators.required]),
    category: this.fb.nonNullable.control(ProgramCategory.OTHER),
    tags: this.fb.nonNullable.control(''),

    price: this.fb.nonNullable.control(0, [Validators.required, Validators.min(0)]),
    discountPrice: this.fb.control<number | null>(null),
    currency: this.fb.nonNullable.control('USD'),
    availablePaymentPlans: this.fb.nonNullable.control<ProgramPaymentPlanType[]>(['one_time']),
    defaultPaymentPlan: this.fb.nonNullable.control<ProgramPaymentPlanType>('one_time'),
    stripeOneTimePriceId: this.fb.nonNullable.control(''),
    stripeMonthlyPriceId: this.fb.nonNullable.control(''),
    monthlyPrice: this.fb.control<number | null>(null),
    stripeInstallmentPriceId: this.fb.nonNullable.control(''),
    installmentPrice: this.fb.control<number | null>(null),
    installmentCount: this.fb.control<number | null>(null),

    durationWeeks: this.fb.control<number | null>(null),
    durationText: this.fb.nonNullable.control('', [Validators.required]),
    scheduleText: this.fb.nonNullable.control('', [Validators.required]),
    deliveryMode: this.fb.nonNullable.control(ProgramDeliveryMode.ONLINE),
    level: this.fb.nonNullable.control(ProgramLevel.BEGINNER),

    modules: this.fb.nonNullable.control(''),
    starterLessons: this.fb.nonNullable.control(''),
    linkedCourseIds: this.fb.nonNullable.control(''),

    requirements: this.fb.nonNullable.control(''),
    outcomes: this.fb.nonNullable.control(''),

    imageUrl: this.fb.nonNullable.control('', [Validators.required]),
    brochureUrl: this.fb.nonNullable.control(''),

    isFeatured: this.fb.nonNullable.control(false),
    active: this.fb.nonNullable.control(true),
    status: this.fb.nonNullable.control(ProgramStatus.DRAFT),
    seats: this.fb.control<number | null>(null),
    seatsRemaining: this.fb.control<number | null>(null),

    startDate: this.fb.nonNullable.control(''),
    endDate: this.fb.nonNullable.control(''),
    ownerId: this.fb.nonNullable.control(''),
    orgId: this.fb.nonNullable.control(''),
  });

  async ngOnInit(): Promise<void> {
    if (this.mode() !== 'edit') {
      return;
    }

    const id = this.route.snapshot.paramMap.get('id') || '';
    if (!id) {
      return;
    }

    const program = await firstValueFrom(this.programsService.getProgramById(id));
    if (!program) {
      return;
    }

    this.editingProgramId = id;
    this.patchForm(program);
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const starterLessons = this.parseStarterLessons(v.starterLessons);
    const modules = this.parseModules(v.modules, starterLessons);
    const seatsValue = v.seats != null ? Number(v.seats) : null;

    const payload = {
      title: v.title,
      slug: v.slug,
      subtitle: v.subtitle,
      description: v.description,
      category: v.category,
      tags: this.parseCsv(v.tags),
      imageUrl: v.imageUrl,
      brochureUrl: v.brochureUrl || undefined,
      durationWeeks: v.durationWeeks ?? undefined,
      durationText: v.durationText,
      scheduleText: v.scheduleText,
      price: Number(v.price || 0),
      discountPrice: v.discountPrice,
      currency: v.currency as Program['currency'],
      availablePaymentPlans: this.normalizePaymentPlans(v.availablePaymentPlans),
      defaultPaymentPlan: this.resolveDefaultPaymentPlan(v.defaultPaymentPlan, v.availablePaymentPlans),
      stripeOneTimePriceId: v.stripeOneTimePriceId.trim() || null,
      stripeMonthlyPriceId: v.stripeMonthlyPriceId.trim() || null,
      monthlyPrice: v.monthlyPrice != null ? Number(v.monthlyPrice) : null,
      stripeInstallmentPriceId: v.stripeInstallmentPriceId.trim() || null,
      installmentPrice: v.installmentPrice != null ? Number(v.installmentPrice) : null,
      installmentCount: v.installmentCount != null ? Number(v.installmentCount) : null,
      level: v.level,
      deliveryMode: v.deliveryMode,
      isFeatured: v.isFeatured,
      seats: seatsValue,
      seatsRemaining: v.seatsRemaining != null ? Number(v.seatsRemaining) : seatsValue,
      active: v.active,
      status: v.status,
      requirements: this.parseCsv(v.requirements),
      outcomes: this.parseCsv(v.outcomes),
      modules,
      linkedCourseIds: this.parseCsv(v.linkedCourseIds),
      moduleIds: modules.map((m) => m.id),
      startDate: v.startDate ? new Date(v.startDate) : null,
      endDate: v.endDate ? new Date(v.endDate) : null,
      ownerId: v.ownerId || undefined,
      orgId: v.orgId || null,
    };

    if (this.mode() === 'edit' && this.editingProgramId) {
      await this.programsService.updateProgram(this.editingProgramId, payload);
    } else {
      await this.programsService.createProgram(payload as Omit<Program, 'id'>);
    }

    await this.router.navigate(['/program-admin/programs']);
  }

  applySelectedSeed(): void {
    const slug = this.selectedSeedSlug();
    const seed = DEFAULT_PROGRAMS_SEED.find((program) => (program.slug || '') === slug);
    if (!seed) {
      return;
    }

    this.form.patchValue({
      title: seed.title,
      slug: seed.slug || '',
      subtitle: seed.subtitle,
      description: seed.description,
      category: seed.category,
      tags: (seed.tags || []).join(', '),
      price: seed.price,
      discountPrice: seed.discountPrice ?? null,
      currency: seed.currency,
      availablePaymentPlans: this.normalizePaymentPlans(seed.availablePaymentPlans),
      defaultPaymentPlan: this.resolveDefaultPaymentPlan(seed.defaultPaymentPlan, seed.availablePaymentPlans),
      stripeOneTimePriceId: seed.stripeOneTimePriceId || '',
      stripeMonthlyPriceId: seed.stripeMonthlyPriceId || '',
      monthlyPrice: seed.monthlyPrice ?? null,
      stripeInstallmentPriceId: seed.stripeInstallmentPriceId || '',
      installmentPrice: seed.installmentPrice ?? null,
      installmentCount: seed.installmentCount ?? null,
      durationWeeks: seed.durationWeeks ?? null,
      durationText: seed.durationText,
      scheduleText: seed.scheduleText,
      deliveryMode: seed.deliveryMode,
      level: seed.level,
      modules: (seed.modules || []).map((module) => module.title).join('\n'),
      starterLessons: this.stringifyStarterLessons(seed.modules || []),
      linkedCourseIds: (seed.linkedCourseIds || []).join(', '),
      requirements: (seed.requirements || []).join(', '),
      outcomes: (seed.outcomes || []).join(', '),
      imageUrl: seed.imageUrl,
      brochureUrl: seed.brochureUrl || '',
      isFeatured: !!seed.isFeatured,
      active: !!seed.active,
      status: seed.status,
      seats: seed.seats ?? null,
      seatsRemaining: seed.seatsRemaining ?? null,
    });
  }

  private parseCsv(value: string): string[] {
    return value
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
  }

  private parseModules(
    value: string,
    starterLessons: Map<string, Array<string | ProgramModuleLessonSeed>>
  ): NonNullable<Program['modules']> {
    return value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((title, index) => ({
        id: `module-${index + 1}`,
        title,
        order: index + 1,
        description: '',
        lessons: starterLessons.get(title) || [],
      }));
  }

  private parseStarterLessons(value: string): Map<string, Array<string | ProgramModuleLessonSeed>> {
    const lessonMap = new Map<string, Array<string | ProgramModuleLessonSeed>>();
    value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => {
        const [moduleTitle, lessonsRaw] = line.split('::').map((part) => part.trim());
        if (!moduleTitle || !lessonsRaw) {
          return;
        }
        const lessons = lessonsRaw
          .split('|')
          .map((lesson) => this.parseLessonToken(lesson))
          .filter(Boolean)
          .map((lesson) => lesson as string | ProgramModuleLessonSeed);
        if (lessons.length > 0) {
          lessonMap.set(moduleTitle, lessons);
        }
      });
    return lessonMap;
  }

  private stringifyStarterLessons(modules: NonNullable<Program['modules']>): string {
    return modules
      .filter((module) => Array.isArray(module.lessons) && module.lessons.length > 0)
      .map((module) => {
        const lessons = (module.lessons || []).map((lesson) => this.stringifyLessonToken(lesson));
        return `${module.title} :: ${lessons.join(' | ')}`;
      })
      .join('\n');
  }

  previewStarterLessons(): Array<{ moduleTitle: string; lessons: ProgramModuleLessonSeed[] }> {
    return Array.from(this.parseStarterLessons(this.form.controls.starterLessons.value).entries()).map(
      ([moduleTitle, lessons]) => ({
        moduleTitle,
        lessons: lessons.map((lesson, index) => this.normalizeLessonSeed(lesson, index)),
      })
    );
  }

  lessonTypeLabel(type?: ProgramLessonType): string {
    switch (type) {
      case ProgramLessonType.VIDEO:
        return 'Video';
      case ProgramLessonType.DOCUMENT:
        return 'Document';
      case ProgramLessonType.MIXED:
        return 'Mixed';
      case ProgramLessonType.WEB:
        return 'Web Page';
      case ProgramLessonType.INTERACTIVE:
        return 'Interactive';
      case ProgramLessonType.LAB:
        return 'Lab';
      default:
        return 'Reading';
    }
  }

  paymentPlanLabel(plan: ProgramPaymentPlanType): string {
    switch (plan) {
      case 'monthly_subscription':
        return 'Monthly subscription';
      case 'installments':
        return 'Installments';
      case 'one_time':
      default:
        return 'One-time payment';
    }
  }

  togglePaymentPlan(plan: ProgramPaymentPlanType, enabled: boolean): void {
    const currentPlans = this.normalizePaymentPlans(this.form.controls.availablePaymentPlans.value);
    const nextPlans = enabled
      ? Array.from(new Set([...currentPlans, plan]))
      : currentPlans.filter((item) => item !== plan);
    const normalizedNextPlans = this.normalizePaymentPlans(nextPlans);

    this.form.controls.availablePaymentPlans.setValue(normalizedNextPlans);
    this.form.controls.defaultPaymentPlan.setValue(
      this.resolveDefaultPaymentPlan(this.form.controls.defaultPaymentPlan.value, normalizedNextPlans)
    );
  }

  private patchForm(program: Program): void {
    this.form.patchValue({
      title: program.title,
      slug: program.slug,
      subtitle: program.subtitle,
      description: program.description,
      category: program.category,
      tags: (program.tags || []).join(', '),
      imageUrl: program.imageUrl,
      brochureUrl: program.brochureUrl || '',
      durationWeeks: program.durationWeeks ?? null,
      durationText: program.durationText,
      scheduleText: program.scheduleText,
      price: program.price,
      discountPrice: program.discountPrice ?? null,
      currency: program.currency,
      availablePaymentPlans: this.normalizePaymentPlans(program.availablePaymentPlans),
      defaultPaymentPlan: this.resolveDefaultPaymentPlan(program.defaultPaymentPlan, program.availablePaymentPlans),
      stripeOneTimePriceId: program.stripeOneTimePriceId || '',
      stripeMonthlyPriceId: program.stripeMonthlyPriceId || '',
      monthlyPrice: program.monthlyPrice ?? null,
      stripeInstallmentPriceId: program.stripeInstallmentPriceId || '',
      installmentPrice: program.installmentPrice ?? null,
      installmentCount: program.installmentCount ?? null,
      level: program.level,
      deliveryMode: program.deliveryMode,
      modules: (program.modules || []).map((m) => m.title).join('\n'),
      starterLessons: this.stringifyStarterLessons(program.modules || []),
      linkedCourseIds: (program.linkedCourseIds || []).join(', '),
      requirements: (program.requirements || []).join(', '),
      outcomes: (program.outcomes || []).join(', '),
      isFeatured: !!program.isFeatured,
      active: !!program.active,
      status: program.status,
      seats: program.seats ?? null,
      seatsRemaining: program.seatsRemaining ?? null,
      startDate: this.toInputDate(program.startDate),
      endDate: this.toInputDate(program.endDate),
      ownerId: program.ownerId || '',
      orgId: program.orgId || '',
    });
  }

  private toInputDate(value: unknown): string {
    if (!value) {
      return '';
    }

    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }

    if (typeof value === 'object' && value !== null) {
      const maybeTimestamp = value as { toDate?: () => Date };
      if (typeof maybeTimestamp.toDate === 'function') {
        return maybeTimestamp.toDate().toISOString().slice(0, 10);
      }
    }

    return '';
  }

  private parseLessonToken(rawLesson: string): string | ProgramModuleLessonSeed | null {
    const lesson = rawLesson.trim();
    if (!lesson) {
      return null;
    }

    const pattern = /^(?<title>[^\[]+?)(?:\s*\[(?<type>video|reading|interactive|lab|document|mixed|web)\])?(?:\s*\((?<duration>\d+)m\))?(?:\s*->\s*(?<url>https?:\/\/\S+))?$/i;
    const match = lesson.match(pattern);
    if (!match?.groups) {
      return lesson;
    }

    const title = match.groups['title']?.trim();
    const typeRaw = match.groups['type']?.trim().toLowerCase();
    const durationRaw = match.groups['duration']?.trim();
    const url = match.groups['url']?.trim();

    if (!title) {
      return null;
    }

    if (!typeRaw && !durationRaw && !url) {
      return title;
    }

    return {
      title,
      type: this.toProgramLessonType(typeRaw),
      durationMin: durationRaw ? Number(durationRaw) : undefined,
      videoUrl: url || undefined,
    };
  }

  private stringifyLessonToken(lesson: string | ProgramModuleLessonSeed): string {
    if (typeof lesson === 'string') {
      return lesson;
    }

    const parts = [lesson.title.trim()];
    if (lesson.type) {
      parts.push(`[${lesson.type}]`);
    }
    if (lesson.durationMin) {
      parts.push(`(${lesson.durationMin}m)`);
    }
    if (lesson.videoUrl) {
      parts.push(`-> ${lesson.videoUrl}`);
    }

    return parts.join(' ');
  }

  private normalizeLessonSeed(
    lesson: string | ProgramModuleLessonSeed,
    index: number
  ): ProgramModuleLessonSeed {
    if (typeof lesson === 'string') {
      return {
        title: lesson,
        type: ProgramLessonType.READING,
        durationMin: 15,
        order: index + 1,
      };
    }

    return {
      ...lesson,
      type: lesson.type || ProgramLessonType.READING,
      durationMin: lesson.durationMin || 15,
      order: lesson.order || index + 1,
    };
  }

  private toProgramLessonType(type?: string): ProgramLessonType | undefined {
    switch (type) {
      case ProgramLessonType.VIDEO:
        return ProgramLessonType.VIDEO;
      case ProgramLessonType.INTERACTIVE:
        return ProgramLessonType.INTERACTIVE;
      case ProgramLessonType.LAB:
        return ProgramLessonType.LAB;
      case ProgramLessonType.DOCUMENT:
        return ProgramLessonType.DOCUMENT;
      case ProgramLessonType.MIXED:
        return ProgramLessonType.MIXED;
      case ProgramLessonType.WEB:
        return ProgramLessonType.WEB;
      case ProgramLessonType.READING:
        return ProgramLessonType.READING;
      default:
        return undefined;
    }
  }

  private normalizePaymentPlans(
    plans: ProgramPaymentPlanType[] | readonly ProgramPaymentPlanType[] | null | undefined
  ): ProgramPaymentPlanType[] {
    const normalized = (plans || []).filter((plan): plan is ProgramPaymentPlanType => this.paymentPlanTypes.includes(plan));
    return normalized.length ? Array.from(new Set(normalized)) : ['one_time'];
  }

  private resolveDefaultPaymentPlan(
    selected: ProgramPaymentPlanType | null | undefined,
    available: ProgramPaymentPlanType[] | readonly ProgramPaymentPlanType[] | null | undefined
  ): ProgramPaymentPlanType {
    const normalized = this.normalizePaymentPlans(available);
    return selected && normalized.includes(selected) ? selected : normalized[0];
  }
}
