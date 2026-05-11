import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  Firestore,
  addDoc,
  collection,
  collectionData,
  doc,
  docData,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  deleteDoc,
} from '@angular/fire/firestore';
import { combineLatest, map, Observable, of, switchMap } from 'rxjs';
import { EMPTY_ORG_CONTEXT, OrgContextService } from '../../../../core/organization/org-context.service';
import { ExamPrepPaths } from '../exam-prep-paths';
import { assembleBlueprintPreview, type BlueprintAssemblyPreview } from '../utils/exam-blueprint-assembly';
import {
  assessmentDefinitionSchema,
  blueprintSchema,
  caseStudyBundleSchema,
  questionBankItemSchema,
} from '../utils/exam-prep-validation';
import {
  CANONICAL_COURSE_GROUPS,
  CANONICAL_MODULES,
  CANONICAL_PROGRAMS,
} from '../models/exam-prep-taxonomy';
import type {
  AssessmentAssembly,
  AssessmentDefinition,
  AttemptSession,
  CaseStudyBundle,
  ExamBlueprint,
  ExamCourseGroup,
  ExamModule,
  ExamProgram,
  LearnerAttemptResponse,
  QuestionBankItem,
  QuestionBankSearchFilters,
  WorkflowStatus,
} from '../models/exam-prep.models';

@Injectable({ providedIn: 'root' })
export class ExamPrepAdminService {
  private readonly firestore = inject(Firestore);
  private readonly orgContext = inject(OrgContextService);
  private readonly context = toSignal(this.orgContext.context$, { initialValue: EMPTY_ORG_CONTEXT });

  readonly programs$ = this.orgScopedCollection<ExamProgram>('examPrograms');
  readonly courseGroups$ = this.orgScopedCollection<ExamCourseGroup>('examCourseGroups');
  readonly modules$ = this.orgScopedCollection<ExamModule>('examModules');
  readonly questionBank$ = this.orgScopedCollection<QuestionBankItem>('questionBank');
  readonly caseStudies$ = this.orgScopedCollection<CaseStudyBundle>('caseStudies');
  readonly blueprints$ = this.orgScopedCollection<ExamBlueprint>('examBlueprints');
  readonly assessments$ = this.orgScopedCollection<AssessmentDefinition>('assessmentDefinitions');
  readonly attempts$ = this.orgScopedCollection<AttemptSession>('attemptSessions');
  readonly assemblies$ = this.orgScopedCollection<AssessmentAssembly>('assessmentAssemblies');

  readonly dashboardStats$ = combineLatest([
    this.questionBank$,
    this.caseStudies$,
    this.blueprints$,
    this.assessments$,
    this.modules$,
  ]).pipe(
    map(([questionBank, caseStudies, blueprints, assessments, modules]) => ({
      questionCount: questionBank.length,
      publishedQuestionCount: questionBank.filter((item) => item.workflowStatus === 'published').length,
      caseStudyCount: caseStudies.length,
      blueprintCount: blueprints.length,
      assessmentCount: assessments.length,
      moduleCount: modules.length,
    }))
  );

  getQuestionBankItem(itemId: string): Observable<QuestionBankItem | undefined> {
    return this.orgDocument<QuestionBankItem>('questionBank', itemId);
  }

  getCaseStudyBundle(caseStudyId: string): Observable<CaseStudyBundle | undefined> {
    return this.orgDocument<CaseStudyBundle>('caseStudies', caseStudyId);
  }

  getBlueprint(blueprintId: string): Observable<ExamBlueprint | undefined> {
    return this.orgDocument<ExamBlueprint>('examBlueprints', blueprintId);
  }

  getAssessment(assessmentId: string): Observable<AssessmentDefinition | undefined> {
    return this.orgDocument<AssessmentDefinition>('assessmentDefinitions', assessmentId);
  }

  getAttemptSession(attemptId: string): Observable<AttemptSession | undefined> {
    return this.orgDocument<AttemptSession>('attemptSessions', attemptId);
  }

  getAssembly(assemblyId: string): Observable<AssessmentAssembly | undefined> {
    return this.orgDocument<AssessmentAssembly>('assessmentAssemblies', assemblyId);
  }

  listAssemblyItems(assemblyId: string): Observable<Record<string, unknown>[]> {
    return this.orgScopedSubcollection<Record<string, unknown>>('assessmentAssemblies', assemblyId, 'items');
  }

  listAttemptResponses(attemptId: string): Observable<LearnerAttemptResponse[]> {
    return this.orgScopedSubcollection<LearnerAttemptResponse>('attemptSessions', attemptId, 'responses');
  }

