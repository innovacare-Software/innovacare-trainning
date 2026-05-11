import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Program, ProgramStatus } from '../shared/program-admin.models';
import { ProgramsService } from '../../publics/programs/programs.service';

@Injectable({ providedIn: 'root' })
export class ProgramsAdminService {
  private readonly programs = inject(ProgramsService);

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
