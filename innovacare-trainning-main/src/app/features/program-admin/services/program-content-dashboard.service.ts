import { Injectable, inject } from '@angular/core';
import { combineLatest, map, Observable } from 'rxjs';
import { ProgramContentStats, ProgramContentReadiness } from '../shared/content-builder.models';
import { ProgramModulesAdminService } from './program-modules-admin.service';
import { ProgramLessonsAdminService } from './program-lessons-admin.service';
import { ProgramDocumentsAdminService } from './program-documents-admin.service';
import { ProgramLiveSessionsAdminService } from './program-live-sessions-admin.service';
import { ProgramAssessmentsAdminService } from './program-assessments-admin.service';
import { ProgramSimulationsAdminService } from './program-simulations-admin.service';
import { ProgramCaseStudiesAdminService } from './program-case-studies-admin.service';

@Injectable({ providedIn: 'root' })
export class ProgramContentDashboardService {
  private readonly modules = inject(ProgramModulesAdminService);
  private readonly lessons = inject(ProgramLessonsAdminService);
  private readonly documents = inject(ProgramDocumentsAdminService);
  private readonly liveSessions = inject(ProgramLiveSessionsAdminService);
  private readonly assessments = inject(ProgramAssessmentsAdminService);
  private readonly simulations = inject(ProgramSimulationsAdminService);
  private readonly caseStudies = inject(ProgramCaseStudiesAdminService);

  getProgramContentStats(programId: string): Observable<ProgramContentStats> {
    return combineLatest([
      this.modules.getModules(programId),
      this.lessons.getLessons(programId),
      this.documents.getDocuments(programId),
      this.liveSessions.getLiveSessions(programId),
      this.assessments.getAssessments(programId),
      this.simulations.getSimulations(programId),
      this.caseStudies.getCaseStudies(programId),
    ]).pipe(
      map(([mods, less, docs, sessions, assess, sims, cs]) => ({
        modulesCount: mods.length,
        lessonsCount: less.length,
        documentsCount: docs.length,
        liveSessionsCount: sessions.length,
        assessmentsCount: assess.length,
        simulationsCount: sims.length,
        caseStudiesCount: cs.length,
        resourcesCount: docs.length,
      }))
    );
  }

  getProgramContentReadiness(programId: string): Observable<ProgramContentReadiness> {
    return this.getProgramContentStats(programId).pipe(
      map((stats) => {
        const checks = [
          stats.modulesCount > 0,
          stats.lessonsCount > 0,
          stats.assessmentsCount > 0,
          stats.simulationsCount > 0,
          stats.liveSessionsCount > 0,
          stats.documentsCount > 0,
          stats.caseStudiesCount > 0,
        ];
        const score = Math.round((checks.filter(Boolean).length / checks.length) * 100);
        return {
          hasModules: stats.modulesCount > 0,
          hasLessons: stats.lessonsCount > 0,
          hasAssessments: stats.assessmentsCount > 0,
          hasSimulations: stats.simulationsCount > 0,
          hasLiveSessions: stats.liveSessionsCount > 0,
          hasDocuments: stats.documentsCount > 0,
          hasCaseStudies: stats.caseStudiesCount > 0,
          completenessScore: score,
        };
      })
    );
  }

  getProgramContentOverview(programId: string) {
    return combineLatest([
      this.modules.getModules(programId),
      this.lessons.getLessons(programId),
    ]).pipe(map(([modules, lessons]) => ({ modules, lessons })));
  }
}
