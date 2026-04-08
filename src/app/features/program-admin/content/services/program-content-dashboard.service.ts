import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, query, orderBy } from '@angular/fire/firestore';
import { Observable, combineLatest, map } from 'rxjs';
import {
  ProgramContentStats,
  ProgramContentReadiness,
  ContentOverviewModule,
  ContentReadinessItem,
  ProgramContentModule,
  ProgramContentLesson,
  ProgramContentAssessment,
  ProgramContentSimulation,
  ProgramContentCaseStudy,
  ProgramLiveSession,
  ProgramContentDocument,
  ProgramContentResource,
} from '../models/content-builder.models';

@Injectable({ providedIn: 'root' })
export class ProgramContentDashboardService {
  private db = inject(Firestore);

  private col(programId: string, sub: string) {
    return collection(this.db, `programs/${programId}/${sub}`);
  }

  getProgramContentStats(programId: string): Observable<ProgramContentStats> {
    return combineLatest([
      collectionData(query(this.col(programId, 'modules'), orderBy('order', 'asc'))) as Observable<ProgramContentModule[]>,
      collectionData(this.col(programId, 'lessons')) as Observable<ProgramContentLesson[]>,
      collectionData(this.col(programId, 'documents')) as Observable<ProgramContentDocument[]>,
      collectionData(this.col(programId, 'liveSessions')) as Observable<ProgramLiveSession[]>,
      collectionData(this.col(programId, 'assessments')) as Observable<ProgramContentAssessment[]>,
      collectionData(this.col(programId, 'simulations')) as Observable<ProgramContentSimulation[]>,
      collectionData(this.col(programId, 'caseStudies')) as Observable<ProgramContentCaseStudy[]>,
      collectionData(this.col(programId, 'resources')) as Observable<ProgramContentResource[]>,
    ]).pipe(
      map(([modules, lessons, documents, liveSessions, assessments, simulations, caseStudies, resources]) => ({
        modulesCount: modules.length,
        lessonsCount: lessons.length,
        documentsCount: documents.length,
        liveSessionsCount: liveSessions.length,
        assessmentsCount: assessments.length,
        simulationsCount: simulations.length,
        caseStudiesCount: caseStudies.length,
        resourcesCount: resources.length,
      }))
    );
  }

  getProgramContentReadiness(programId: string): Observable<ProgramContentReadiness> {
    return this.getProgramContentStats(programId).pipe(
      map((stats) => {
        const checks: ContentReadinessItem[] = [
          {
            key: 'modules',
            label: 'Has at least one module',
            ok: stats.modulesCount > 0,
            message: stats.modulesCount > 0 ? `${stats.modulesCount} module(s)` : 'No modules added yet',
          },
          {
            key: 'lessons',
            label: 'Has at least one lesson',
            ok: stats.lessonsCount > 0,
            message: stats.lessonsCount > 0 ? `${stats.lessonsCount} lesson(s)` : 'No lessons added yet',
          },
          {
            key: 'assessments',
            label: 'Has at least one assessment',
            ok: stats.assessmentsCount > 0,
            message: stats.assessmentsCount > 0 ? `${stats.assessmentsCount} assessment(s)` : 'No assessments added yet',
          },
          {
            key: 'simulations',
            label: 'Has at least one simulation',
            ok: stats.simulationsCount > 0,
            message: stats.simulationsCount > 0 ? `${stats.simulationsCount} simulation(s)` : 'No simulations added yet',
          },
          {
            key: 'liveSessions',
            label: 'Has at least one live session',
            ok: stats.liveSessionsCount > 0,
            message: stats.liveSessionsCount > 0 ? `${stats.liveSessionsCount} session(s)` : 'No live sessions added yet',
          },
          {
            key: 'documents',
            label: 'Has at least one document',
            ok: stats.documentsCount > 0,
            message: stats.documentsCount > 0 ? `${stats.documentsCount} document(s)` : 'No documents added yet',
          },
          {
            key: 'caseStudies',
            label: 'Has at least one case study',
            ok: stats.caseStudiesCount > 0,
            message: stats.caseStudiesCount > 0 ? `${stats.caseStudiesCount} case stud(ies)` : 'No case studies added yet',
          },
        ];
        const okCount = checks.filter((c) => c.ok).length;
        const score = Math.round((okCount / checks.length) * 100);
        return { score, items: checks, isReady: score >= 100 };
      })
    );
  }

  getProgramContentOverview(programId: string): Observable<ContentOverviewModule[]> {
    return combineLatest([
      collectionData(query(this.col(programId, 'modules'), orderBy('order', 'asc')), { idField: 'id' }) as Observable<ProgramContentModule[]>,
      collectionData(this.col(programId, 'lessons'), { idField: 'id' }) as Observable<ProgramContentLesson[]>,
      collectionData(this.col(programId, 'assessments'), { idField: 'id' }) as Observable<ProgramContentAssessment[]>,
      collectionData(this.col(programId, 'simulations'), { idField: 'id' }) as Observable<ProgramContentSimulation[]>,
      collectionData(this.col(programId, 'caseStudies'), { idField: 'id' }) as Observable<ProgramContentCaseStudy[]>,
      collectionData(this.col(programId, 'liveSessions'), { idField: 'id' }) as Observable<ProgramLiveSession[]>,
    ]).pipe(
      map(([modules, lessons, assessments, simulations, caseStudies, liveSessions]) =>
        modules.map((mod) => ({
          module: mod,
          lessonCount: lessons.filter((l) => l.moduleId === mod.id).length,
          assessmentCount: assessments.filter((a) => a.moduleId === mod.id).length,
          simulationCount: simulations.filter((s) => s.moduleId === mod.id).length,
          caseStudyCount: caseStudies.filter((c) => c.moduleId === mod.id).length,
          liveSessionCount: liveSessions.filter((ls) => ls.moduleId === mod.id).length,
        }))
      )
    );
  }
}
