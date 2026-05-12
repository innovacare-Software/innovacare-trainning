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
import { ProgramsAdminService, type CloneProgramRequest } from '../services/programs-admin.service';
import { StatusPillComponent } from '../shared/status-pill.component';
import { signal } from '@angular/core';
import { AuthService } from '../../../core/auth';

@Component({
  selector: 'app-programs-management-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, StatusPillComponent],
  template: `
    <section class="panel">
      <header class="head">
        <h1>Programs Management</h1>
        <div class="head-actions">
          <a routerLink="/program-admin/programs/import" class="btn-secondary">Import JSON</a>
          <a routerLink="/program-admin/programs/new" class="btn">Create Program</a>
        </div>
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
                <a [routerLink]="['/program-admin/programs', row.id, 'content']">Content</a>
                <button type="button" (click)="publish(row.id)">Publish</button>
                <button type="button" (click)="archive(row.id)" class="warn">Archive</button>
                <button type="button" (click)="activate(row.id)">Activate</button>
                <button type="button" (click)="deactivate(row.id)" class="warn">Deactivate</button>
                <button type="button" (click)="openClone(row.id, row.title)">Duplicate</button>
                <button type="button" (click)="delete(row.id)" class="warn">Delete</button>
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

      <!-- Clone modal -->
      <div class="clone-backdrop" *ngIf="cloneOpen()" (click)="closeClone()">
        <div class="clone-card" (click)="$event.stopPropagation()">
          <header class="clone-head">
            <h2>Duplicate program</h2>
            <button type="button" class="icon" (click)="closeClone()" aria-label="Close">×</button>
          </header>
          <p class="clone-source">Source: <strong>{{ cloneSourceTitle() }}</strong></p>

          <div class="form-grid">
            <label>New title<input [value]="cloneForm().newTitle" (input)="patchClone({ newTitle: $any($event.target).value })" /></label>
            <label>New slug (optional)<input [value]="cloneForm().newSlug" (input)="patchClone({ newSlug: $any($event.target).value })" placeholder="auto-generated if blank" /></label>
            <label>Clone label (optional)<input [value]="cloneForm().cloneLabel" (input)="patchClone({ cloneLabel: $any($event.target).value })" placeholder="e.g. Canada launch" /></label>
            <label>Market<input [value]="cloneForm().market" (input)="patchClone({ market: $any($event.target).value })" placeholder="e.g. CA" /></label>
            <label>Jurisdiction<input [value]="cloneForm().jurisdiction" (input)="patchClone({ jurisdiction: $any($event.target).value })" placeholder="e.g. CA-ON" /></label>
            <label>Language<input [value]="cloneForm().language" (input)="patchClone({ language: $any($event.target).value })" placeholder="e.g. en" /></label>
            <label *ngIf="isSuperAdmin()">Destination Org ID<input [value]="cloneForm().destinationOrgId" (input)="patchClone({ destinationOrgId: $any($event.target).value })" placeholder="leave blank = same org" /></label>
          </div>

          <fieldset class="clone-includes">
            <legend>What to copy</legend>
            <label><input type="checkbox" [checked]="cloneForm().includeModules" (change)="patchClone({ includeModules: $any($event.target).checked })"> Modules</label>
            <label><input type="checkbox" [checked]="cloneForm().includeLessons" (change)="patchClone({ includeLessons: $any($event.target).checked })"> Lessons</label>
            <label><input type="checkbox" [checked]="cloneForm().includeDocuments" (change)="patchClone({ includeDocuments: $any($event.target).checked })"> Resources</label>
            <label><input type="checkbox" [checked]="cloneForm().includeAssessments" (change)="patchClone({ includeAssessments: $any($event.target).checked })"> Assessments</label>
            <label><input type="checkbox" [checked]="cloneForm().includeCaseStudies" (change)="patchClone({ includeCaseStudies: $any($event.target).checked })"> Case studies</label>
            <label><input type="checkbox" [checked]="cloneForm().includeSimulations" (change)="patchClone({ includeSimulations: $any($event.target).checked })"> Simulations</label>
            <label><input type="checkbox" [checked]="cloneForm().includeLiveSessions" (change)="patchClone({ includeLiveSessions: $any($event.target).checked })"> Live sessions</label>
            <label><input type="checkbox" [checked]="cloneForm().includeOffers" (change)="patchClone({ includeOffers: $any($event.target).checked })"> Offers / featured</label>
            <label><input type="checkbox" [checked]="cloneForm().includePricing" (change)="patchClone({ includePricing: $any($event.target).checked })"> Pricing</label>
            <label><input type="checkbox" [checked]="cloneForm().includeCertificateTemplate" (change)="patchClone({ includeCertificateTemplate: $any($event.target).checked })"> Certificate template</label>
            <label *ngIf="isSuperAdmin()"><input type="checkbox" [checked]="cloneForm().publishImmediately" (change)="patchClone({ publishImmediately: $any($event.target).checked })"> Publish immediately (super admin)</label>
          </fieldset>

          <p class="clone-note">Learners, progress, payments and issued certificates are <strong>never</strong> cloned.</p>
          <p class="clone-error" *ngIf="cloneError()">{{ cloneError() }}</p>
          <p class="clone-ok" *ngIf="cloneResult() as r">Created program <strong>{{ r.newProgramId }}</strong> (batch {{ r.cloneBatchId }}).</p>

          <footer class="clone-foot">
            <button type="button" class="btn-secondary" (click)="closeClone()" [disabled]="cloneLoading()">Cancel</button>
            <button type="button" class="btn" (click)="submitClone()" [disabled]="cloneLoading()">{{ cloneLoading() ? 'Cloning…' : 'Confirm duplicate' }}</button>
          </footer>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .panel { border: 1px solid #d6e3f1; border-radius: 1rem; background: #fff; padding: 1rem; }
      .head { display: flex; justify-content: space-between; align-items: center; gap: 0.7rem; }
      .head h1 { margin: 0; }
      .head-actions { display: flex; gap: 0.5rem; }
      .btn { text-decoration: none; border-radius: 0.7rem; padding: 0.5rem 0.8rem; color: #fff; background: linear-gradient(135deg, #1a74c8, #0f5ca6); }
      .btn-secondary { text-decoration: none; border-radius: 0.7rem; padding: 0.5rem 0.8rem; color: #1a74c8; background: #fff; border: 1px solid #c8dff7; font-weight: 600; font-size: 0.88rem; }
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
      .clone-backdrop { position: fixed; inset: 0; background: rgba(15,40,75,0.45); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
      .clone-card { background: #fff; border-radius: 1rem; max-width: 720px; width: 100%; max-height: 92vh; overflow: auto; padding: 1.1rem 1.3rem; box-shadow: 0 30px 60px rgba(15,40,75,0.25); }
      .clone-head { display: flex; justify-content: space-between; align-items: center; }
      .clone-head h2 { margin: 0; color: #173f68; }
      .clone-head .icon { background: transparent; border: 0; font-size: 1.6rem; color: #5f7a96; cursor: pointer; }
      .clone-source { color: #4f7097; margin: 0.4rem 0 0.8rem; }
      .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.55rem 0.75rem; }
      .form-grid label { display: flex; flex-direction: column; font-size: 0.8rem; color: #224f7d; font-weight: 600; gap: 0.25rem; }
      .form-grid input { border: 1px solid #c9dbee; border-radius: 0.55rem; padding: 0.45rem 0.6rem; font-size: 0.88rem; }
      .clone-includes { margin-top: 0.9rem; border: 1px solid #d6e3f1; border-radius: 0.7rem; padding: 0.6rem 0.8rem; display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.3rem; }
      .clone-includes legend { color: #173f68; font-weight: 800; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.06em; padding: 0 0.4rem; }
      .clone-includes label { display: flex; align-items: center; gap: 0.35rem; font-size: 0.84rem; color: #224f7d; }
      .clone-note { margin-top: 0.7rem; font-size: 0.78rem; color: #6d849d; font-style: italic; }
      .clone-error { color: #8a3344; background: #fef2f4; border: 1px solid #efc5ce; padding: 0.5rem 0.7rem; border-radius: 0.6rem; font-size: 0.85rem; }
      .clone-ok { color: #0f6c46; background: #effcf6; border: 1px solid #9dd7be; padding: 0.5rem 0.7rem; border-radius: 0.6rem; font-size: 0.85rem; }
      .clone-foot { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.9rem; }
      .clone-foot .btn, .clone-foot .btn-secondary { cursor: pointer; border: 0; }
      @media (max-width: 700px) { .form-grid, .clone-includes { grid-template-columns: 1fr; } }
      @media (max-width: 1200px) { .filters { grid-template-columns: 1fr 1fr; } }
      @media (max-width: 760px) { .filters { grid-template-columns: 1fr; } }
    `,
  ],
})
export class ProgramsManagementPage {
  private readonly programsService = inject(ProgramsAdminService);
  private readonly authService = inject(AuthService);

