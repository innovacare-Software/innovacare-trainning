import { Injectable, inject } from '@angular/core';
import {
  Storage,
  ref,
  uploadString,
  getBytes,
} from '@angular/fire/storage';
import {
  Firestore,
  doc,
  setDoc,
  serverTimestamp,
} from '@angular/fire/firestore';
import { signal, computed } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, groupBy, mergeMap } from 'rxjs/operators';
import { LocalWorkspaceFile, WorkspaceFile } from '../models/lab-session.model';
import { LabFileDefinition } from '../models/lab-definition.model';

/** Autosave debounce in ms — debounce per-file, not globally */
const AUTOSAVE_DEBOUNCE_MS = 1500;

/** Maximum content size in Firestore contentPreview (chars, not bytes) */
const MAX_PREVIEW_CHARS = 500;

/** Save status for UI feedback */
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

@Injectable({ providedIn: 'root' })
export class LabWorkspaceService {
  private readonly storage = inject(Storage);
  private readonly firestore = inject(Firestore);

  // ── Local in-memory file state (signals) ──────────────────────────────────

  readonly files = signal<LocalWorkspaceFile[]>([]);
  readonly activeFileId = signal<string | null>(null);

  /** Per-file save status (keyed by fileId) */
  readonly fileSaveStatus = signal<Record<string, SaveStatus>>({});

  /** Overall workspace save status: 'saving' if any file is saving */
  readonly saveStatus = computed<SaveStatus>(() => {
    const statuses = Object.values(this.fileSaveStatus());
    if (statuses.some((s) => s === 'error')) return 'error';
    if (statuses.some((s) => s === 'saving')) return 'saving';
    if (statuses.some((s) => s === 'saved')) return 'saved';
    return 'idle';
  });

  /** True if any non-readonly file has unsaved changes */
  readonly hasUnsavedChanges = computed(() =>
    this.files().some((f) => f.isDirty && !f.readonly),
  );

  readonly activeFile = computed(() => {
    const id = this.activeFileId();
    return this.files().find((f) => f.id === id) ?? null;
  });

  // ── Autosave subject — grouped per fileId to avoid cross-file debounce loss ─
  // Phase 5 fix: use groupBy to debounce each file independently.
  // Without groupBy, a global debounce drops autosave events from other files
  // when the user switches files during the debounce window.

  private readonly autosave$ = new Subject<{ sessionId: string; file: LocalWorkspaceFile }>();

  private readonly autosaveSub = this.autosave$
    .pipe(
      groupBy((ev) => ev.file.id),
      mergeMap((group$) =>
        group$.pipe(debounceTime(AUTOSAVE_DEBOUNCE_MS)),
      ),
    )
    .subscribe(({ sessionId, file }) => {
      void this.persistFile(sessionId, file);
    });

  // ── Load workspace from starter files ────────────────────────────────────

  /**
   * Load workspace by downloading each starter file from Storage
   * and populating local in-memory state.
   */
  async loadStarterFiles(
    sessionId: string,
    fileDefs: LabFileDefinition[],
  ): Promise<void> {
    this.files.set([]);
    this.activeFileId.set(null);
    this.fileSaveStatus.set({});

    const localFiles: LocalWorkspaceFile[] = [];

    // Parallel fetch — faster than sequential
    await Promise.allSettled(
      fileDefs.map(async (fileDef) => {
        let content = '';

        // 1. Use inline Firestore content if present (no Storage/CORS needed)
        if (fileDef.starterContent !== undefined && fileDef.starterContent !== null) {
          content = fileDef.starterContent;
        } else {
          // 2. Fall back to Firebase Storage starter file
          try {
            const storageRef = ref(this.storage, fileDef.starterStoragePath);
            const bytes = await getBytes(storageRef);
            content = new TextDecoder().decode(bytes);
          } catch {
            content = this.getDefaultContent(fileDef.language);
          }
        }

        localFiles.push({
          id: fileDef.id,
          path: fileDef.path,
          language: fileDef.language,
          content,
          originalContent: content,
          readonly: fileDef.readonly,
          isDirty: false,
          isSaving: false,
        });
      }),
    );

    // Sort by fileDef order (preserve original sequence after parallel fetch)
    localFiles.sort((a, b) => {
      const ai = fileDefs.findIndex((fd) => fd.id === a.id);
      const bi = fileDefs.findIndex((fd) => fd.id === b.id);
      return ai - bi;
    });

    this.files.set(localFiles);
    if (localFiles.length > 0) {
      this.activeFileId.set(localFiles[0].id);
    }
  }

