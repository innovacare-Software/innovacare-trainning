import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import {
  OrganizationDetailsViewModel,
  OrganizationListRowViewModel,
  SuperAdminOrganization,
} from '../models/super-admin.models';
import { SuperAdminOrganizationsService } from './super-admin-organizations';

export interface OrgQuickLink {
  label: string;
  path: string;
  hint: string;
}

@Injectable({ providedIn: 'root' })
export class SuperAdminOrgContextService {
  private organizations = inject(SuperAdminOrganizationsService);

  loadOrgContext(orgId: string): Observable<OrganizationDetailsViewModel | null> {
    return this.organizations.getOrganizationDetailsViewModel(orgId);
  }

  getOrgQuickLinks(orgId: string): OrgQuickLink[] {
    return [
      {
        label: 'Users',
        path: `/super-admin/organizations/${orgId}/users`,
        hint: 'Inspect users, roles and statuses for this organization.',
      },
      {
        label: 'Assign Courses',
        path: `/super-admin/organizations/${orgId}/assign-courses`,
        hint: 'Control the exact course catalog allowed for this tenant.',
      },
      {
        label: 'Progress',
        path: `/super-admin/organizations/${orgId}/progress`,
        hint: 'Open completion and enrollment diagnostics.',
      },
      {
        label: 'Policies',
        path: `/super-admin/organizations/${orgId}/policies`,
        hint: 'Review policy state and publication consistency.',
      },
      {
        label: 'Wound Library',
        path: `/super-admin/organizations/${orgId}/wound-library`,
        hint: 'Inspect clinical content mapped to the tenant.',
      },
      {
        label: 'Reports',
        path: `/super-admin/organizations/${orgId}/reports`,
        hint: 'Generate completion/compliance reports for this organization.',
      },
      {
        label: 'Audit',
        path: `/super-admin/organizations/${orgId}/audit`,
        hint: 'Review who changed what and when in this tenant.',
      },
      {
        label: 'Troubleshooting',
        path: `/super-admin/organizations/${orgId}/troubleshooting`,
        hint: 'Open diagnosis and quick remediation actions.',
      },
    ];
  }

  buildOrgTroubleshootingContext(org: SuperAdminOrganization): string[] {
    return [
      `Org ID: ${org.id || 'unknown'}`,
      `Org Name: ${org.name}`,
      `Plan: ${org.plan}`,
      `Status: ${org.active === false ? 'inactive' : 'active'}`,
      `Owner UID: ${org.ownerUid || 'not-set'}`,
      `Owner Email: ${org.ownerEmail || 'not-set'}`,
    ];
  }

  getOrganizationsWithSummary(): Observable<OrganizationListRowViewModel[]> {
    return this.organizations.getOrganizationsWithStats().pipe(
      map((rows) =>
        rows.sort((a, b) => (a.organization.name || '').localeCompare(b.organization.name || ''))
      )
    );
  }
}
