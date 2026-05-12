import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Program, ProgramStatus } from '../shared/program-admin.models';
import { ProgramsService } from '../../publics/programs/programs.service';

export interface CloneProgramRequest {
  sourceProgramId: string;
  destinationOrgId?: string | null;
  newTitle?: string;
  newSlug?: string;
  market?: string | null;
  jurisdiction?: string | null;
  language?: string | null;
  cloneLabel?: string | null;
  includeModules?: boolean;
  includeLessons?: boolean;
  includeDocuments?: boolean;
  includeAssessments?: boolean;
  includeCaseStudies?: boolean;
  includeSimulations?: boolean;
  includeLiveSessions?: boolean;
  includeOffers?: boolean;
  includePricing?: boolean;
  includeCertificateTemplate?: boolean;
  publishImmediately?: boolean;
}

export interface CloneProgramResult {
  ok: boolean;
  newProgramId: string;
  cloneBatchId: string;
  destinationOrgId: string | null;
  counts: Record<string, number>;
}

@Injectable({ providedIn: 'root' })
export class ProgramsAdminService {
  private readonly programs = inject(ProgramsService);
  private readonly functions = inject(Functions);

  async cloneProgram(payload: CloneProgramRequest): Promise<CloneProgramResult> {
    const callable = httpsCallable<CloneProgramRequest, CloneProgramResult>(this.functions, 'cloneProgram');
    const res = await callable(payload);
    return res.data;
  }

  getAllProgramsForAdmin(): Observable<Program[]> {
    return this.programs.getAdminPrograms();
  }

  getProgramById(programId: string): Observable<Program | undefined> {
    return this.programs.getProgramById(programId);
  }

  createProgram(payload: Omit<Program, 'id'>): Promise<string> {
    return this.programs.createProgram(payload);
  }

  updateProgram(programId: string, payload: Partial<Omit<Program, 'id'>>): Promise<void> {
    return this.programs.updateProgram(programId, payload);
  }

  publishProgram(programId: string): Promise<void> {
    return this.programs.publishProgram(programId);
  }

  archiveProgram(programId: string): Promise<void> {
    return this.programs.archiveProgram(programId);
  }

  deleteProgram(programId: string): Promise<void> {
    return this.programs.deleteProgram(programId);
  }

  activateProgram(programId: string): Promise<void> {
    return this.programs.updateProgram(programId, {
      active: true,
      status: ProgramStatus.PUBLISHED,
    });
  }

  deactivateProgram(programId: string): Promise<void> {
    return this.programs.updateProgram(programId, {
      active: false,
    });
  }
}