  /**
   * Load workspace from an existing session's saved files.
   */
  async loadSessionFiles(
    sessionId: string,
    fileDefs: LabFileDefinition[],
  ): Promise<void> {
    this.files.set([]);
    this.fileSaveStatus.set({});

    const localFiles: LocalWorkspaceFile[] = [];

    // Parallel fetch for all files
    await Promise.allSettled(
      fileDefs.map(async (fileDef) => {
        const sessionStoragePath = `labs/sessions/${sessionId}/workspace/${fileDef.path}`;
        let content = '';

        // 1. Try session workspace first (learner's saved progress)
        try {
          const storageRef = ref(this.storage, sessionStoragePath);
          const bytes = await getBytes(storageRef);
          content = new TextDecoder().decode(bytes);
        } catch {
          // 2. Fall back to inline Firestore starter content (JSON-imported labs)
          if (fileDef.starterContent !== undefined && fileDef.starterContent !== null) {
            content = fileDef.starterContent;
          } else {
            // 3. Fall back to Firebase Storage starter file (legacy / seeded labs)
            try {
              const storageRef = ref(this.storage, fileDef.starterStoragePath);
              const bytes = await getBytes(storageRef);
              content = new TextDecoder().decode(bytes);
            } catch {
              content = this.getDefaultContent(fileDef.language);
            }
          }
        }

        localFiles.push({
          id: fileDef.id,
          path: fileDef.path,
          language: fileDef.language,
          content,
          originalContent: content,
          readonly: fileDef.readonly,
          isDirty: false,
          isSaving: false,
        });
      }),
    );

    // Restore original order
    localFiles.sort((a, b) => {
      const ai = fileDefs.findIndex((fd) => fd.id === a.id);
      const bi = fileDefs.findIndex((fd) => fd.id === b.id);
      return ai - bi;
    });

    this.files.set(localFiles);
    if (localFiles.length > 0) {
      this.activeFileId.set(localFiles[0].id);
    }
  }

  // ── In-memory editing ─────────────────────────────────────────────────────

  /**
   * Update file content in memory and trigger per-file autosave debounce.
   */
  updateFileContent(fileId: string, content: string, sessionId: string): void {
    this.files.update((files) =>
      files.map((f) =>
        f.id === fileId ? { ...f, content, isDirty: content !== f.originalContent } : f,
      ),
    );

    const file = this.files().find((f) => f.id === fileId);
    if (file && !file.readonly) {
      this._setSaveStatus(fileId, 'saving');
      this.autosave$.next({ sessionId, file: { ...file, content } });
    }
  }

  /**
   * Switch the active file.
   * Phase 5 fix: flush any pending autosave for the current file BEFORE switching.
   */
  async setActiveFile(fileId: string, sessionId: string): Promise<void> {
    // Flush dirty active file before switching to prevent data loss
    const current = this.activeFile();
    if (current && current.isDirty && !current.readonly && sessionId) {
      await this.persistFile(sessionId, current);
    }
    this.activeFileId.set(fileId);
  }

  // ── Persistence ───────────────────────────────────────────────────────────

