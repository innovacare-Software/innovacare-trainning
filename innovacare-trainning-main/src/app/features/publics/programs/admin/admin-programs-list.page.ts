import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { map, startWith } from 'rxjs/operators';
import { PROGRAM_CATEGORY_LABELS, ProgramCategory } from '../program.models';
import { ProgramsService } from '../programs.service';

@Component({
  selector: 'app-admin-programs-list-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './admin-programs-list.page.html',
  styleUrls: ['./admin-programs-list.page.css'],
})
export class AdminProgramsListPage {
  private readonly programsService = inject(ProgramsService);

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly categoryControl = new FormControl<ProgramCategory | 'ALL'>('ALL', {
    nonNullable: true,
  });

  readonly programs = toSignal(this.programsService.getAdminPrograms(), { initialValue: [] });
  readonly searchTerm = toSignal(
    this.searchControl.valueChanges.pipe(
      startWith(this.searchControl.value),
      map((x) => x.trim().toLowerCase())
    ),
    { initialValue: '' }
  );

  readonly selectedCategory = toSignal(
    this.categoryControl.valueChanges.pipe(startWith(this.categoryControl.value)),
    { initialValue: 'ALL' as ProgramCategory | 'ALL' }
  );

  readonly rows = computed(() => {
    const term = this.searchTerm();
    const category = this.selectedCategory();
    return this.programs().filter((program) => {
      const byCategory = category === 'ALL' || program.category === category;
      const byTerm =
        !term ||
        [program.title, program.subtitle, ...(program.tags || [])]
          .join(' ')
          .toLowerCase()
          .includes(term);
      return byCategory && byTerm;
    });
  });

  categories = Object.values(ProgramCategory);
  categoryLabels = PROGRAM_CATEGORY_LABELS;

  async archive(programId: string): Promise<void> {
    await this.programsService.archiveProgram(programId);
  }

  async publish(programId: string): Promise<void> {
    await this.programsService.publishProgram(programId);
  }

  trackById(_: number, row: { id: string }): string {
    return row.id;
  }
}
