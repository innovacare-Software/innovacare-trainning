import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, startWith } from 'rxjs/operators';
import {
  PROGRAM_CATEGORY_LABELS,
  ProgramCategory,
  ProgramStatus,
} from '../shared/program-admin.models';
import { ProgramsAdminService } from '../services/programs-admin.service';
import { StatusPillComponent } from '../shared/status-pill.component';

@Component({
  selector: 'app-programs-management-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, StatusPillComponent],
  template: `
    <section class="panel">
      <header class="head">
        <h1>Programs Management</h1>
        <a routerLink="/program-admin/programs/new" class="btn">Create Program</a>
      </header>

      <section class="filters">
        <input [formControl]="searchControl" placeholder="Search title, subtitle, tags" />
        <select [formControl]="categoryControl">
          <option value="ALL">All categories</option>
          <option *ngFor="let c of categories" [value]="c">{{ PROGRAM_CATEGORY_LABELS[c] }}</option>
        </select>
        <select [formControl]="statusControl">
          <option value="ALL">All statuses</option>
          <option *ngFor="let s of statuses" [value]="s">{{ s }}</option>
        </select>
        <select [formControl]="activeControl">
          <option value="ALL">Active + Inactive</option>
          <option value="YES">Active</option>
          <option value="NO">Inactive</option>
        </select>
      </section>

      <div class="table-wrap" *ngIf="rows().length; else emptyState">
        <table>
          <thead>
            <tr>
              <th>Image</th>
              <th>Title</th>
              <th>Category</th>
              <th>Price</th>
              <th>Delivery Mode</th>
              <th>Featured</th>
              <th>Active</th>
              <th>Status</th>
              <th>Seats Remaining</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of rows(); trackBy: trackById">
              <td><img [src]="row.imageUrl" [alt]="row.title" class="thumb" /></td>
              <td>
                <strong>{{ row.title }}</strong>
                <p>{{ row.subtitle }}</p>
              </td>
              <td>{{ PROGRAM_CATEGORY_LABELS[row.category] }}</td>
              <td>{{ (row.discountPrice ?? row.price) | currency: row.currency:'symbol':'1.0-0' }}</td>
              <td>{{ row.deliveryMode }}</td>
              <td>
                <app-status-pill [label]="row.isFeatured ? 'Yes' : 'No'" [tone]="row.isFeatured ? 'ok' : 'default'"></app-status-pill>
              </td>
              <td>
                <app-status-pill [label]="row.active ? 'Yes' : 'No'" [tone]="row.active ? 'ok' : 'warn'"></app-status-pill>
              </td>
              <td><app-status-pill [label]="row.status"></app-status-pill></td>
              <td>{{ row.seatsRemaining ?? '-' }}</td>
              <td>{{ asDate(row.createdAt) ? (asDate(row.createdAt) | date:'mediumDate') : '-' }}</td>
              <td class="actions">
                <a [routerLink]="['/program-admin/programs', row.id, 'edit']">Edit</a>
                <button type="button" (click)="publish(row.id)">Publish</button>
                <button type="button" (click)="archive(row.id)" class="warn">Archive</button>
                <button type="button" (click)="activate(row.id)">Activate</button>
                <button type="button" (click)="deactivate(row.id)" class="warn">Deactivate</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <ng-template #emptyState>
        <section class="empty">
          <h2>No programs found</h2>
          <p>Create your first public program or adjust filters.</p>
        </section>
      </ng-template>
    </section>
  `,
  styles: [
    `
      .panel { border: 1px solid #d6e3f1; border-radius: 1rem; background: #fff; padding: 1rem; }
      .head { display: flex; justify-content: space-between; align-items: center; gap: 0.7rem; }
      .head h1 { margin: 0; }
      .btn { text-decoration: none; border-radius: 0.7rem; padding: 0.5rem 0.8rem; color: #fff; background: linear-gradient(135deg, #1a74c8, #0f5ca6); }
      .filters { margin-top: 0.8rem; display: grid; grid-template-columns: 1fr 180px 180px 180px; gap: 0.6rem; }
      .filters input, .filters select { border: 1px solid #c9dbee; border-radius: 0.7rem; height: 2.6rem; padding: 0 0.75rem; }
      .table-wrap { margin-top: 0.8rem; overflow: auto; border: 1px solid #dbe6f3; border-radius: 0.8rem; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border-bottom: 1px solid #ebf1f8; padding: 0.65rem; text-align: left; vertical-align: top; }
      th { font-size: 0.76rem; text-transform: uppercase; letter-spacing: 0.08em; color: #5b7797; background: #f6faff; }
      td p { margin: 0.2rem 0 0; color: #607a98; font-size: 0.84rem; }
      .thumb { width: 66px; height: 48px; object-fit: cover; border-radius: 0.5rem; }
      .actions { display: flex; gap: 0.35rem; flex-wrap: wrap; }
      .actions a, .actions button { border: 1px solid #c9dbef; border-radius: 0.58rem; padding: 0.3rem 0.5rem; background: #f8fbff; text-decoration: none; color: #224f7d; cursor: pointer; font-size: 0.78rem; }
      .actions .warn { color: #8a3344; border-color: #efc5ce; background: #fef2f4; }
      .empty { margin-top: 0.85rem; border: 1px dashed #c9d9ea; border-radius: 0.8rem; padding: 1rem; text-align: center; }
      .empty h2 { margin: 0; }
      .empty p { color: #627f9d; }
      @media (max-width: 1200px) { .filters { grid-template-columns: 1fr 1fr; } }
      @media (max-width: 760px) { .filters { grid-template-columns: 1fr; } }
    `,
  ],
})
export class ProgramsManagementPage {
  private readonly programsService = inject(ProgramsAdminService);

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly categoryControl = new FormControl<ProgramCategory | 'ALL'>('ALL', { nonNullable: true });
  readonly statusControl = new FormControl<ProgramStatus | 'ALL'>('ALL', { nonNullable: true });
  readonly activeControl = new FormControl<'ALL' | 'YES' | 'NO'>('ALL', { nonNullable: true });

