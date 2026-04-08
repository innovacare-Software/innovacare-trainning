import { CommonModule } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  Program,
  ProgramCategory,
  ProgramDeliveryMode,
  ProgramLevel,
  ProgramStatus,
} from '../shared/program-admin.models';
import { ProgramsAdminService } from '../services/programs-admin.service';

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

  private editingProgramId = '';

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

    durationWeeks: this.fb.control<number | null>(null),
    durationText: this.fb.nonNullable.control('', [Validators.required]),
    scheduleText: this.fb.nonNullable.control('', [Validators.required]),
    deliveryMode: this.fb.nonNullable.control(ProgramDeliveryMode.ONLINE),
    level: this.fb.nonNullable.control(ProgramLevel.BEGINNER),

    modules: this.fb.nonNullable.control(''),
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
    const modules = this.parseModules(v.modules);
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

  private parseCsv(value: string): string[] {
    return value
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
  }

  private parseModules(value: string): NonNullable<Program['modules']> {
    return value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((title, index) => ({
        id: `module-${index + 1}`,
        title,
        order: index + 1,
        description: '',
      }));
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
      level: program.level,
      deliveryMode: program.deliveryMode,
      modules: (program.modules || []).map((m) => m.title).join('\n'),
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
}