  readonly profile = toSignal(this.authService.profile$, { initialValue: null as any });
  readonly isSuperAdmin = computed(() => {
    const p: any = this.profile();
    return p?.platformRole === 'super_admin' || p?.role === 'super_admin';
  });

  readonly cloneOpen = signal(false);
  readonly cloneSourceId = signal<string | null>(null);
  readonly cloneSourceTitle = signal<string>('');
  readonly cloneLoading = signal(false);
  readonly cloneError = signal<string>('');
  readonly cloneResult = signal<{ newProgramId: string; cloneBatchId: string } | null>(null);
  readonly cloneForm = signal<CloneProgramRequest>({
    sourceProgramId: '',
    newTitle: '',
    newSlug: '',
    cloneLabel: '',
    market: '',
    jurisdiction: '',
    language: '',
    destinationOrgId: '',
    includeModules: true,
    includeLessons: true,
    includeDocuments: true,
    includeAssessments: true,
    includeCaseStudies: true,
    includeSimulations: true,
    includeLiveSessions: true,
    includeOffers: false,
    includePricing: false,
    includeCertificateTemplate: true,
    publishImmediately: false,
  });

  openClone(programId: string, title: string): void {
    this.cloneSourceId.set(programId);
    this.cloneSourceTitle.set(title);
    this.cloneError.set('');
    this.cloneResult.set(null);
    this.cloneForm.update((f) => ({ ...f, sourceProgramId: programId, newTitle: `${title} (Copy)` }));
    this.cloneOpen.set(true);
  }

