import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap } from 'rxjs';
import { SuperAdminOrgContextService } from '../../services/super-admin-org-context.service';

@Component({
  selector: 'app-org-details',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './org-details.html',
  styleUrl: './org-details.css',
})
export class OrgDetails {
  private route = inject(ActivatedRoute);
  private context = inject(SuperAdminOrgContextService);

  orgId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('orgId') || params.get('id') || '')),
    { initialValue: '' }
  );

  vm = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get('orgId') || params.get('id') || ''),
      switchMap((orgId) => this.context.loadOrgContext(orgId))
    ),
    { initialValue: null }
  );

  quickLinks = computed(() => {
    const orgId = this.orgId();
    return orgId ? this.context.getOrgQuickLinks(orgId) : [];
  });

  troubleshootContext = computed(() => {
    const vm = this.vm();
    if (!vm) return [];
    return this.context.buildOrgTroubleshootingContext(vm.organization);
  });

}
