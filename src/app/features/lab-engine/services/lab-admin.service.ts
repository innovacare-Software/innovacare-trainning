import { Injectable, inject } from '@angular/core';
import { LabDefinitionService } from './lab-definition.service';
import { LabSessionService } from './lab-session.service';
import { LabStorageService } from './lab-storage.service';
import { LabDefinition, LabTask, LabFileDefinition } from '../models/lab-definition.model';
import { Observable } from 'rxjs';
import { LabSubmission } from '../models/lab-session.model';

/**
 * Admin service for managing lab definitions.
 * All methods require admin/super_admin role (enforced by Firestore rules and route guards).
 */
@Injectable({ providedIn: 'root' })
export class LabAdminService {
  private readonly labDefSvc   = inject(LabDefinitionService);
  private readonly sessionSvc  = inject(LabSessionService);
  private readonly storageSvc  = inject(LabStorageService);

  // ── Lab CRUD ──────────────────────────────────────────────────────────────

  getAllLabs(): Observable<LabDefinition[]> {
    return this.labDefSvc.getAllLabs();
  }

  getLab(labId: string): Observable<LabDefinition | null> {
    return this.labDefSvc.getLab(labId);
  }

  getTasks(labId: string): Observable<LabTask[]> {
    return this.labDefSvc.getTasks(labId);
  }

  getFileDefinitions(labId: string): Observable<LabFileDefinition[]> {
    return this.labDefSvc.getFileDefinitions(labId);
  }

  async createLab(
    partial: Omit<LabDefinition, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<string> {
    return this.labDefSvc.createLab(partial);
  }

  async updateLab(labId: string, partial: Partial<LabDefinition>): Promise<void> {
    return this.labDefSvc.updateLab(labId, partial);
  }

  async publishLab(labId: string): Promise<void> {
    return this.labDefSvc.setLabStatus(labId, 'PUBLISHED');
  }

  async unpublishLab(labId: string): Promise<void> {
    return this.labDefSvc.setLabStatus(labId, 'DRAFT');
  }

  async archiveLab(labId: string): Promise<void> {
    return this.labDefSvc.setLabStatus(labId, 'ARCHIVED');
  }

  async addTask(labId: string, task: Omit<LabTask, 'id'>): Promise<string> {
    return this.labDefSvc.addTask(labId, task);
  }

  async updateTask(labId: string, taskId: string, partial: Partial<LabTask>): Promise<void> {
    return this.labDefSvc.updateTask(labId, taskId, partial);
  }

  async addFileDefinition(
    labId: string,
    fileDef: Omit<LabFileDefinition, 'id'>,
  ): Promise<string> {
    return this.labDefSvc.addFileDefinition(labId, fileDef);
  }

  /**
   * Upload a starter file to Storage and register it in the lab definition.
   */
  async uploadStarterFile(
    labId: string,
    filePath: string,
    content: string,
    language: string,
    readonly = false,
  ): Promise<void> {
    const storagePath = await this.storageSvc.seedStarterFile(labId, filePath, content);
    await this.labDefSvc.addFileDefinition(labId, {
      path: filePath,
      language: language as LabFileDefinition['language'],
      readonly,
      required: true,
      starterStoragePath: storagePath,
    });
  }

  // ── Submission review ─────────────────────────────────────────────────────

  getPendingSubmissions(): Observable<LabSubmission[]> {
    return this.sessionSvc.getPendingSubmissions();
  }

  getAllSubmissions(): Observable<LabSubmission[]> {
    return this.sessionSvc.getAllSubmissions();
  }

  getSubmission(submissionId: string): Observable<LabSubmission | null> {
    return this.sessionSvc.getSubmission(submissionId);
  }

  async reviewSubmission(
    submissionId: string,
    reviewerId: string,
    feedback: string,
    status: 'REVIEWED' | 'NEEDS_REVISION',
  ): Promise<void> {
    return this.sessionSvc.reviewSubmission(submissionId, reviewerId, feedback, status);
  }

  async getSubmissionArtifactUrl(artifactPath: string): Promise<string> {
    return this.storageSvc.getFileUrl(artifactPath);
  }
}
