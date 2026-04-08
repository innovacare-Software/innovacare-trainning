import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { ProgramResourcesAdminService } from '../services/program-resources-admin.service';
import { RESOURCE_TYPE_LABELS, ResourceType } from '../models/content-builder.models';

@Component({
  selector: 'app-resources-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="resources-page">
      <header class="page-header">
        <a [routerLink]="['/program-admin/programs', programId(), 'content']" class="back-link">← Content Dashboard</a>
        <h1>Resources</h1>
        <p class="subtitle">All downloadable resources and materials for this program.</p>
      </header>

      <div class="resources-grid" *ngIf="(resources()?.length ?? 0) > 0; else empty">
        <article class="resource-card" *ngFor="let res of resources()">
          <div class="resource-icon">
            <span>{{ getIcon(res.resourceType) }}</span>
          </div>
          <div class="resource-info">
            <strong>{{ res.title }}</strong>
            <p>{{ res.description }}</p>
            <div class="resource-meta">
              <span class="type-pill">{{ RESOURCE_LABELS[res.resourceType] }}</span>
              <span class="pill" *ngIf="res.downloadable">Downloadable</span>
            </div>
          </div>
          <div class="resource-actions">
            <a *ngIf="res.fileUrl" [href]="res.fileUrl" target="_blank" rel="noopener noreferrer" class="btn-view">View</a>
            <a *ngIf="res.externalUrl" [href]="res.externalUrl" target="_blank" rel="noopener noreferrer" class="btn-link">↗ Link</a>
            <a *ngIf="res.downloadable && res.fileUrl" [href]="res.fileUrl" download class="btn-download">↓ Download</a>
          </div>
        </article>
      </div>

      <ng-template #empty>
        <div class="empty-state">
          <p>📁 No resources available yet.</p>
          <p class="hint">Resources are managed in each module's content area.</p>
        </div>
      </ng-template>
    </section>
  `,
  styles: [`
    .resources-page { display: grid; gap: 1rem; }

    .page-header {
      background: #fff;
      border: 1px solid #d4e2f0;
      border-radius: 1rem;
      padding: 1.2rem 1.4rem;
    }

    .back-link { color: #1a74c8; text-decoration: none; font-size: 0.85rem; font-weight: 600; }
    h1 { margin: 0.25rem 0; color: #0f3659; }
    .subtitle { margin: 0; color: #5f7a96; font-size: 0.9rem; }

    .resources-grid {
      display: grid;
      gap: 0.75rem;
    }

    .resource-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      background: #fff;
      border: 1px solid #d9e5f2;
      border-radius: 0.9rem;
      padding: 1rem 1.2rem;
      transition: box-shadow 0.15s;
    }

    .resource-card:hover { box-shadow: 0 2px 12px rgba(26,116,200,0.1); }

    .resource-icon {
      font-size: 2rem;
      width: 3rem;
      text-align: center;
      flex-shrink: 0;
    }

    .resource-info { flex: 1; min-width: 0; }

    .resource-info strong { color: #0f3659; display: block; margin-bottom: 0.2rem; }

    .resource-info p { margin: 0; color: #5f7a96; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .resource-meta { display: flex; gap: 0.4rem; margin-top: 0.4rem; flex-wrap: wrap; }

    .type-pill { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.72rem; font-weight: 600; background: #fef3c7; color: #92400e; }

    .pill { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.72rem; font-weight: 600; background: #d1fadf; color: #027a48; }

    .resource-actions { display: flex; gap: 0.5rem; flex-shrink: 0; }

    .btn-view {
      padding: 0.35rem 0.75rem;
      border-radius: 0.5rem;
      text-decoration: none;
      font-size: 0.82rem;
      font-weight: 600;
      background: #e8f0fc;
      color: #1a74c8;
    }

    .btn-link {
      padding: 0.35rem 0.75rem;
      border-radius: 0.5rem;
      text-decoration: none;
      font-size: 0.82rem;
      font-weight: 600;
      background: #f0fdf4;
      color: #166534;
    }

    .btn-download {
      padding: 0.35rem 0.75rem;
      border-radius: 0.5rem;
      text-decoration: none;
      font-size: 0.82rem;
      font-weight: 600;
      background: #d1fadf;
      color: #027a48;
    }

    .empty-state {
      background: #fff;
      border: 1px solid #d9e5f2;
      border-radius: 1rem;
      padding: 3rem;
      text-align: center;
      color: #5f7a96;
    }

    .hint { font-size: 0.85rem; color: #9fb5c8; margin-top: 0.4rem; }
  `],
})
export class ResourcesPage {
  private readonly route = inject(ActivatedRoute);
  private readonly resourcesService = inject(ProgramResourcesAdminService);

  readonly programId = toSignal(
    this.route.params.pipe(switchMap((p) => [p['programId'] as string])),
    { initialValue: '' }
  );

  readonly resources = toSignal(
    this.route.params.pipe(switchMap((p) => this.resourcesService.getResources(p['programId']))),
    { initialValue: [] }
  );

  protected readonly RESOURCE_LABELS = RESOURCE_TYPE_LABELS;

  getIcon(resourceType: ResourceType): string {
    const icons: Record<ResourceType, string> = {
      [ResourceType.GUIDE]: '📚',
      [ResourceType.HANDOUT]: '📋',
      [ResourceType.WORKSHEET]: '📝',
      [ResourceType.SLIDE_DECK]: '📊',
      [ResourceType.LINK]: '🔗',
      [ResourceType.OTHER]: '📁',
    };
    return icons[resourceType] ?? '📁';
  }
}
