import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Functions, httpsCallable } from '@angular/fire/functions';
import {
  Firestore,
} from '@angular/fire/firestore';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, of, switchMap } from 'rxjs';
import { AuthService } from '../../../core/auth';
import { OrganizationUsersService } from '../../../core/organization/services/organization-users.service';

type OrgUserRole = 'admin' | 'manager' | 'learner' | 'guest';
type OrgUserStatus = 'active' | 'inactive';

type CreateOrgUserPayload = {
  email: string;
  password: string;
  displayName?: string;
  phone?: string;
  department?: string;
  title?: string;
  role: OrgUserRole;
  status: OrgUserStatus;
};

type CreateOrgUserResult = {
  ok: boolean;
  uid: string;
  email: string;
};

type ResetOrgUserPasswordPayload = {
  uid: string;
  password: string;
};

type ResetOrgUserPasswordResult = {
  ok: boolean;
  uid: string;
  email: string | null;
};

type OrgUserRow = {
  uid: string;
  email?: string;
  displayName?: string;
  phone?: string;
  department?: string;
  title?: string;
  role?: OrgUserRole;
  status?: OrgUserStatus;
  orgId?: string | null;
  active?: boolean;
};

@Component({
  selector: 'app-org-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './org-users.html',
  styleUrl: './org-users.css',
})
export class OrgUsersComponent {
  private afs = inject(Firestore);
  private functions = inject(Functions);
  private auth = inject(AuthService);
  private orgUsers = inject(OrganizationUsersService);
  private fb = inject(FormBuilder);
  private readonly passwordAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';

  private createOrgUserFn = httpsCallable<CreateOrgUserPayload, CreateOrgUserResult>(
    this.functions,
    'createOrgUser'
  );
  private resetOrgUserPasswordFn = httpsCallable<ResetOrgUserPasswordPayload, ResetOrgUserPasswordResult>(
    this.functions,
    'resetOrgUserPassword'
  );

  readonly saving = signal(false);
  readonly notice = signal<string | null>(null);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    initialPassword: ['', [Validators.required, Validators.minLength(8)]],
    displayName: [''],
    phone: [''],
    department: [''],
    title: [''],
    role: this.fb.nonNullable.control<OrgUserRole>('learner'),
    status: this.fb.nonNullable.control<OrgUserStatus>('active'),
  });

  private readonly profile = toSignal(this.auth.profile$, { initialValue: null });
  readonly orgId = computed(() => this.profile()?.orgId ?? null);

  private readonly usersByOrg$ = this.auth.profile$.pipe(
    switchMap((profile) => {
      const orgId = String(profile?.orgId || '').trim();
      if (!orgId) return of([] as OrgUserRow[]);

      return this.orgUsers.list(orgId).pipe(
        map((rows) => rows.map((u) => ({
          uid: u.uid,
          email: u.email,
          displayName: u.displayName,
          phone: '',
          department: u.department,
          title: u.title,
          role: u.role as OrgUserRole,
          status: u.active ? 'active' : 'inactive',
          orgId,
          active: u.active,
        } as OrgUserRow))),
        map((rows) =>
          (rows as OrgUserRow[])
            .slice()
            .sort((a, b) => (a.displayName || a.email || '').localeCompare(b.displayName || b.email || ''))
        )
      );
    })
  );

  readonly users = toSignal(this.usersByOrg$, { initialValue: [] as OrgUserRow[] });

  async addUserToOrganization(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const orgId = String(this.orgId() || '').trim();
    if (!orgId) {
      this.notice.set('Aucune organisation détectée pour votre compte.');
      return;
    }

    const value = this.form.getRawValue();
    const email = String(value.email || '').trim().toLowerCase();
    const initialPassword = String(value.initialPassword || '');

    this.saving.set(true);
    this.notice.set(null);

    try {
      const result = await this.createOrgUserFn({
        email,
        password: initialPassword,
        displayName: String(value.displayName || '').trim(),
        phone: String(value.phone || '').trim(),
        department: String(value.department || '').trim(),
        title: String(value.title || '').trim(),
        role: value.role,
        status: value.status,
      });

      await this.auth.resetPassword(email);

      this.notice.set(
        `Utilisateur créé (UID: ${result.data.uid}). Un email de changement de mot de passe a été envoyé.`
      );
      this.form.patchValue({
        email: '',
        initialPassword: '',
        displayName: '',
        phone: '',
        department: '',
        title: '',
        role: 'learner',
        status: 'active',
      });
      this.form.markAsPristine();
      this.form.markAsUntouched();
    } catch (error: any) {
      this.notice.set(error?.message || 'Impossible d\'ajouter cet utilisateur.');
    } finally {
      this.saving.set(false);
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

  async resetUserPassword(user: OrgUserRow): Promise<void> {
    const password = this.generateTemporaryPassword();
    const confirmed = window.confirm(
      `Générer et appliquer un mot de passe temporaire pour ${user.email || user.uid} ?`
    );

    if (!confirmed) {
      return;
    }

    this.saving.set(true);
    this.notice.set(null);

    try {
      const result = await this.resetOrgUserPasswordFn({
        uid: user.uid,
        password,
      });
      const target = result.data.email || user.email || user.uid;
      const copied = await this.copyToClipboard(password);
      this.notice.set(`Mot de passe temporaire défini pour ${target} : ${password}${copied ? ' (copié dans le presse-papiers)' : ''}`);
    } catch (error: any) {
      this.notice.set(error?.message || 'Impossible de modifier ce mot de passe.');
    } finally {
      this.saving.set(false);
    }
  }
}
