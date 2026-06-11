import { Injectable } from '@angular/core';
import { orderBy } from '@angular/fire/firestore';
import { CommunicationCenterRepository } from './communication-center.repository';
import {
  CreateNewsletterDraftPayload,
  NewsletterDoc,
  NewsletterStatus,
  UpdateNewsletterDraftPayload,
  CommunicationRepositoryState,
} from '../contracts/communication.models';
import { Observable } from 'rxjs';

const WRITEABLE_NEWSLETTER_STATUSES: NewsletterStatus[] = ['draft', 'approval_pending', 'approved', 'archived'];

@Injectable({ providedIn: 'root' })
export class NewsletterRepository extends CommunicationCenterRepository {
  listNewsletters(orgId: string | null): Observable<CommunicationRepositoryState<NewsletterDoc>> {
    return this.listOrgScoped<NewsletterDoc>('newsletters', orgId, orderBy('updatedAt', 'desc'));
  }

  async createNewsletterDraft(orgId: string, payload: CreateNewsletterDraftPayload): Promise<string> {
    return this.createWithAudit<NewsletterDoc>({
      collectionName: 'newsletters',
      entityType: 'newsletter',
      orgId,
      build: (docId, actor, now) => ({
        id: docId,
        orgId,
        title: payload.title.trim(),
        summary: payload.summary.trim(),
        tags: payload.tags ?? [],
        ...this.buildBaseFields(actor, now),
        status: 'draft',
        createdByRole: actor.actorRole,
        subject: payload.subject.trim(),
        previewText: payload.previewText.trim(),
        html: payload.html.trim(),
        templateId: payload.templateId ?? null,
        audienceSegmentIds: payload.audienceSegmentIds ?? [],
        mergeFields: payload.mergeFields ?? [],
        personalizationTokens: payload.personalizationTokens ?? [],
        scheduledAt: null,
        scheduledFor: null,
        approvedAt: null,
        approvedByUid: null,
      }),
    });
  }

  async updateNewsletterDraft(orgId: string, newsletterId: string, patch: UpdateNewsletterDraftPayload): Promise<void> {
    const cleanPatch: any = { ...patch };
    if (cleanPatch.title !== undefined) cleanPatch.title = cleanPatch.title.trim();
    if (cleanPatch.summary !== undefined) cleanPatch.summary = cleanPatch.summary.trim();
    if (cleanPatch.subject !== undefined) cleanPatch.subject = cleanPatch.subject.trim();
    if (cleanPatch.previewText !== undefined) cleanPatch.previewText = cleanPatch.previewText.trim();
    if (cleanPatch.html !== undefined) cleanPatch.html = cleanPatch.html.trim();

    Object.keys(cleanPatch).forEach(key => {
      if (cleanPatch[key] === undefined) {
        delete cleanPatch[key];
      }
    });

    return this.updateWithAudit<NewsletterDoc>({
      collectionName: 'newsletters',
      entityType: 'newsletter',
      orgId,
      docId: newsletterId,
      patch: cleanPatch,
      validateCurrent: (current) => {
        if (current.status === 'sent') {
          throw new Error('invalid-status');
        }
      },
      validateNext: (next) => {
        if (!WRITEABLE_NEWSLETTER_STATUSES.includes(next.status)) {
          throw new Error('invalid-status');
        }
        if (next.status === 'approved' && next.approvedByUid == null) {
          next.approvedByUid = next.updatedByUid;
          next.approvedAt = next.updatedAt;
        }
        if (next.status !== 'approved') {
          next.scheduledAt = null;
          next.scheduledFor = null;
        }
      },
    });
  }
}