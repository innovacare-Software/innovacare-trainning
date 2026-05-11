import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../../core/auth';
import {
  ASSIGNABLE_USER_ORG_ROLES,
  UserOrgMembership,
  UserOrgMembershipsService,
  UserOrgRole,
} from '../../../../core/organization/user-org-memberships';
import { SuperAdminOrganizationsService } from '../../services/super-admin-organizations';
import { SuperAdminUsersService } from '../../services/super-admin-users';

@Component({
  selector: 'app-user-memberships-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './user-memberships.page.html',
  styleUrls: ['./user-memberships.page.css'],
})
export class UserMembershipsPage {
  private readonly route = inject(ActivatedRoute);
  private readonly memberships = inject(UserOrgMembershipsService);
  private readonly orgsSvc = inject(SuperAdminOrganizationsService);
  private readonly usersSvc = inject(SuperAdminUsersService);
  private readonly auth = inject(AuthService);

  readonly assignableRoles = ASSIGNABLE_USER_ORG_ROLES;
  readonly uid = this.route.snapshot.paramMap.get('uid') ?? '';

  readonly user = toSignal(this.usersSvc.getByUid(this.uid), { initialValue: null });
  readonly orgs = toSignal(this.orgsSvc.list(), { initialValue: [] as any[] });
  readonly userMemberships = toSignal(this.memberships.listForUser(this.uid), {
    initialValue: [] as UserOrgMembership[],
  });

  readonly membershipsByOrg = computed(() => {
    const map = new Map<string, UserOrgMembership>();
    for (const m of this.userMemberships()) {
      map.set(m.orgId, m);
    }
    return map;
  });

  readonly availableOrgsForAssign = computed(() => {
    const taken = new Set(this.userMemberships().map((m) => m.orgId));
    return this.orgs().filter((o: any) => !taken.has(o.id ?? o.orgId));
  });

  // assign form state
  readonly selectedOrgId = signal<string>('');
  readonly selectedRole = signal<UserOrgRole>('learner');
  readonly busy = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);

  private async actor(): Promise<{ uid?: string; email?: string }> {
    const profile = await firstValueFrom(this.auth.profile$);
    return { uid: profile?.uid, email: profile?.email ?? undefined };
  }

  async assign(): Promise<void> {
    const orgId = this.selectedOrgId();
    if (!this.uid || !orgId) {
      this.error.set('Sélectionnez une organisation.');
      return;
    }
    this.error.set(null);
    this.busy.set(true);
    try {
      const actor = await this.actor();
      await this.memberships.assign({
        userId: this.uid,
        orgId,
        role: this.selectedRole(),
        status: 'active',
        assignedBy: actor.uid || 'system',
      });
      this.notice.set('Membership ajouté.');
      this.selectedOrgId.set('');
    } catch (e: any) {
      this.error.set(e?.message ?? 'Échec de l’ajout.');
    } finally {
      this.busy.set(false);
    }
  }

  async changeRole(m: UserOrgMembership, role: UserOrgRole): Promise<void> {
    if (!m.id) return;
    this.error.set(null);
    this.busy.set(true);
    try {
      await this.memberships.setRole(m.id, role);
      this.notice.set(`Rôle mis à jour pour ${m.orgId}.`);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Échec de la mise à jour.');
    } finally {
      this.busy.set(false);
    }
  }

  async toggle(m: UserOrgMembership): Promise<void> {
    if (!m.id) return;
    const next = m.status === 'active' ? 'inactive' : 'active';
    this.error.set(null);
    this.busy.set(true);
    try {
      await this.memberships.setStatus(m.id, next);
      this.notice.set(`Membership ${next === 'active' ? 'activé' : 'désactivé'}.`);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Échec.');
    } finally {
      this.busy.set(false);
    }
  }

  async remove(m: UserOrgMembership): Promise<void> {
    if (!m.id) return;
    if (!confirm(`Retirer le membership ${m.role} sur ${m.orgId} ?`)) return;
    this.error.set(null);
    this.busy.set(true);
    try {
      await this.memberships.remove(m.id);
      this.notice.set('Membership retiré.');
    } catch (e: any) {
      this.error.set(e?.message ?? 'Échec.');
    } finally {
      this.busy.set(false);
    }
  }

  orgName(orgId: string): string {
    const o: any = this.orgs().find((x: any) => (x.id ?? x.orgId) === orgId);
    return o?.name ?? orgId;
  }
}
