import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { toSignal } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';
import { AuthService } from '../../../core/auth';
import { OrganizationHierarchyService } from '../../../core/organization/services/organization-hierarchy.service';
import { OrganizationCouncilRollupService } from '../../../core/organization/services/organization-council-rollup.service';

type CreateOrgUserPayload = {
  email: string;
  password: string;
  displayName?: string;
  role: 'admin';
  status: 'active';
  targetOrgId: string;
};

type CreateOrgUserResult = {
  ok: boolean;
  uid: string;
  email: string;
};

@Component({
  selector: 'app-council',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './council.html',
  styleUrl: './council.css',
})
export class CouncilComponent {
  private readonly auth = inject(AuthService);
  private readonly functions = inject(Functions);
  private readonly hierarchy = inject(OrganizationHierarchyService);
  private readonly rollupService = inject(OrganizationCouncilRollupService);
  private readonly fb = inject(FormBuilder);

  private readonly createOrgUserFn = httpsCallable<CreateOrgUserPayload, CreateOrgUserResult>(
    this.functions,
    'createOrgUser'
  );

  private readonly profile = toSignal(this.auth.profile$, { initialValue: null });
  readonly orgId = computed(() => String(this.profile()?.orgId || '').trim() || null);

  readonly regions = toSignal(
    this.auth.profile$.pipe(
      switchMap((profile) => {
        const orgId = String(profile?.orgId || '').trim();
        return orgId ? this.hierarchy.listChildren(orgId) : of([]);
      })
    ),
    { initialValue: [] }
  );

  readonly rollup = toSignal(
    this.auth.profile$.pipe(
      switchMap((profile) => {
        const orgId = String(profile?.orgId || '').trim();
        return orgId ? this.rollupService.rollup(orgId) : of(null);
      })
    ),
    { initialValue: null }
  );

  readonly creatingRegion = signal(false);
  readonly regionNotice = signal<string | null>(null);

  readonly regionForm = this.fb.group({
    name: ['', Validators.required],
    contactName: [''],
    contactEmail: ['', Validators.email],
    contactPhone: [''],
  });

  readonly creatingAdmin = signal(false);
  readonly adminNotice = signal<string | null>(null);

  readonly adminForm = this.fb.group({
    targetOrgId: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    initialPassword: ['', [Validators.required, Validators.minLength(8)]],
    displayName: [''],
  });

  async createRegion(): Promise<void> {
    if (this.regionForm.invalid) {
      this.regionForm.markAllAsTouched();
      return;
    }
    const parentOrgId = this.orgId();
    if (!parentOrgId) {
      this.regionNotice.set('Aucune organisation détectée pour votre compte.');
      return;
    }

    const value = this.regionForm.getRawValue();
    this.creatingRegion.set(true);
    this.regionNotice.set(null);

    try {
      const newOrgId = await this.hierarchy.createRegion({
        parentOrgId,
        name: String(value.name || '').trim(),
        contactName: String(value.contactName || '').trim() || undefined,
        contactEmail: String(value.contactEmail || '').trim() || undefined,
        contactPhone: String(value.contactPhone || '').trim() || undefined,
      });
      this.regionNotice.set(`Région créée (ID: ${newOrgId}).`);
      this.regionForm.reset({ name: '', contactName: '', contactEmail: '', contactPhone: '' });
    } catch (error: any) {
      this.regionNotice.set(error?.message || 'Impossible de créer cette région.');
    } finally {
      this.creatingRegion.set(false);
    }
  }

  async createRegionAdmin(): Promise<void> {
    if (this.adminForm.invalid) {
      this.adminForm.markAllAsTouched();
      return;
    }

    const value = this.adminForm.getRawValue();
    const email = String(value.email || '').trim().toLowerCase();
    const targetOrgId = String(value.targetOrgId || '').trim();

    this.creatingAdmin.set(true);
    this.adminNotice.set(null);

    try {
      const result = await this.createOrgUserFn({
        email,
        password: String(value.initialPassword || ''),
        displayName: String(value.displayName || '').trim(),
        role: 'admin',
        status: 'active',
        targetOrgId,
      });

      await this.auth.resetPassword(email);

      this.adminNotice.set(
        `Administrateur créé pour cette région (UID: ${result.data.uid}). Un email de changement de mot de passe a été envoyé.`
      );
      this.adminForm.reset({ targetOrgId: '', email: '', initialPassword: '', displayName: '' });
    } catch (error: any) {
      this.adminNotice.set(error?.message || 'Impossible de créer cet administrateur régional.');
    } finally {
      this.creatingAdmin.set(false);
    }
  }
}