  closeClone(): void {
    if (this.cloneLoading()) return;
    this.cloneOpen.set(false);
  }

  patchClone(patch: Partial<CloneProgramRequest>): void {
    this.cloneForm.update((f) => ({ ...f, ...patch }));
  }

  async submitClone(): Promise<void> {
    const form = this.cloneForm();
    if (!form.sourceProgramId) {
      this.cloneError.set('No source program selected.');
      return;
    }
    this.cloneLoading.set(true);
    this.cloneError.set('');
    this.cloneResult.set(null);
    try {
      const payload: CloneProgramRequest = {
        ...form,
        destinationOrgId: form.destinationOrgId?.trim() || null,
        market: form.market?.trim() || null,
        jurisdiction: form.jurisdiction?.trim() || null,
        language: form.language?.trim() || null,
        cloneLabel: form.cloneLabel?.trim() || null,
      };
      const res = await this.programsService.cloneProgram(payload);
      this.cloneResult.set({ newProgramId: res.newProgramId, cloneBatchId: res.cloneBatchId });
    } catch (err: any) {
      this.cloneError.set(err?.message || 'Clone failed.');
    } finally {
      this.cloneLoading.set(false);
    }
  }

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

  async delete(programId: string): Promise<void> {
    if (!confirm('Delete this program permanently? This cannot be undone.')) {
      return;
    }
    try {
      await this.programsService.deleteProgram(programId);
    } catch (error) {
      console.error('Failed to delete program', error);
      alert('Failed to delete program. Please try again.');
    }
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
