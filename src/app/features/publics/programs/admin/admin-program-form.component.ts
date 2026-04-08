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
} from '../program.models';
import { ProgramsService } from '../programs.service';

@Component({
  selector: 'app-admin-program-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './admin-program-form.component.html',
  styleUrls: ['./admin-program-form.component.css'],
})
export class AdminProgramFormComponent {
  mode = input<'create' | 'edit'>('create');

  private readonly fb = inject(FormBuilder);
  private readonly programsService = inject(ProgramsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly categories = Object.values(ProgramCategory);
  readonly levels = Object.values(ProgramLevel);
  readonly modes = Object.values(ProgramDeliveryMode);
  readonly statuses = Object.values(ProgramStatus);

  readonly form = this.fb.group({
    title: this.fb.nonNullable.control('', [Validators.required]),
    slug: this.fb.nonNullable.control('', [Validators.required]),
    subtitle: this.fb.nonNullable.control('', [Validators.required]),
    description: this.fb.nonNullable.control('', [Validators.required]),
    category: this.fb.nonNullable.control(ProgramCategory.OTHER),
    tags: this.fb.nonNullable.control(''),
    imageUrl: this.fb.nonNullable.control('', [Validators.required]),
    brochureUrl: this.fb.nonNullable.control(''),
    durationWeeks: this.fb.control<number | null>(null),
    durationText: this.fb.nonNullable.control('', [Validators.required]),
    scheduleText: this.fb.nonNullable.control('', [Validators.required]),
    price: this.fb.nonNullable.control(0, [Validators.required, Validators.min(0)]),
    discountPrice: this.fb.control<number | null>(null),
    currency: this.fb.nonNullable.control('USD'),
    level: this.fb.nonNullable.control(ProgramLevel.BEGINNER),
    deliveryMode: this.fb.nonNullable.control(ProgramDeliveryMode.ONLINE),
    isFeatured: this.fb.nonNullable.control(false),
    seats: this.fb.control<number | null>(null),
    seatsRemaining: this.fb.control<number | null>(null),
    active: this.fb.nonNullable.control(true),
    status: this.fb.nonNullable.control(ProgramStatus.DRAFT),
    requirements: this.fb.nonNullable.control(''),
    outcomes: this.fb.nonNullable.control(''),
    linkedCourseIds: this.fb.nonNullable.control(''),
    ownerId: this.fb.nonNullable.control(''),
    orgId: this.fb.nonNullable.control(''),
  });

  private editingProgramId = '';

  async ngOnInit(): Promise<void> {
    if (this.mode() !== 'edit') {
      return;
    }

    const programId = this.route.snapshot.paramMap.get('id') || '';
    if (!programId) {
      return;
    }

    const program = await firstValueFrom(this.programsService.getProgramById(programId));
    if (!program) {
      return;
    }

    this.editingProgramId = program.id;
    this.patchForm(program);
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    const payload = {
      title: value.title,
      slug: value.slug,
      subtitle: value.subtitle,
      description: value.description,
      category: value.category,
      tags: this.parseList(value.tags),
      imageUrl: value.imageUrl,
      brochureUrl: value.brochureUrl,
      durationWeeks: value.durationWeeks ?? undefined,
      durationText: value.durationText,
      scheduleText: value.scheduleText,
      price: Number(value.price || 0),
      discountPrice: value.discountPrice,
      currency: value.currency as Program['currency'],
      level: value.level,
      deliveryMode: value.deliveryMode,
      isFeatured: value.isFeatured,
      seats: value.seats,
      seatsRemaining: value.seatsRemaining,
      active: value.active,
      status: value.status,
      requirements: this.parseList(value.requirements),
      outcomes: this.parseList(value.outcomes),
      modules: [],
      linkedCourseIds: this.parseList(value.linkedCourseIds),
      ownerId: value.ownerId || undefined,
      orgId: value.orgId || null,
    };

    if (this.mode() === 'edit' && this.editingProgramId) {
      await this.programsService.updateProgram(this.editingProgramId, payload);
    } else {
      await this.programsService.createProgram(payload);
    }

    await this.router.navigate(['/program-admin/programs/list']);
  }

  private parseList(raw: string): string[] {
    return raw
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
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
      isFeatured: !!program.isFeatured,
      seats: program.seats ?? null,
      seatsRemaining: program.seatsRemaining ?? null,
      active: !!program.active,
      status: program.status,
      requirements: (program.requirements || []).join(', '),
      outcomes: (program.outcomes || []).join(', '),
      linkedCourseIds: (program.linkedCourseIds || []).join(', '),
      ownerId: program.ownerId || '',
      orgId: program.orgId || '',
    });
  }
}