  filterQuestionBank(
    filters: QuestionBankSearchFilters
  ): Observable<{ items: QuestionBankItem[]; caseStudies: CaseStudyBundle[] }> {
    return combineLatest([this.questionBank$, this.caseStudies$]).pipe(
      map(([items, caseStudies]) => ({
        items: items.filter((item) => this.matchesQuestionFilters(item, filters)),
        caseStudies: caseStudies.filter((bundle) => this.matchesCaseStudyFilters(bundle, filters)),
      }))
    );
  }

  async upsertQuestionBankItem(input: QuestionBankItem): Promise<string> {
    questionBankItemSchema.parse(input);
    const orgId = this.requireOrgId(input.organizationId);
    const actor = this.currentActor();
    const payload = {
      ...input,
      organizationId: orgId,
      updatedAt: serverTimestamp(),
      updatedBy: actor,
    };

    if (input.id) {
      await setDoc(doc(this.firestore, `${ExamPrepPaths.questionBank(orgId)}/${input.id}`), {
        ...payload,
        createdAt: input.createdAt ?? serverTimestamp(),
        createdBy: input.createdBy || actor,
      }, { merge: true });
      return input.id;
    }

    const ref = await addDoc(collection(this.firestore, ExamPrepPaths.questionBank(orgId)), {
      ...payload,
      createdAt: serverTimestamp(),
      createdBy: actor,
      id: undefined,
    });
    await updateDoc(ref, { id: ref.id });
    return ref.id;
  }

  async upsertCaseStudyBundle(input: CaseStudyBundle): Promise<string> {
    caseStudyBundleSchema.parse(input);
    const orgId = this.requireOrgId(input.organizationId);
    const actor = this.currentActor();
    const payload = {
      ...input,
      organizationId: orgId,
      updatedAt: serverTimestamp(),
      updatedBy: actor,
    };

    if (input.id) {
      await setDoc(doc(this.firestore, `${ExamPrepPaths.caseStudies(orgId)}/${input.id}`), {
        ...payload,
        createdAt: input.createdAt ?? serverTimestamp(),
        createdBy: input.createdBy || actor,
      }, { merge: true });
      return input.id;
    }

    const ref = await addDoc(collection(this.firestore, ExamPrepPaths.caseStudies(orgId)), {
      ...payload,
      createdAt: serverTimestamp(),
      createdBy: actor,
      id: undefined,
    });
    await updateDoc(ref, { id: ref.id });
    return ref.id;
  }

  async upsertBlueprint(input: ExamBlueprint): Promise<string> {
    blueprintSchema.parse(input);
    const orgId = this.requireOrgId(input.organizationId);
    const actor = this.currentActor();
    const payload = {
      ...input,
      organizationId: orgId,
      updatedAt: serverTimestamp(),
      updatedBy: actor,
    };

    if (input.id) {
      await setDoc(doc(this.firestore, `${ExamPrepPaths.blueprints(orgId)}/${input.id}`), {
        ...payload,
        createdAt: input.createdAt ?? serverTimestamp(),
        createdBy: input.createdBy || actor,
      }, { merge: true });
      return input.id;
    }

    const ref = await addDoc(collection(this.firestore, ExamPrepPaths.blueprints(orgId)), {
      ...payload,
      createdAt: serverTimestamp(),
      createdBy: actor,
      id: undefined,
    });
    await updateDoc(ref, { id: ref.id });
    return ref.id;
  }

  async upsertAssessment(input: AssessmentDefinition): Promise<string> {
    assessmentDefinitionSchema.parse(input);
    const orgId = this.requireOrgId(input.organizationId);
    const actor = this.currentActor();
    const payload = {
      ...input,
      organizationId: orgId,
      updatedAt: serverTimestamp(),
      updatedBy: actor,
    };

    if (input.id) {
      await setDoc(doc(this.firestore, `${ExamPrepPaths.assessments(orgId)}/${input.id}`), {
        ...payload,
        createdAt: input.createdAt ?? serverTimestamp(),
        createdBy: input.createdBy || actor,
      }, { merge: true });
      return input.id;
    }

    const ref = await addDoc(collection(this.firestore, ExamPrepPaths.assessments(orgId)), {
      ...payload,
      createdAt: serverTimestamp(),
      createdBy: actor,
      id: undefined,
    });
    await updateDoc(ref, { id: ref.id });
    return ref.id;
  }

  async deleteQuestionBankItem(itemId: string): Promise<void> {
    const orgId = this.requireOrgId();
    await deleteDoc(doc(this.firestore, `${ExamPrepPaths.questionBank(orgId)}/${itemId}`));
  }

  async deleteCaseStudyBundle(caseStudyId: string): Promise<void> {
    const orgId = this.requireOrgId();
    await deleteDoc(doc(this.firestore, `${ExamPrepPaths.caseStudies(orgId)}/${caseStudyId}`));
  }

