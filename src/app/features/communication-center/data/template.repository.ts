import { Injectable } from '@angular/core';
import { orderBy } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { CommunicationCenterRepository } from './communication-center.repository';
import {
  CommunicationDraftStatus,
  CommunicationRepositoryState,
  CommunicationTemplateDoc,
  CreateTemplateDraftPayload,
  UpdateTemplateDraftPayload,
} from '../contracts/communication.models';

const WRITEABLE_TEMPLATE_STATUSES: CommunicationDraftStatus[] = ['draft', 'approval_pending', 'approved', 'archived'];

@Injectable({ providedIn: 'root' })
export class TemplateRepository extends CommunicationCenterRepository {
  listTemplates(orgId: string | null): Observable<CommunicationRepositoryState<CommunicationTemplateDoc>> {
    return this.listOrgScoped<CommunicationTemplateDoc>('communication_templates', orgId, orderBy('updatedAt', 'desc'));
  }

  async createTemplateDraft(orgId: string, payload: CreateTemplateDraftPayload): Promise<string> {
    return this.createWithAudit<CommunicationTemplateDoc>({
      collectionName: 'communication_templates',
      entityType: 'template',
      orgId,
      build: (docId, actor, now) => ({
        id: docId,
        orgId,
        title: payload.title.trim(),
        summary: payload.summary.trim(),
        tags: payload.tags ?? [],
        ...this.buildBaseFields(actor, now),
        type: payload.type,
        status: 'draft',
        category: payload.type,
        subjectTemplate: payload.subjectTemplate.trim(),
        previewTextTemplate: payload.previewTextTemplate.trim(),
        htmlTemplate: payload.htmlTemplate.trim(),
        personalizationTokens: payload.personalizationTokens ?? [],
        aiAssistEnabled: payload.aiAssistEnabled ?? true,
      }),
    });
  }

  async updateTemplateDraft(orgId: string, templateId: string, patch: UpdateTemplateDraftPayload): Promise<void> {
    return this.updateWithAudit<CommunicationTemplateDoc>({
      collectionName: 'communication_templates',
      entityType: 'template',
      orgId,
      docId: templateId,
      patch: {
        ...patch,
        ...(patch.title !== undefined && { title: patch.title.trim() }),
        ...(patch.summary !== undefined && { summary: patch.summary.trim() }),
        ...(patch.subjectTemplate !== undefined && { subjectTemplate: patch.subjectTemplate.trim() }),
        ...(patch.previewTextTemplate !== undefined && { previewTextTemplate: patch.previewTextTemplate.trim() }),
        ...(patch.htmlTemplate !== undefined && { htmlTemplate: patch.htmlTemplate.trim() }),
        ...(patch.type !== undefined && { category: patch.type }),
      },
      validateNext: (next) => {
        if (!WRITEABLE_TEMPLATE_STATUSES.includes(next.status)) {
          throw new Error('invalid-status');
        }
        next.category = next.type;
      },
    });
  }
}