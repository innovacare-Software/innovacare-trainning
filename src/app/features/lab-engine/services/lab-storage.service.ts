import { Injectable, inject } from '@angular/core';
import {
  Storage,
  ref,
  getBytes,
  uploadString,
  getDownloadURL,
  listAll,
} from '@angular/fire/storage';

@Injectable({ providedIn: 'root' })
export class LabStorageService {
  private readonly storage = inject(Storage);

  // ── Read operations ────────────────────────────────────────────────────────

  /**
   * Download a file from Storage and return its text content.
   */
  async downloadFileText(storagePath: string): Promise<string> {
    const storageRef = ref(this.storage, storagePath);
    const bytes = await getBytes(storageRef);
    return new TextDecoder().decode(bytes);
  }

  /**
   * Get a signed download URL for a file (e.g., for artifact download).
   */
  async getFileUrl(storagePath: string): Promise<string> {
    return getDownloadURL(ref(this.storage, storagePath));
  }

  // ── Write operations ───────────────────────────────────────────────────────

  /**
   * Upload a text file to the specified Storage path.
   * Overwrites existing content.
   */
  async uploadFileText(storagePath: string, content: string): Promise<void> {
    await uploadString(ref(this.storage, storagePath), content, 'raw');
  }

  /**
   * Upload a base64-encoded file (for binary exports).
   */
  async uploadFileBase64(storagePath: string, base64: string, mimeType: string): Promise<void> {
    await uploadString(ref(this.storage, storagePath), base64, 'base64', {
      contentType: mimeType,
    });
  }

  // ── Starter file helpers ───────────────────────────────────────────────────

  /**
   * Seed a starter file for a lab definition.
   * Used during lab creation and seeding.
   */
  async seedStarterFile(labId: string, filePath: string, content: string): Promise<string> {
    const storagePath = `labs/definitions/${labId}/starter/${filePath}`;
    await this.uploadFileText(storagePath, content);
    return storagePath;
  }

  /**
   * Seed a solution file for a lab definition.
   */
  async seedSolutionFile(labId: string, filePath: string, content: string): Promise<string> {
    const storagePath = `labs/definitions/${labId}/solution/${filePath}`;
    await this.uploadFileText(storagePath, content);
    return storagePath;
  }

  // ── Session workspace helpers ──────────────────────────────────────────────

  /**
   * Get the Storage path for a learner's session file.
   */
  getSessionFilePath(sessionId: string, filePath: string): string {
    return `labs/sessions/${sessionId}/workspace/${filePath}`;
  }

  /**
   * Get the Storage path for a session artifact.
   */
  getArtifactPath(sessionId: string): string {
    return `labs/sessions/${sessionId}/artifacts/final.zip`;
  }

  /**
   * Get the Storage path for a submission artifact.
   */
  getSubmissionArtifactPath(submissionId: string): string {
    return `labs/submissions/${submissionId}/artifact.zip`;
  }

  // ── Export helpers ─────────────────────────────────────────────────────────

  /**
   * Create and upload a simple artifact ZIP containing all workspace file contents.
   * For MVP, this creates a concatenated text export (real ZIP requires JSZip).
   * Returns the storage path.
   */
  async exportWorkspaceAsText(
    sessionId: string,
    files: { path: string; content: string }[],
  ): Promise<string> {
    let artifact = `# Lab Session Artifact\n# Session: ${sessionId}\n# Exported: ${new Date().toISOString()}\n\n`;

    for (const file of files) {
      artifact += `\n${'='.repeat(60)}\n## ${file.path}\n${'='.repeat(60)}\n\n${file.content}\n`;
    }

    const storagePath = this.getArtifactPath(sessionId);
    await this.uploadFileText(storagePath, artifact);
    return storagePath;
  }
}