  readonly programs = toSignal(this.programsService.getAllProgramsForAdmin(), { initialValue: [] });

  readonly searchTerm = toSignal(
    this.searchControl.valueChanges.pipe(startWith(this.searchControl.value), map((v) => v.trim().toLowerCase())),
    { initialValue: '' }
  );

  readonly selectedCategory = toSignal(this.categoryControl.valueChanges.pipe(startWith(this.categoryControl.value)), {
    initialValue: 'ALL' as ProgramCategory | 'ALL',
  });

  readonly selectedStatus = toSignal(this.statusControl.valueChanges.pipe(startWith(this.statusControl.value)), {
    initialValue: 'ALL' as ProgramStatus | 'ALL',
  });

  readonly selectedActive = toSignal(this.activeControl.valueChanges.pipe(startWith(this.activeControl.value)), {
    initialValue: 'ALL' as 'ALL' | 'YES' | 'NO',
  });

  readonly rows = computed(() => {
    const term = this.searchTerm();
    const category = this.selectedCategory();
    const status = this.selectedStatus();
    const active = this.selectedActive();

    return [...this.programs()]
      .filter((row) => {
        const byCategory = category === 'ALL' || row.category === category;
        const byStatus = status === 'ALL' || row.status === status;
        const byActive = active === 'ALL' || (active === 'YES' ? row.active : !row.active);
        const byTerm =
          !term ||
          [row.title, row.subtitle, ...(row.tags || [])]
            .join(' ')
            .toLowerCase()
            .includes(term);

        return byCategory && byStatus && byActive && byTerm;
      })
      .sort((a, b) => this.dateSortDesc(a.createdAt, b.createdAt));
  });

  categories = Object.values(ProgramCategory);
  statuses = Object.values(ProgramStatus);

  protected readonly PROGRAM_CATEGORY_LABELS = PROGRAM_CATEGORY_LABELS;

  async publish(programId: string): Promise<void> {
    await this.programsService.publishProgram(programId);
  }

  async archive(programId: string): Promise<void> {
    await this.programsService.archiveProgram(programId);
  }

  async activate(programId: string): Promise<void> {
    await this.programsService.activateProgram(programId);
  }

  async deactivate(programId: string): Promise<void> {
    await this.programsService.deactivateProgram(programId);
  }

  trackById(_: number, row: { id: string }): string {
    return row.id;
  }

  asDate(value: unknown): Date | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      return value;
    }

    if (typeof value === 'object' && value !== null) {
      const maybeTimestamp = value as { toDate?: () => Date };
      if (typeof maybeTimestamp.toDate === 'function') {
        return maybeTimestamp.toDate();
      }
    }

    return null;
  }

  private dateSortDesc(a: unknown, b: unknown): number {
    const da = this.asDate(a)?.getTime() ?? 0;
    const db = this.asDate(b)?.getTime() ?? 0;
    return db - da;
  }
}