  /**
   * Persist a single file to Firebase Storage and update Firestore metadata.
   * Called by the autosave debounce and on explicit save/flush.
   *
   * Phase 5 fix: contentPreview uses byte-safe slice via TextDecoder.
   * Phase 5 fix: proper save/saved/error status signals.
   * Phase 5 fix: retry once on transient failure before marking error.
   */
  async persistFile(sessionId: string, file: LocalWorkspaceFile): Promise<void> {
    if (file.readonly) return;

    this._setSaveStatus(file.id, 'saving');

    // Mark file as saving in local signal
    this.files.update((files) =>
      files.map((f) => (f.id === file.id ? { ...f, isSaving: true } : f)),
    );

    let lastErr: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const storagePath = `labs/sessions/${sessionId}/workspace/${file.path}`;
        const storageRef = ref(this.storage, storagePath);
        await uploadString(storageRef, file.content, 'raw');

        const encoded = new TextEncoder().encode(file.content);
        const sizeBytes = encoded.length;

        // contentPreview: byte-safe slice (avoid splitting multi-byte chars)
        // We decode the first MAX_PREVIEW_CHARS chars worth of bytes
        const previewBytes = encoded.slice(0, MAX_PREVIEW_CHARS * 4); // over-allocate
        const contentPreview = new TextDecoder().decode(previewBytes).slice(0, MAX_PREVIEW_CHARS);

        // Firestore metadata (no content stored in Firestore)
        await setDoc(
          doc(this.firestore, `labSessions/${sessionId}/workspaceFiles/${file.id}`),
          {
            id: file.id,
            path: file.path,
            language: file.language,
            contentStoragePath: storagePath,
            contentPreview,
            readonly: file.readonly,
            modifiedAt: serverTimestamp(),
            sizeBytes,
          },
          { merge: true },
        );

        // Mark clean
        this.files.update((files) =>
          files.map((f) =>
            f.id === file.id
              ? { ...f, isDirty: false, isSaving: false, originalContent: file.content }
              : f,
          ),
        );
        this._setSaveStatus(file.id, 'saved');

        // Reset 'saved' indicator back to 'idle' after 2s
        setTimeout(() => {
          this.fileSaveStatus.update((s) => ({ ...s, [file.id]: 'idle' }));
        }, 2000);

        return; // success
      } catch (err) {
        lastErr = err;
        if (attempt === 0) {
          // Brief pause before retry
          await new Promise((r) => setTimeout(r, 800));
        }
      }
    }

    // Both attempts failed
    this.files.update((files) =>
      files.map((f) => (f.id === file.id ? { ...f, isSaving: false } : f)),
    );
    this._setSaveStatus(file.id, 'error');
    console.error('[LabWorkspace] Failed to persist file after retry', file.path, lastErr);
  }

  /**
   * Flush all dirty files immediately.
   * Phase 5 fix: called before switching files, validating, submitting, or leaving page.
   */
  async saveAll(sessionId: string): Promise<void> {
    const dirty = this.files().filter((f) => f.isDirty && !f.readonly);
    if (dirty.length === 0) return;

    await Promise.allSettled(dirty.map((f) => this.persistFile(sessionId, f)));
  }

  /**
   * Get the current content of a specific file by path.
   * Used by the validation engine.
   */
  getFileContent(filePath: string): string | null {
    const file = this.files().find((f) => f.path === filePath);
    return file?.content ?? null;
  }

  /**
   * Get a map of all current file contents for validation.
   */
  getAllFileContents(): Map<string, string> {
    const map = new Map<string, string>();
    for (const file of this.files()) {
      map.set(file.path, file.content);
    }
    return map;
  }

  /**
   * Reset all files to their original (starter) content.
   */
  resetToStarter(): void {
    this.files.update((files) =>
      files.map((f) => ({
        ...f,
        content: f.originalContent,
        isDirty: false,
      })),
    );
    this.fileSaveStatus.set({});
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private _setSaveStatus(fileId: string, status: SaveStatus): void {
    this.fileSaveStatus.update((s) => ({ ...s, [fileId]: status }));
  }

  private getDefaultContent(language: string): string {
    const defaults: Record<string, string> = {
      html: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>Lab</title>\n</head>\n<body>\n  <!-- Your content here -->\n</body>\n</html>',
      css: '/* Add your styles here */\n',
      javascript: '// Add your JavaScript here\n',
      typescript: '// Add your TypeScript here\n',
      json: '{\n  \n}\n',
      yaml: '# Add your YAML configuration here\n',
      markdown: '# Lab Document\n\n',
      shell: '#!/bin/bash\n# Add your script here\n',
      text: '',
    };
    return defaults[language] ?? '';
  }

  ngOnDestroy(): void {
    this.autosaveSub.unsubscribe();
  }
}
