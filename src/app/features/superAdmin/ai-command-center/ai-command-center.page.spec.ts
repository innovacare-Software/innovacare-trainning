import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { AiCommandCenterPage } from './ai-command-center.page';
import { AiCommandCenterService, CommandCenterSnapshot } from './ai-command-center.service';
import { AuthService } from '../../../core/auth';
import { OrgContextService } from '../../../core/organization/org-context.service';

describe('AiCommandCenterPage in org scope', () => {
  const snapshot: CommandCenterSnapshot = {
    generatedAt: new Date().toISOString(),
    metrics: {
      organizations: 1,
      learners: 12,
      openRecommendations: 1,
      pendingApprovals: 1,
      completedRuns7d: 3,
    },
    agents: [
      {
        id: 'student_success',
        name: 'Student Success Agent',
        goal: 'Detect learner risk early.',
        responsibilities: ['Monitor engagement'],
        memoryCollections: ['aiAgentRuns'],
        tools: ['Firestore'],
        permissions: ['org_admin'],
        escalationPaths: ['Instructor'],
      },
    ],
    recentRuns: [
      {
        id: 'run-1',
        agentId: 'student_success',
        status: 'completed',
        summary: 'Scoped run',
        confidenceScore: 0.8,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      },
    ],
    recommendations: [
      {
        id: 'rec-1',
        agentId: 'student_success',
        title: 'Support learner',
        summary: 'Needs intervention',
        priority: 'high',
        confidenceScore: 0.82,
        organizationId: 'org-123',
        learnerUid: 'learner-1',
        requiresApproval: true,
        createdAt: new Date().toISOString(),
      },
    ],
    pendingApprovals: [
      {
        id: 'approval-1',
        agentId: 'student_success',
        title: 'Approve outreach',
        approvalType: 'outreach_message',
        confidenceScore: 0.77,
        organizationId: 'org-123',
        learnerUid: 'learner-1',
        createdAt: new Date().toISOString(),
      },
    ],
  };

  const profile$ = new BehaviorSubject<any>({ uid: 'org-admin', role: 'staff', orgId: 'org-123' });
  const context$ = new BehaviorSubject<any>({ orgId: 'org-123' });
  const service = {
    getSnapshot: jasmine.createSpy('getSnapshot').and.resolveTo(snapshot),
    runAgent: jasmine.createSpy('runAgent').and.resolveTo({ ok: true, runId: 'run-2' }),
    reviewApproval: jasmine.createSpy('reviewApproval').and.resolveTo({ ok: true }),
  } as unknown as AiCommandCenterService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiCommandCenterPage],
      providers: [
        { provide: AiCommandCenterService, useValue: service },
        { provide: ActivatedRoute, useValue: { snapshot: { data: { aiScopeMode: 'org' } } } },
        { provide: AuthService, useValue: { profile$ } },
        { provide: OrgContextService, useValue: { context$ } },
      ],
    }).compileComponents();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('requests an org-scoped snapshot and hides approval actions', async () => {
    const fixture = TestBed.createComponent(AiCommandCenterPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect((service.getSnapshot as jasmine.Spy)).toHaveBeenCalledWith({ organizationId: 'org-123' });
    expect(fixture.componentInstance.scopeMode()).toBe('org');
    expect(fixture.componentInstance.orgId()).toBe('org-123');
    expect(fixture.componentInstance.canReviewApprovals()).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('Organization scope: org-123');
    expect(fixture.nativeElement.textContent).toContain('Platform approval remains restricted to super admins');
    expect(fixture.nativeElement.textContent).not.toContain('Run executive sweep');
    expect(fixture.nativeElement.querySelectorAll('.approval-actions button').length).toBe(0);
  });

  it('passes the org scope when running an agent', async () => {
    const fixture = TestBed.createComponent(AiCommandCenterPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    await fixture.componentInstance.runAgent(snapshot.agents[0]);

    expect((service.runAgent as jasmine.Spy)).toHaveBeenCalledWith({
      agentId: 'student_success',
      organizationId: 'org-123',
    });
  });
});