  async deleteBlueprint(blueprintId: string): Promise<void> {
    const orgId = this.requireOrgId();
    await deleteDoc(doc(this.firestore, `${ExamPrepPaths.blueprints(orgId)}/${blueprintId}`));
  }

  async deleteAssessment(assessmentId: string): Promise<void> {
    const orgId = this.requireOrgId();
    await deleteDoc(doc(this.firestore, `${ExamPrepPaths.assessments(orgId)}/${assessmentId}`));
  }

  async retireQuestionBankItems(itemIds: string[]): Promise<void> {
    await this.bulkUpdateWorkflowStatus('questionBank', itemIds, 'retired');
  }

  async bulkUpdateWorkflowStatus(collectionName: 'questionBank' | 'caseStudies', itemIds: string[], workflowStatus: WorkflowStatus): Promise<void> {
    const orgId = this.requireOrgId();
    const batch = writeBatch(this.firestore);
    for (const itemId of itemIds) {
      batch.update(doc(this.firestore, `organizations/${orgId}/${collectionName}/${itemId}`), {
        workflowStatus,
        updatedAt: serverTimestamp(),
        updatedBy: this.currentActor(),
      });
    }
    await batch.commit();
  }

  async duplicateQuestionBankItem(item: QuestionBankItem): Promise<string> {
    return this.upsertQuestionBankItem({
      ...item,
      id: '',
      stem: `${item.stem} (Copy)`,
      workflowStatus: 'draft',
      version: 1,
    });
  }

  async duplicateBlueprint(blueprint: ExamBlueprint): Promise<string> {
    return this.upsertBlueprint({
      ...blueprint,
      id: '',
      title: `${blueprint.title} Copy`,
      slug: `${blueprint.slug}-copy`,
      active: false,
    });
  }

  async duplicateAssessment(assessment: AssessmentDefinition): Promise<string> {
    return this.upsertAssessment({
      ...assessment,
      id: '',
      title: `${assessment.title} Copy`,
      slug: `${assessment.slug}-copy`,
      publishStatus: 'draft',
      active: false,
    });
  }

  exportQuestionBankJson(items: QuestionBankItem[], caseStudies: CaseStudyBundle[]): string {
    return JSON.stringify({ items, caseStudies }, null, 2);
  }

  async importQuestionBankJson(rawJson: string): Promise<{ importedItems: number; importedCaseStudies: number }> {
    const parsed = JSON.parse(rawJson) as { items?: QuestionBankItem[]; caseStudies?: CaseStudyBundle[] };
    const items = parsed.items ?? [];
    const caseStudies = parsed.caseStudies ?? [];

    for (const item of items) {
      await this.upsertQuestionBankItem(item);
    }

    for (const bundle of caseStudies) {
      await this.upsertCaseStudyBundle(bundle);
    }

    return {
      importedItems: items.length,
      importedCaseStudies: caseStudies.length,
    };
  }

  previewBlueprint(blueprint: ExamBlueprint): Observable<BlueprintAssemblyPreview> {
    return combineLatest([this.questionBank$, this.caseStudies$]).pipe(
      map(([questionBank, caseStudies]) =>
        assembleBlueprintPreview({
          blueprint,
          questionBank,
          caseStudies,
        })
      )
    );
  }

  async seedCanonicalTaxonomy(targetOrgId?: string): Promise<void> {
    const orgId = this.requireOrgId(targetOrgId);
    const actor = this.currentActor();
    const batch = writeBatch(this.firestore);
    const now = serverTimestamp();

    for (const program of CANONICAL_PROGRAMS) {
      batch.set(doc(this.firestore, `${ExamPrepPaths.programs(orgId)}/${program.id}`), {
        ...program,
        organizationId: orgId,
        createdAt: now,
        updatedAt: now,
        createdBy: actor,
        updatedBy: actor,
      }, { merge: true });
    }

    for (const courseGroup of CANONICAL_COURSE_GROUPS) {
      batch.set(doc(this.firestore, `${ExamPrepPaths.courseGroups(orgId)}/${courseGroup.id}`), {
        ...courseGroup,
        organizationId: orgId,
        createdAt: now,
        updatedAt: now,
        createdBy: actor,
        updatedBy: actor,
      }, { merge: true });
    }

    for (const module of CANONICAL_MODULES) {
      batch.set(doc(this.firestore, `${ExamPrepPaths.modules(orgId)}/${module.id}`), {
        ...module,
        organizationId: orgId,
        createdAt: now,
        updatedAt: now,
        createdBy: actor,
        updatedBy: actor,
      }, { merge: true });
    }

    await batch.commit();
  }

