import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, startWith, switchMap } from 'rxjs/operators';
import { combineLatest, of } from 'rxjs';
import { AuthService } from '../../../core/auth';
import {
  ProgramAdminUserRole,
  ProgramAdminUsersService,
  OrgUserRow,
} from './program-admin-users.service';

const ROLE_LABELS: Record<ProgramAdminUserRole, string> = {
  admin: 'Administrator',
  manager: 'Manager',
  instructor: 'Instructor',
  tutor: 'Tutor',
  staff: 'Staff',
  learner: 'Learner',
  guest: 'Guest',
};

@Component({
  selector: 'app-program-admin-users-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <section class="panel">
      <header class="head">
        <h1>Users</h1>
        <span class="scope-pill" *ngIf="scopeLabel() as l">{{ l }}</span>
        <button type="button" class="btn" (click)="openCreate()">+ New user</button>
      </header>

      <div class="filters">
        <input [formControl]="searchControl" placeholder="Search name, email, role" />
        <select [formControl]="roleControl">
          <option value="ALL">All roles</option>
          <option *ngFor="let r of roles" [value]="r">{{ ROLE_LABELS[r] }}</option>
        </select>
      </div>

      <div class="table-wrap" *ngIf="rows().length; else emptyState">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Org</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let u of rows(); trackBy: trackByUid">
              <td><strong>{{ u.displayName || '—' }}</strong></td>
              <td>{{ u.email || '—' }}</td>
              <td>{{ u.role || '—' }}</td>
              <td>
                <span class="pill" [class.warn]="u.active === false">
                  {{ u.active === false ? 'Inactive' : 'Active' }}
                </span>
              </td>
              <td>{{ u.orgId || '—' }}</td>
              <td>{{ asDate(u.createdAt) ? (asDate(u.createdAt) | date:'medium') : '—' }}</td>
              <td>
                <button type="button" class="btn-secondary" (click)="resetPassword(u)">Reset password</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <ng-template #emptyState>
        <section class="empty">No users found.</section>
      </ng-template>

      <!-- Create modal -->
      <div class="modal-back" *ngIf="modalOpen()" (click)="closeModal()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <header class="modal-head">
            <h2>Create user</h2>
            <button class="icon" type="button" (click)="closeModal()" aria-label="Close">×</button>
          </header>

          <div class="form-grid">
            <label>Email
              <input type="email" [(ngModel)]="form.email" />
            </label>
            <label>Display name
              <input type="text" [(ngModel)]="form.displayName" />
            </label>
            <label>Role
              <select [(ngModel)]="form.role">
                <option *ngFor="let r of allowedRoles()" [value]="r">{{ ROLE_LABELS[r] }}</option>
              </select>
            </label>
            <label>Status
              <select [(ngModel)]="form.status">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label>Initial password
              <input type="text" [(ngModel)]="form.password" placeholder="min. 8 chars" />
            </label>
            <label>Phone
              <input type="text" [(ngModel)]="form.phone" />
            </label>
            <label>Department
              <input type="text" [(ngModel)]="form.department" />
            </label>
            <label>Title
              <input type="text" [(ngModel)]="form.title" />
            </label>
          </div>

          <p class="error" *ngIf="error()">{{ error() }}</p>
          <p class="ok" *ngIf="successMsg()">{{ successMsg() }}</p>

          <footer class="modal-foot">
            <button type="button" class="btn-secondary" (click)="closeModal()" [disabled]="loading()">Cancel</button>
            <button type="button" class="btn" (click)="submit()" [disabled]="loading()">
              {{ loading() ? 'Creating…' : 'Create user' }}
            </button>
          </footer>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .panel { border: 1px solid #d6e3f1; border-radius: 1rem; background: #fff; padding: 1rem; }
    .head { display: flex; align-items: center; gap: 0.7rem; }
    .head h1 { margin: 0; flex: 1; }
    .btn { border: 0; cursor: pointer; border-radius: 0.7rem; padding: 0.5rem 0.85rem; color: #fff; background: linear-gradient(135deg, #1a74c8, #0f5ca6); font-weight: 600; }
    .btn-secondary { border: 1px solid #c8dff7; cursor: pointer; border-radius: 0.7rem; padding: 0.5rem 0.85rem; color: #1a74c8; background: #fff; font-weight: 600; }
    .scope-pill { background: #eef4fb; color: #224f7d; border-radius: 999px; padding: 0.18rem 0.7rem; font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; }
    .filters { margin-top: 0.8rem; display: grid; grid-template-columns: 1fr 200px; gap: 0.55rem; }
    .filters input, .filters select { border: 1px solid #c9dbee; border-radius: 0.7rem; height: 2.6rem; padding: 0 0.75rem; }
    .table-wrap { margin-top: 0.75rem; overflow: auto; border: 1px solid #dce7f3; border-radius: 0.8rem; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border-bottom: 1px solid #ebf1f8; padding: 0.65rem; text-align: left; }
    th { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; color: #5e7898; background: #f6faff; }
    .pill { display: inline-block; background: #e6f5ec; color: #157f48; padding: 0.18rem 0.55rem; border-radius: 999px; font-size: 0.75rem; font-weight: 700; }
    .pill.warn { background: #fdf0f1; color: #8a3344; }
    .empty { margin-top: 0.8rem; border: 1px dashed #c7d8ea; border-radius: 0.8rem; text-align: center; padding: 1rem; color: #607a98; }
    .modal-back { position: fixed; inset: 0; background: rgba(15,40,75,0.45); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; }
    .modal-card { background: #fff; border-radius: 1rem; max-width: 640px; width: 100%; max-height: 92vh; overflow: auto; padding: 1.1rem 1.3rem; box-shadow: 0 30px 60px rgba(15,40,75,0.25); }
    .modal-head { display: flex; justify-content: space-between; align-items: center; }
    .modal-head h2 { margin: 0; color: #173f68; }
    .modal-head .icon { background: transparent; border: 0; font-size: 1.6rem; color: #5f7a96; cursor: pointer; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.55rem 0.75rem; margin-top: 0.6rem; }
    .form-grid label { display: flex; flex-direction: column; font-size: 0.8rem; color: #224f7d; font-weight: 600; gap: 0.25rem; }
    .form-grid input, .form-grid select { border: 1px solid #c9dbee; border-radius: 0.55rem; padding: 0.45rem 0.6rem; font-size: 0.88rem; }
    .error { color: #8a3344; background: #fef2f4; border: 1px solid #efc5ce; padding: 0.5rem 0.7rem; border-radius: 0.6rem; font-size: 0.85rem; margin-top: 0.7rem; }
    .ok { color: #0f6c46; background: #effcf6; border: 1px solid #9dd7be; padding: 0.5rem 0.7rem; border-radius: 0.6rem; font-size: 0.85rem; margin-top: 0.7rem; }
    .modal-foot { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.9rem; }
    @media (max-width: 700px) { .form-grid { grid-template-columns: 1fr; } .filters { grid-template-columns: 1fr; } }
  `],
})
export class ProgramAdminUsersPage {
  private readonly users = inject(ProgramAdminUsersService);
  private readonly auth = inject(AuthService);

  private readonly passwordAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';

  readonly profile = toSignal(this.auth.profile$, { initialValue: null as any });
  readonly isSuperAdmin = computed(() => {
    const p: any = this.profile();
    return p?.platformRole === 'super_admin' || p?.role === 'super_admin';
  });
  readonly orgId = computed<string | null>(() => (this.profile() as any)?.orgId || null);
  readonly scopeLabel = computed(() => {
    if (this.isSuperAdmin()) return 'All organizations';
    const id = this.orgId();
    return id ? `Org: ${id}` : '';
  });

  readonly ROLE_LABELS = ROLE_LABELS;
  readonly roles: ProgramAdminUserRole[] = ['admin', 'manager', 'instructor', 'tutor', 'staff', 'learner', 'guest'];

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly roleControl = new FormControl<'ALL' | ProgramAdminUserRole>('ALL', { nonNullable: true });

  // Reactively reload list when profile resolves
  private readonly profile$ = this.auth.profile$;
  readonly items = toSignal(
    this.profile$.pipe(
      switchMap((p: any) => {
        const isSA = p?.platformRole === 'super_admin' || p?.role === 'super_admin';
        return this.users.listUsers(p?.orgId || null, isSA);
      })
    ),
    { initialValue: [] as OrgUserRow[] }
  );

  readonly searchTerm = toSignal(
    this.searchControl.valueChanges.pipe(startWith(''), map((v) => (v || '').trim().toLowerCase())),
    { initialValue: '' }
  );
  readonly selectedRole = toSignal(this.roleControl.valueChanges.pipe(startWith('ALL' as any)), {
    initialValue: 'ALL' as 'ALL' | ProgramAdminUserRole,
  });

  readonly rows = computed(() => {
    const term = this.searchTerm();
    const role = this.selectedRole();
    return this.items().filter((u) => {
      const byRole = role === 'ALL' || u.role === role;
      const byTerm = !term || [u.displayName, u.email, u.role].join(' ').toLowerCase().includes(term);
      return byRole && byTerm;
    });
  });

  // ---- Create modal ----
  readonly modalOpen = signal(false);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly successMsg = signal('');
  form: {
    email: string; displayName: string; password: string; role: ProgramAdminUserRole;
    status: 'active' | 'inactive'; phone: string; department: string; title: string;
  } = this.blankForm();

  blankForm() {
    return {
      email: '', displayName: '', password: '', role: 'instructor' as ProgramAdminUserRole,
      status: 'active' as 'active' | 'inactive', phone: '', department: '', title: '',
    };
  }

  allowedRoles = computed<ProgramAdminUserRole[]>(() => {
    // Only super_admin can create 'admin'
    return this.isSuperAdmin()
      ? this.roles
      : (this.roles.filter((r) => r !== 'admin') as ProgramAdminUserRole[]);
  });

  openCreate(): void {
    this.form = this.blankForm();
    this.error.set('');
    this.successMsg.set('');
    this.modalOpen.set(true);
  }

  closeModal(): void {
    if (this.loading()) return;
    this.modalOpen.set(false);
  }

  async submit(): Promise<void> {
    this.error.set('');
    this.successMsg.set('');
    if (!this.form.email.trim() || !this.form.email.includes('@')) {
      this.error.set('A valid email is required.');
      return;
    }
    if ((this.form.password || '').length < 8) {
      this.error.set('Password must be at least 8 characters.');
      return;
    }
    this.loading.set(true);
    try {
      const res = await this.users.createUser({
        email: this.form.email.trim().toLowerCase(),
        password: this.form.password,
        displayName: this.form.displayName.trim(),
        phone: this.form.phone.trim(),
        department: this.form.department.trim(),
        title: this.form.title.trim(),
        role: this.form.role,
        status: this.form.status,
      });
      this.successMsg.set(`User created: ${res.email} (${res.uid}).`);
      this.form = this.blankForm();
    } catch (err: any) {
      this.error.set(err?.message || 'Failed to create user.');
    } finally {
      this.loading.set(false);
    }
  }

  private generateTemporaryPassword(length = 14): string {
    const bytes = new Uint32Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (value) => this.passwordAlphabet[value % this.passwordAlphabet.length]).join('');
  }

  private async copyToClipboard(value: string): Promise<boolean> {
    try {
      if (!navigator?.clipboard?.writeText) {
        return false;
      }
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      return false;
    }
  }

  async resetPassword(user: OrgUserRow): Promise<void> {
    this.error.set('');
    this.successMsg.set('');

    const password = this.generateTemporaryPassword();
    const confirmed = window.confirm(
      `Generate and apply a temporary password for ${user.email || user.uid}?`
    );

    if (!confirmed) {
      return;
    }

    this.loading.set(true);
    try {
      const result = await this.users.resetUserPassword({ uid: user.uid, password });
      const target = result.email || user.email || user.uid;
      const copied = await this.copyToClipboard(password);
      this.successMsg.set(
        `Temporary password set for ${target}: ${password}${copied ? ' (copied to clipboard)' : ''}`
      );
    } catch (err: any) {
      this.error.set(err?.message || 'Failed to reset user password.');
    } finally {
      this.loading.set(false);
    }
  }

  trackByUid = (_: number, u: OrgUserRow) => u.uid;
  asDate(value: any): Date | null {
    if (!value) return null;
    if (typeof value?.toDate === 'function') return value.toDate();
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
}
