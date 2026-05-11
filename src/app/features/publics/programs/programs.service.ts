import { Injectable, Injector, inject, runInInjectionContext } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import {
  Firestore,
  addDoc,
  collection,
  collectionData,
  doc,
  docData,
  deleteDoc,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { Observable, catchError, firstValueFrom, of, switchMap } from 'rxjs';
import {
  CreateProgramPayload,
  Program,
  ProgramCategory,
  ProgramModuleLessonSeed,
  ProgramLessonType,
  ProgramStatus,
} from './program.models';
import { AppProfile, AuthService } from '../../../core/auth';

@Injectable({ providedIn: 'root' })
export class ProgramsService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(Auth);
  private readonly authService = inject(AuthService);
  private readonly injector = inject(Injector);

  private readonly programsPath = 'programs';

  private inContext<T>(factory: () => T): T {
    return runInInjectionContext(this.injector, factory);
  }

  getPublishedPrograms(): Observable<Program[]> {
    const programsRef = collection(this.firestore, this.programsPath);
    const publishedQuery = query(
      programsRef,
      where('active', '==', true),
      where('status', '==', ProgramStatus.PUBLISHED),
      orderBy('isFeatured', 'desc'),
      orderBy('updatedAt', 'desc')
    );

    return this.inContext(() => collectionData(publishedQuery, { idField: 'id' }) as Observable<Program[]>);
  }

  getFeaturedPrograms(limitCount = 6): Observable<Program[]> {
    const programsRef = collection(this.firestore, this.programsPath);
    const featuredQuery = query(
      programsRef,
      where('active', '==', true),
      where('status', '==', ProgramStatus.PUBLISHED),
      where('isFeatured', '==', true),
      orderBy('updatedAt', 'desc'),
      limit(Math.max(1, limitCount))
    );

    return this.inContext(() => collectionData(featuredQuery, { idField: 'id' }) as Observable<Program[]>);
  }

  getProgramsByCategory(category: ProgramCategory): Observable<Program[]> {
    const programsRef = collection(this.firestore, this.programsPath);
    const categoryQuery = query(
      programsRef,
      where('active', '==', true),
      where('status', '==', ProgramStatus.PUBLISHED),
      where('category', '==', category),
      orderBy('updatedAt', 'desc')
    );

    return this.inContext(() => collectionData(categoryQuery, { idField: 'id' }) as Observable<Program[]>);
  }

  getProgramById(programId: string): Observable<Program | undefined> {
    if (!programId?.trim()) {
      return of(undefined);
    }

    const programDoc = doc(this.firestore, `${this.programsPath}/${programId}`);
    return (this.inContext(
      () => docData(programDoc, { idField: 'id' }) as Observable<Program | undefined>
    )).pipe(
      catchError(() => of(undefined))
    );
  }

  async createProgram(payload: CreateProgramPayload): Promise<string> {
    const currentUser = await this.requireCurrentUser();
    const profile = await firstValueFrom(this.authService.profile$);
    const ownerId = payload.ownerId ?? currentUser.uid;
    const slug = this.ensureSlug(payload.slug || payload.title);
    const seatsValue = payload.seats ?? null;
    const sourceModules = Array.isArray(payload.modules) ? payload.modules : [];
    const orgId = this.resolveManagedOrgId(profile, payload.orgId);
    const ownerType = payload.ownerType ?? 'partner';
    const payoutMode = payload.payoutMode ?? 'manual';
    const platformFeePercent = Number.isFinite(Number(payload.platformFeePercent))
      ? Number(payload.platformFeePercent)
      : 30;
    const partnerSharePercent = Number.isFinite(Number(payload.partnerSharePercent))
      ? Number(payload.partnerSharePercent)
      : 70;
    const payoutMethodConfigured = payload.payoutMethodConfigured === true;

    const programToCreate = this.stripUndefinedDeep({
      ...payload,
      slug,
      ownerId,
      ownerType,
      payoutMode,
      platformFeePercent,
      partnerSharePercent,
      payoutMethodConfigured,
      payoutMethod: payload.payoutMethod || undefined,
      payoutCountry: payload.payoutCountry || undefined,
      payoutCurrency: payload.payoutCurrency || undefined,
      accountHolderName: payload.accountHolderName || undefined,
      mobileMoneyProvider: payload.mobileMoneyProvider || undefined,
      mobileMoneyPhoneMasked: payload.mobileMoneyPhoneMasked || undefined,
      bankName: payload.bankName || undefined,
      bankAccountMasked: payload.bankAccountMasked || undefined,
      payoutNotes: payload.payoutNotes || undefined,
      orgId,
      linkedCourseIds: Array.isArray(payload.linkedCourseIds)
        ? payload.linkedCourseIds.filter(Boolean)
        : [],
      seats: seatsValue,
      seatsRemaining:
        payload.seatsRemaining != null
          ? payload.seatsRemaining
          : seatsValue != null
          ? seatsValue
          : null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }) as Record<string, unknown>;

    const ref = await addDoc(collection(this.firestore, this.programsPath), programToCreate);
    const normalizedModules = await this.seedProgramModules(ref.id, sourceModules, {
      active: !!payload.active,
      status: payload.status,
    });
    await this.seedProgramLessons(ref.id, normalizedModules, {
      active: !!payload.active,
      status: payload.status,
    });
    return ref.id;
  }

  async updateProgram(programId: string, payload: Partial<CreateProgramPayload>): Promise<void> {
    if (!programId?.trim()) {
      throw new Error('programId is required.');
    }

    const profile = await firstValueFrom(this.authService.profile$);
    const managedOrgId = this.resolveManagedOrgId(profile, payload.orgId);

    const updatePayload: Record<string, unknown> = {
      ...payload,
      orgId: managedOrgId,
      updatedAt: serverTimestamp(),
    };

    if (typeof payload.slug === 'string' && payload.slug.trim()) {
      updatePayload['slug'] = this.ensureSlug(payload.slug);
    } else if (typeof payload.title === 'string' && payload.title.trim()) {
      updatePayload['slug'] = this.ensureSlug(payload.title);
    }

    if (payload.seats != null && payload.seatsRemaining == null) {
      updatePayload['seatsRemaining'] = payload.seats;
    }

    if (Array.isArray(payload.linkedCourseIds)) {
      updatePayload['linkedCourseIds'] = payload.linkedCourseIds.filter(Boolean);
    }

    await updateDoc(
      doc(this.firestore, `${this.programsPath}/${programId}`),
      this.stripUndefinedDeep(updatePayload) as Record<string, unknown>
    );
  }

  async archiveProgram(programId: string): Promise<void> {
    if (!programId?.trim()) {
      throw new Error('programId is required.');
    }

    await updateDoc(doc(this.firestore, `${this.programsPath}/${programId}`), {
      active: false,
      status: ProgramStatus.ARCHIVED,
      updatedAt: serverTimestamp(),
    });
  }

  async deleteProgram(programId: string): Promise<void> {
    if (!programId?.trim()) {
      throw new Error('programId is required.');
    }

    await deleteDoc(doc(this.firestore, `${this.programsPath}/${programId}`));
  }

  async publishProgram(programId: string): Promise<void> {
    if (!programId?.trim()) {
      throw new Error('programId is required.');
    }

    await updateDoc(doc(this.firestore, `${this.programsPath}/${programId}`), {
      active: true,
      status: ProgramStatus.PUBLISHED,
      updatedAt: serverTimestamp(),
    });
  }

  getAdminPrograms(): Observable<Program[]> {
    return this.authService.profile$.pipe(
      switchMap((profile) => {
        if (!profile?.uid) {
          return of([] as Program[]);
        }

        const programsRef = collection(this.firestore, this.programsPath);
        const scopedOrgId = this.normalizeOrgId(profile.orgId);
        if (!this.isSuperAdmin(profile) && !scopedOrgId) {
          return of([] as Program[]);
        }

        const adminProgramsQuery = this.isSuperAdmin(profile)
          ? query(programsRef, orderBy('updatedAt', 'desc'))
          : query(programsRef, where('orgId', '==', scopedOrgId), orderBy('updatedAt', 'desc'));
        return this.inContext(() => collectionData(adminProgramsQuery, { idField: 'id' }) as Observable<Program[]>);
      })
    );
  }

  private resolveManagedOrgId(profile: AppProfile | null, requestedOrgId: string | null | undefined): string | null {
    const profileOrgId = this.normalizeOrgId(profile?.orgId);
    if (this.isSuperAdmin(profile)) {
      return this.normalizeOrgId(requestedOrgId) ?? profileOrgId;
    }
    return profileOrgId;
  }

  private normalizeOrgId(value: unknown): string | null {
    const orgId = String(value || '').trim();
    return orgId ? orgId : null;
  }

  private isSuperAdmin(profile: AppProfile | null): boolean {
    return profile?.role === 'super_admin';
  }

  private async requireCurrentUser() {
    const currentUser = this.auth.currentUser;
    if (currentUser) {
      return currentUser;
    }

    const userFromState = await firstValueFrom(this.inContext(() => authState(this.auth)));
    if (!userFromState) {
      throw new Error('Authentication required. Please sign in first.');
    }
    return userFromState;
  }

  private ensureSlug(input: string): string {
    return input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  private async seedProgramModules(
    programId: string,
    modules: Array<{ id?: string; title: string; description?: string; summary?: string; order?: number; durationText?: string; lessons?: Array<string | ProgramModuleLessonSeed> }>,
    options: { active: boolean; status: ProgramStatus }
  ): Promise<Array<{ id: string; title: string; lessons: Array<string | ProgramModuleLessonSeed>; order: number }>> {
    const normalizedModules: Array<{ id: string; title: string; lessons: Array<string | ProgramModuleLessonSeed>; order: number }> = [];
    for (const [index, module] of modules.entries()) {
      const moduleId = this.ensureSlug(module.id || module.title || `module-${index + 1}`);
      const moduleStatus = options.status === ProgramStatus.ARCHIVED
        ? 'ARCHIVED'
        : options.status === ProgramStatus.PUBLISHED
          ? 'PUBLISHED'
          : 'DRAFT';

      await setDoc(doc(this.firestore, `${this.programsPath}/${programId}/modules/${moduleId}`), {
        programId,
        slug: this.ensureSlug(module.title || moduleId),
        title: module.title,
        description: module.description || module.summary || '',
        order: Number(module.order || index + 1),
        estimatedHours: this.parseEstimatedHours(module.durationText),
        objectives: [],
        required: true,
        active: options.active,
        status: moduleStatus,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      normalizedModules.push({
        id: moduleId,
        title: module.title,
        lessons: Array.isArray(module.lessons) ? module.lessons : [],
        order: Number(module.order || index + 1),
      });
    }
    return normalizedModules;
  }

  private async seedProgramLessons(
    programId: string,
    modules: Array<{ id: string; title: string; lessons: Array<string | ProgramModuleLessonSeed>; order: number }>,
    options: { active: boolean; status: ProgramStatus }
  ): Promise<void> {
    const lessonStatus = options.status === ProgramStatus.ARCHIVED
      ? 'ARCHIVED'
      : options.status === ProgramStatus.PUBLISHED
        ? 'PUBLISHED'
        : 'DRAFT';

    for (const module of modules) {
      for (const [lessonIndex, lessonEntry] of module.lessons.entries()) {
        const lesson = typeof lessonEntry === 'string'
          ? ({ title: lessonEntry } as ProgramModuleLessonSeed)
          : lessonEntry;
        const lessonTitle = lesson.title;
        const lessonId = this.ensureSlug(`${module.id}-${lessonTitle}-${lessonIndex + 1}`);
        const lessonType = lesson.type || ProgramLessonType.READING;
        const contentStatus = lesson.status || lessonStatus;
        await setDoc(doc(this.firestore, `${this.programsPath}/${programId}/lessons/${lessonId}`), {
          programId,
          moduleId: module.id,
          title: lessonTitle,
          slug: this.ensureSlug(lessonTitle),
          description: lesson.description || `Placeholder lesson for ${module.title}. Update this content in Program Admin.`,
          type: lessonType,
          lessonType: this.toAdminLessonType(lessonType),
          contentHtml: lesson.contentHtml || `<p>${lessonTitle}</p><p>Update this placeholder lesson with real learning content.</p>`,
          videoUrl: lesson.videoUrl || '',
          durationMin: Number(lesson.durationMin || 15),
          order: Number(lesson.order || lessonIndex + 1),
          isPreview: !!lesson.isPreview,
          downloadable: !!lesson.downloadable,
          active: lesson.active ?? options.active,
          status: contentStatus,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }
  }

  private toAdminLessonType(type: ProgramLessonType): 'VIDEO' | 'TEXT' | 'DOCUMENT' | 'MIXED' | 'WEB' {
    switch (type) {
      case ProgramLessonType.VIDEO:
        return 'VIDEO';
      case ProgramLessonType.DOCUMENT:
        return 'DOCUMENT';
      case ProgramLessonType.MIXED:
        return 'MIXED';
      case ProgramLessonType.WEB:
        return 'WEB';
      default:
        return 'TEXT';
    }
  }

  private parseEstimatedHours(durationText?: string): number {
    const raw = String(durationText || '');
    const match = raw.match(/(\d+)/);
    if (!match?.[1]) {
      return 0;
    }
    return Number(match[1]);
  }

  private stripUndefinedDeep<T>(value: T): T {
    if (Array.isArray(value)) {
      return value
        .filter((item) => item !== undefined)
        .map((item) => this.stripUndefinedDeep(item)) as T;
    }

    if (!this.isPlainObject(value)) {
      return value;
    }

    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => [key, this.stripUndefinedDeep(item)]);

    return Object.fromEntries(entries) as T;
  }

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    if (!value || typeof value !== 'object') {
      return false;
    }
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
  }
}
