import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Functions, httpsCallable } from '@angular/fire/functions';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  query,
  where,
} from '@angular/fire/firestore';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, of, switchMap } from 'rxjs';
import { AuthService } from '../../../core/auth';

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
  private fb = inject(FormBuilder);

  private createOrgUserFn = httpsCallable<CreateOrgUserPayload, CreateOrgUserResult>(
    this.functions,
    'createOrgUser'
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

      const usersRef = collection(this.afs, 'users');
      const q = query(usersRef, where('orgId', '==', orgId));
      return collectionData(q, { idField: 'uid' }).pipe(
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
}
