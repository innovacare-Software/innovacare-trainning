import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { debounceTime, distinctUntilChanged, map, startWith } from 'rxjs/operators';
import {
  Program,
  ProgramCategory,
  PROGRAM_CATEGORY_LABELS,
  PROGRAM_DELIVERY_MODE_LABELS,
  PROGRAM_LEVEL_LABELS,
  ProgramCategoryOption,
} from './program.models';
import { ProgramsService } from './programs.service';

@Component({
  selector: 'app-programs-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './programs-page.component.html',
  styleUrls: ['./programs-page.component.css'],
})
export class ProgramsPageComponent {
  private readonly programsService = inject(ProgramsService);

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly categoryControl = new FormControl<ProgramCategory | 'ALL'>('ALL', {
    nonNullable: true,
  });

  readonly categoryOptions: ProgramCategoryOption[] = [
    { label: 'DevOps', value: ProgramCategory.DEVOPS },
    { label: 'NCLEX', value: ProgramCategory.NCLEX },
    { label: 'DHA', value: ProgramCategory.DHA },
    { label: 'DOH', value: ProgramCategory.DOH },
    { label: 'Canada NCLEX', value: ProgramCategory.CANADA_NCLEX },
    { label: 'Nursing Prep', value: ProgramCategory.NURSING_PREP },
    { label: 'Other', value: ProgramCategory.OTHER },
  ];

  readonly allPrograms = toSignal(this.programsService.getPublishedPrograms(), {
    initialValue: [] as Program[],
  });

  readonly searchTerm = toSignal(
    this.searchControl.valueChanges.pipe(
      startWith(this.searchControl.value),
      debounceTime(120),
      map((value) => value.trim().toLowerCase()),
      distinctUntilChanged()
    ),
    { initialValue: '' }
  );

  readonly selectedCategory = toSignal(
    this.categoryControl.valueChanges.pipe(startWith(this.categoryControl.value)),
    { initialValue: 'ALL' as ProgramCategory | 'ALL' }
  );

  readonly filteredPrograms = computed(() => {
    const programs = this.allPrograms();
    const term = this.searchTerm();
    const selectedCategory = this.selectedCategory();

    return programs.filter((program) => {
      const categoryMatches =
        selectedCategory === 'ALL' || program.category === selectedCategory;

      const searchableText = [
        program.title,
        program.subtitle,
        program.description,
        program.category,
        ...(program.tags || []),
      ]
        .join(' ')
        .toLowerCase();

      const searchMatches = !term || searchableText.includes(term);
      return categoryMatches && searchMatches;
    });
  });

  readonly featuredPrograms = computed(() =>
    this.filteredPrograms().filter((program) => program.isFeatured)
  );

  readonly hasActiveFilters = computed(() => {
    return this.selectedCategory() !== 'ALL' || !!this.searchTerm();
  });

  readonly totalSeatsOpen = computed(() => {
    return this.filteredPrograms().reduce((acc, program) => {
      const seatsLeft = Number(program.seatsRemaining ?? 0);
      return acc + (Number.isFinite(seatsLeft) ? seatsLeft : 0);
    }, 0);
  });

  readonly lowestPrice = computed(() => {
    const prices = this.filteredPrograms().map((program) =>
      Number(program.discountPrice ?? program.price)
    );
    if (!prices.length) {
      return 0;
    }
    return Math.min(...prices);
  });

  resetFilters(): void {
    this.searchControl.setValue('');
    this.categoryControl.setValue('ALL');
  }

  trackByProgram(_: number, program: Program): string {
    return program.id;
  }

  categoryLabel(category: ProgramCategory): string {
    return PROGRAM_CATEGORY_LABELS[category] ?? category;
  }

  levelLabel(level: Program['level']): string {
    return PROGRAM_LEVEL_LABELS[level] ?? level;
  }

  modeLabel(mode: Program['deliveryMode']): string {
    return PROGRAM_DELIVERY_MODE_LABELS[mode] ?? mode;
  }

  priceLabel(program: Program): string {
    const hasDiscount =
      typeof program.discountPrice === 'number' && program.discountPrice > 0;
    const amount = hasDiscount
      ? (program.discountPrice as number)
      : Number(program.price ?? 0);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: program.currency || 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  }
}
