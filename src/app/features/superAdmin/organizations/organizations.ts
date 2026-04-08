import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { SuperAdminOrganizationsService } from '../services/super-admin-organizations';
import { OrgType } from '../../../data/models';
import { PlanType } from '../models/super-admin.models';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-organizations',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './organizations.html',
  styleUrl: './organizations.css'
})
export class Organizations {
  private orgSvc = inject(SuperAdminOrganizationsService);

  search = signal('');
  typeFilter = signal<OrgType | 'all'>('all');
  planFilter = signal<PlanType | 'all'>('all');

  page = signal(1);
  pageSize = 12;

  loading = signal(false);
  notice = signal('');

  newOrg = {
    orgId: '',
    name: '',
    type: 'health' as OrgType,
    plan: 'free' as PlanType,
    ownerUid: '',
    ownerEmail: '',
    ownerDisplayName: '',
    accessCode: '',

  };

  rows = toSignal(this.orgSvc.getOrganizationsWithStatsLive(), { initialValue: [] });

  filteredRows = computed(() => {
    const term = this.search().trim().toLowerCase();
    const type = this.typeFilter();
    const plan = this.planFilter();

    return this.rows().filter((row) => {
      const org = row.organization;
      const matchesType = type === 'all' ? true : org.type === type;
      const matchesPlan = plan === 'all' ? true : org.plan === plan;
      const blob = `${org.name || ''} ${org.ownerEmail || ''} ${org.id || ''} ${(org.orgId || '')}`.toLowerCase();
      const matchesSearch = !term || blob.includes(term);
      return matchesType && matchesPlan && matchesSearch;
    });
  });

  pagedRows = computed(() => {
    const start = Math.max(0, (this.page() - 1) * this.pageSize);
    return this.filteredRows().slice(start, start + this.pageSize);
  });

  summary = computed(() => {
    const rows = this.filteredRows();
    const activeOrgs = rows.filter((x) => x.organization.active !== false).length;
    const totalUsers = rows.reduce((sum, x) => sum + x.usersCount, 0);
    const totalAssignedCourses = rows.reduce((sum, x) => sum + x.assignedCoursesCount, 0);
    return {
      organizations: rows.length,
      activeOrgs,
      totalUsers,
      totalAssignedCourses,
    };
  });

  applyFilters() {
    this.page.set(1);
  }

  nextPage() {
    const next = this.page() + 1;
    const maxPage = Math.max(1, Math.ceil(this.filteredRows().length / this.pageSize));
    this.page.set(Math.min(next, maxPage));
  }

  prevPage() {
    if (this.page() > 1) {
      this.page.set(this.page() - 1);
    }
  }

  scrollToForm() {
    const formElement = document.querySelector('app-organizations');
    formElement?.scrollIntoView({ behavior: 'smooth' });
  }

  resetForm() {
    this.newOrg = {
      orgId: '',
      name: '',
      type: 'health',
      plan: 'free',
      ownerUid: '',
      ownerEmail: '',
      ownerDisplayName: '',
      accessCode: '',
    };
    this.notice.set('');
  }

  async createWithOwner() {
    if (!this.newOrg.name || !this.newOrg.ownerUid || !this.newOrg.ownerEmail) {
      this.notice.set('Name, owner UID and owner email are required.');
      return;
    }

    this.loading.set(true);
    this.notice.set('');
    try {
      await this.orgSvc.createWithOwner({
        organization: {
          name: this.newOrg.name,
          type: this.newOrg.type,
          plan: this.newOrg.plan,
          active: true,
          orgId: this.newOrg.orgId || undefined,
        },
        owner: {
          uid: this.newOrg.ownerUid,
          email: this.newOrg.ownerEmail,
          displayName: this.newOrg.ownerDisplayName,
        },
      });

      this.notice.set('Organization created successfully.');
      this.newOrg = {
        orgId: '',
        name: '',
        type: 'health',
        plan: 'free',
        ownerUid: '',
        ownerEmail: '',
        ownerDisplayName: '',
        accessCode: '',
      };
      this.applyFilters();
    } catch (e: any) {
      this.notice.set(e?.message || 'Failed to create organization.');
    } finally {
      this.loading.set(false);
    }
  }

  async editOrganization(orgId: string | undefined) {
    if (!orgId || orgId.trim() === '') {
      this.notice.set('Organization ID is required.');
      return;
    }
    if (!this.newOrg.name || this.newOrg.name.trim() === '') {
      this.notice.set('Organization name is required.');
      return;
    }

    this.loading.set(true);
    this.notice.set('');
    try {
      await this.orgSvc.update(orgId, {
        name: this.newOrg.name,
        type: this.newOrg.type,
        plan: this.newOrg.plan,
      });

      this.notice.set('Organization updated successfully.');
      this.resetForm();
      this.applyFilters();
    } catch (e: any) {
      this.notice.set(e?.message || 'Failed to update organization.');
    } finally {
      this.loading.set(false);
    }
  }

  async deleteOrganization(orgId: string | undefined) {
    if (!orgId) {
      this.notice.set('Organization ID is required.');
      return;
    }

    this.loading.set(true);
    this.notice.set('');
    try {
      await this.orgSvc.delete(orgId);
      this.notice.set('Organization deleted successfully.');
      this.applyFilters();
    } catch (e: any) {
      this.notice.set(e?.message || 'Failed to delete organization.');
    } finally {
      this.loading.set(false);
    }
  }

  totalPages() {
    return Math.max(1, Math.ceil(this.filteredRows().length / this.pageSize));
  }
}