  async listOrganizationTaxonomy(): Promise<{ programs: ExamProgram[]; courseGroups: ExamCourseGroup[]; modules: ExamModule[] }> {
    const orgId = this.requireOrgId();
    const [programsSnap, courseGroupsSnap, modulesSnap] = await Promise.all([
      getDocs(query(collection(this.firestore, ExamPrepPaths.programs(orgId)), orderBy('title', 'asc'))),
      getDocs(query(collection(this.firestore, ExamPrepPaths.courseGroups(orgId)), orderBy('order', 'asc'))),
      getDocs(query(collection(this.firestore, ExamPrepPaths.modules(orgId)), orderBy('courseGroupTitle', 'asc'))),
    ]);

    return {
      programs: programsSnap.docs.map((snapshot) => snapshot.data() as ExamProgram),
      courseGroups: courseGroupsSnap.docs.map((snapshot) => snapshot.data() as ExamCourseGroup),
      modules: modulesSnap.docs.map((snapshot) => snapshot.data() as ExamModule),
    };
  }

  private orgScopedCollection<T>(collectionName: string): Observable<T[]> {
    return this.orgContext.context$.pipe(
      switchMap((context) => {
        if (!context.orgId?.trim()) {
          return of([] as T[]);
        }

        const ref = query(collection(this.firestore, `organizations/${context.orgId}/${collectionName}`), orderBy('updatedAt', 'desc'));
        return collectionData(ref, { idField: 'id' }) as Observable<T[]>;
      })
    );
  }

  private orgDocument<T>(collectionName: string, docId: string): Observable<T | undefined> {
    return this.orgContext.context$.pipe(
      switchMap((context) => {
        if (!context.orgId?.trim() || !docId?.trim()) {
          return of(undefined);
        }

        return docData(doc(this.firestore, `organizations/${context.orgId}/${collectionName}/${docId}`), {
          idField: 'id',
        }) as Observable<T | undefined>;
      })
    );
  }

  private orgScopedSubcollection<T>(collectionName: string, docId: string, subcollectionName: string): Observable<T[]> {
    return this.orgContext.context$.pipe(
      switchMap((context) => {
        if (!context.orgId?.trim() || !docId?.trim()) {
          return of([] as T[]);
        }

        const ref = query(
          collection(this.firestore, `organizations/${context.orgId}/${collectionName}/${docId}/${subcollectionName}`),
          orderBy('updatedAt', 'desc')
        );
        return collectionData(ref, { idField: 'id' }) as Observable<T[]>;
      })
    );
  }

  private matchesQuestionFilters(item: QuestionBankItem, filters: QuestionBankSearchFilters): boolean {
    const haystack = [
      item.stem,
      item.leadInQuestion,
      item.tags.join(' '),
      item.sourceReferenceTitle,
      item.moduleTitle,
      item.courseGroupTitle,
    ]
      .join(' ')
      .toLowerCase();

    return (
      (!filters.text || haystack.includes(filters.text.toLowerCase())) &&
      (filters.workflowStatus === 'all' || item.workflowStatus === filters.workflowStatus) &&
      (filters.programId === 'all' || item.programId === filters.programId) &&
      (filters.jurisdiction === 'all' || item.jurisdiction === filters.jurisdiction) &&
      (filters.courseGroupId === 'all' || item.courseGroupId === filters.courseGroupId) &&
      (filters.moduleId === 'all' || item.moduleId === filters.moduleId) &&
      (filters.difficulty === 'all' || item.difficulty === filters.difficulty) &&
      (filters.itemType === 'all' || item.itemType === filters.itemType) &&
      (!filters.tag || item.tags.some((tag) => tag.toLowerCase().includes(filters.tag.toLowerCase())))
    );
  }

  private matchesCaseStudyFilters(bundle: CaseStudyBundle, filters: QuestionBankSearchFilters): boolean {
    const haystack = [bundle.title, bundle.slug, bundle.moduleTitle, bundle.courseGroupTitle].join(' ').toLowerCase();
    return (
      (!filters.text || haystack.includes(filters.text.toLowerCase())) &&
      (filters.workflowStatus === 'all' || bundle.workflowStatus === filters.workflowStatus) &&
      (filters.programId === 'all' || bundle.programId === filters.programId) &&
      (filters.jurisdiction === 'all' || bundle.jurisdiction === filters.jurisdiction) &&
      (filters.courseGroupId === 'all' || bundle.courseGroupId === filters.courseGroupId) &&
      (filters.moduleId === 'all' || bundle.moduleId === filters.moduleId)
    );
  }

  private requireOrgId(explicitOrgId?: string): string {
    const orgId = explicitOrgId?.trim() || this.context().orgId?.trim() || '';
    if (!orgId) {
      throw new Error('An organization context is required for exam-prep authoring.');
    }
    return orgId;
  }

  private currentActor(): string {
    return this.context().uid || 'system';
  }
}