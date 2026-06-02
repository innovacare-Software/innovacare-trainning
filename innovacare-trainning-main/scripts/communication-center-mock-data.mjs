import { doc, setDoc } from 'firebase/firestore';

const safety = {
  mode: 'draft_only',
  mockOnly: true,
  approvalRequired: true,
  provider: 'none',
  canAutoSend: false,
};

const stamp = {
  createdAt: new Date('2026-06-02T09:00:00.000Z'),
  updatedAt: new Date('2026-06-02T09:00:00.000Z'),
};

export async function seedCommunicationCenterMockData(db) {
  const docs = [
    ['users/orgAdminAlpha', { uid: 'orgAdminAlpha', role: 'staff', orgId: 'org-alpha', active: true }],
    ['users/superAdminGlobal', { uid: 'superAdminGlobal', role: 'super_admin', active: true }],
    ['users/learnerAlpha', { uid: 'learnerAlpha', role: 'learner', orgId: 'org-alpha', active: true }],
    ['users/guestAlpha', { uid: 'guestAlpha', role: 'guest', orgId: 'org-alpha', active: true }],
    ['userOrgMemberships/orgAdminAlpha__org-alpha', { userId: 'orgAdminAlpha', orgId: 'org-alpha', role: 'org_admin', status: 'active', assignedBy: 'superAdminGlobal' }],
    ['userOrgMemberships/learnerAlpha__org-alpha', { userId: 'learnerAlpha', orgId: 'org-alpha', role: 'learner', status: 'active', assignedBy: 'orgAdminAlpha' }],
    ['communication_templates/template-alpha', { id: 'template-alpha', orgId: 'org-alpha', title: 'Weekly digest template', summary: 'Mock digest template', tags: ['digest'], category: 'weekly_digest', subjectTemplate: 'Weekly digest', previewTextTemplate: 'Preview only', htmlTemplate: '<h1>Draft</h1>', personalizationTokens: ['{{firstName}}'], aiAssistEnabled: true, safety, createdByUid: 'orgAdminAlpha', updatedByUid: 'orgAdminAlpha', ...stamp }],
    ['communication_segments/segment-alpha', { id: 'segment-alpha', orgId: 'org-alpha', title: 'At-risk learners', summary: 'Mock risk segment', tags: ['risk'], family: 'ai_segments', description: 'Learners above risk threshold', estimatedAudienceSize: 24, filterMode: 'dynamic_mock', filters: [{ field: 'completionRisk', operator: '>', value: 0.6 }], sourceCollections: ['users'], safety, createdByUid: 'orgAdminAlpha', updatedByUid: 'orgAdminAlpha', ...stamp }],
    ['newsletters/newsletter-alpha', { id: 'newsletter-alpha', orgId: 'org-alpha', title: 'Retention digest draft', summary: 'Mock newsletter', tags: ['retention'], status: 'draft', subject: 'Draft retention digest', previewText: 'Preview only', html: '<h1>Retention</h1>', templateId: 'template-alpha', audienceSegmentIds: ['segment-alpha'], mergeFields: ['firstName'], personalizationTokens: ['{{firstName}}'], scheduledFor: null, approvedAt: null, approvedByUid: null, safety, createdByUid: 'orgAdminAlpha', updatedByUid: 'orgAdminAlpha', ...stamp }],
    ['newsletter_campaigns/campaign-alpha', { id: 'campaign-alpha', orgId: 'org-alpha', title: 'Retention campaign', summary: 'Mock campaign', tags: ['retention'], newsletterId: 'newsletter-alpha', status: 'scheduled', audienceSegmentIds: ['segment-alpha'], estimatedRecipients: 24, scheduledFor: '2026-06-05T10:00:00.000Z', launchedAt: null, completedAt: null, conversionGoal: 'retention', safety, createdByUid: 'orgAdminAlpha', updatedByUid: 'orgAdminAlpha', ...stamp }],
    ['newsletter_recipients/recipient-alpha', { id: 'recipient-alpha', orgId: 'org-alpha', campaignId: 'campaign-alpha', newsletterId: 'newsletter-alpha', recipientUid: 'learnerAlpha', recipientRole: 'learner', personalizationPayload: { firstName: 'Learner', organizationName: 'Org Alpha' }, mockDeliveryStatus: 'queued_preview', safety, createdByUid: 'orgAdminAlpha', updatedByUid: 'orgAdminAlpha', ...stamp }],
    ['newsletter_events/event-alpha', { id: 'event-alpha', orgId: 'org-alpha', campaignId: 'campaign-alpha', newsletterId: 'newsletter-alpha', recipientId: 'recipient-alpha', eventType: 'preview', source: 'seed', metadata: { preview: true }, safety, createdByUid: 'orgAdminAlpha', updatedByUid: 'orgAdminAlpha', ...stamp }],
    ['newsletter_analytics/analytics-alpha', { id: 'analytics-alpha', orgId: 'org-alpha', campaignId: 'campaign-alpha', newsletterId: 'newsletter-alpha', sends: 24, opens: 10, clicks: 4, unsubscribes: 0, conversions: 2, revenueAttributed: 1200, safety, createdByUid: 'orgAdminAlpha', updatedByUid: 'orgAdminAlpha', ...stamp }],
    ['communication_automations/automation-alpha', { id: 'automation-alpha', orgId: 'org-alpha', title: 'Learner inactivity', summary: 'Draft automation only', tags: ['automation'], triggerType: 'learner_inactivity', triggerThreshold: '14_days', targetSegmentId: 'segment-alpha', draftTemplateId: 'template-alpha', actionMode: 'queue_approval_only', safety, createdByUid: 'orgAdminAlpha', updatedByUid: 'orgAdminAlpha', ...stamp }],
    ['communication_approvals/approval-alpha', { id: 'approval-alpha', orgId: 'org-alpha', title: 'Approve retention digest', summary: 'Approval item', tags: ['approval'], relatedCollection: 'newsletters', relatedDocumentId: 'newsletter-alpha', status: 'pending', requestedByUid: 'orgAdminAlpha', reviewedByUid: null, requestedAt: '2026-06-02T09:00:00.000Z', reviewedAt: null, reviewNote: null, safety, createdByUid: 'orgAdminAlpha', updatedByUid: 'orgAdminAlpha', ...stamp }],
    ['communication_audits/audit-alpha', { id: 'audit-alpha', orgId: 'org-alpha', title: 'Newsletter draft created', summary: 'Audit trail', tags: ['audit'], entityCollection: 'newsletters', entityId: 'newsletter-alpha', action: 'draft_created', actorUid: 'orgAdminAlpha', promptVersion: 'v1', modelVersion: 'mock-model', rollbackReference: null, safety, createdByUid: 'orgAdminAlpha', updatedByUid: 'orgAdminAlpha', ...stamp }],
    ['newsletters/newsletter-beta', { id: 'newsletter-beta', orgId: 'org-beta', title: 'Other org draft', summary: 'Isolation check', tags: ['beta'], status: 'draft', subject: 'Other org', previewText: 'Other org', html: '<h1>Other org</h1>', templateId: null, audienceSegmentIds: [], mergeFields: [], personalizationTokens: [], scheduledFor: null, approvedAt: null, approvedByUid: null, safety, createdByUid: 'seed', updatedByUid: 'seed', ...stamp }],
  ];

  for (const [path, data] of docs) {
    await setDoc(doc(db, path), data);
  }
}