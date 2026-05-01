import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Storage, getDownloadURL, ref, uploadBytes } from '@angular/fire/storage';
import { ProgramDocumentsAdminService } from '../services/program-documents-admin.service';
import { ProgramModulesAdminService } from '../services/program-modules-admin.service';
import { ContentStatus, DocumentFileType, ProgramContentModule } from '../models/content-builder.models';

@Component({
  selector: 'app-document-form-page',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  template: `
    <section class="form-page">
      <header class="form-header">
        <a [routerLink]="['/program-admin/programs', programId, 'documents']" class="back-link">← Documents</a>
        <h1>{{ isEditMode ? 'Edit Document' : 'New Document' }}</h1>
      </header>

      <form class="form-card" [formGroup]="form" (ngSubmit)="onSubmit()">
        <div class="form-grid">
          <div class="field">
            <label>Module (optional)</label>
            <select formControlName="moduleId">
              <option value="">— No Module —</option>
              <option *ngFor="let m of modules" [value]="m.id">{{ m.title }}</option>
            </select>
          </div>
          <div class="field">
            <label>File Type *</label>
            <select formControlName="fileType">
              <option value="PDF">PDF</option>
              <option value="DOCX">Word Document</option>
              <option value="PPTX">PowerPoint</option>
              <option value="XLSX">Excel</option>
              <option value="IMAGE">Image</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div class="field full">
            <label>Title *</label>
            <input type="text" formControlName="title" placeholder="Document title" />
          </div>
          <div class="field full">
            <label>Description</label>
            <textarea formControlName="description" rows="2" placeholder="Brief description"></textarea>
          </div>
          <div class="field full">
            <label>File URL *</label>
            <input type="text" formControlName="fileUrl" placeholder="https://..." />
            <div class="field-actions">
              <label class="upload-btn" [class.is-busy]="uploadingFile">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.gif,.txt"
                  (change)="onFileSelected($event)"
                  [disabled]="uploadingFile"
                />
                {{ uploadingFile ? 'Uploading…' : 'Upload Document' }}
              </label>
              <button type="button" class="btn-clear-file" *ngIf="form.value.fileUrl" (click)="clearFileUrl()">Clear</button>
            </div>
            <div class="field-hint" *ngIf="form.value.fileName">Uploaded: {{ form.value.fileName }}</div>
            <p class="error-msg inline" *ngIf="uploadError">{{ uploadError }}</p>
          </div>
          <div class="field">
            <label>Order</label>
            <input type="number" formControlName="order" min="0" />
          </div>
          <div class="field">
            <label>Status</label>
            <select formControlName="status">
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
          <div class="field checkboxes">
            <label class="checkbox-label">
              <input type="checkbox" formControlName="downloadable" /> Downloadable
            </label>
            <label class="checkbox-label">
              <input type="checkbox" formControlName="active" /> Active
            </label>
          </div>
        </div>

        <div class="form-actions">
          <a [routerLink]="['/program-admin/programs', programId, 'documents']" class="btn-cancel">Cancel</a>
          <button type="submit" class="btn-save" [disabled]="form.invalid || saving">
            {{ saving ? 'Saving…' : (isEditMode ? 'Update Document' : 'Create Document') }}
          </button>
        </div>
        <p class="error-msg" *ngIf="error">{{ error }}</p>
      </form>
    </section>
  `,
  styles: [`
    .form-page { display: grid; gap: 1rem; }
    .form-header { background: #fff; border: 1px solid #d4e2f0; border-radius: 1rem; padding: 1.2rem 1.4rem; }
    .back-link { color: #1a74c8; text-decoration: none; font-size: 0.85rem; font-weight: 600; }
    h1 { margin: 0.25rem 0; color: #0f3659; }
    .form-card { background: #fff; border: 1px solid #d9e5f2; border-radius: 1rem; padding: 1.5rem; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .field { display: flex; flex-direction: column; gap: 0.35rem; }
    .field.full { grid-column: 1 / -1; }
    label { font-size: 0.82rem; font-weight: 600; color: #4f7097; }
    input[type="text"], input[type="number"], textarea, select { padding: 0.55rem 0.75rem; border: 1px solid #c8dff7; border-radius: 0.55rem; font-size: 0.9rem; color: #1e3a5a; outline: none; width: 100%; box-sizing: border-box; }
    input:focus, textarea:focus, select:focus { border-color: #1a74c8; }
    textarea { resize: vertical; }
    .field-actions { display: flex; gap: 0.65rem; align-items: center; flex-wrap: wrap; margin-top: 0.2rem; }
    .field-hint { color: #6b8aaa; font-size: 0.78rem; }
    .upload-btn {
      display: inline-flex; align-items: center; justify-content: center; min-height: 38px; padding: 0 1rem;
      border-radius: 0.65rem; background: #eff6ff; color: #1a74c8; font-size: 0.84rem; font-weight: 700; cursor: pointer;
      border: 1px solid #bfdbfe;
    }
    .upload-btn.is-busy { opacity: 0.7; cursor: wait; }
    .upload-btn input { display: none; }
    .btn-clear-file {
      min-height: 38px; padding: 0 1rem; border-radius: 0.65rem; border: 1px solid #d9e5f2;
      background: #fff; color: #4f7097; font-size: 0.84rem; font-weight: 700; cursor: pointer;
    }
    .checkboxes { flex-direction: row; align-items: center; gap: 1rem; padding-top: 1.4rem; }
    .checkbox-label { display: flex; align-items: center; gap: 0.35rem; font-size: 0.88rem; color: #1e3a5a; cursor: pointer; }
    .form-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #e8f0fb; }
    .btn-cancel { padding: 0.5rem 1rem; border-radius: 0.55rem; text-decoration: none; font-size: 0.88rem; font-weight: 600; background: #f1f5fb; color: #4f7097; }
    .btn-save { padding: 0.55rem 1.4rem; border-radius: 0.65rem; border: none; cursor: pointer; font-size: 0.9rem; font-weight: 700; background: linear-gradient(135deg, #0f3659, #1a74c8); color: #fff; }
    .btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
    .error-msg { color: #b91c1c; font-size: 0.85rem; margin-top: 0.5rem; }
    .error-msg.inline { margin-top: 0; }
  `],
})
export class DocumentFormPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly storage = inject(Storage);
  private readonly documentsService = inject(ProgramDocumentsAdminService);
  private readonly modulesService = inject(ProgramModulesAdminService);

  programId = '';
  documentId: string | null = null;
  isEditMode = false;
  saving = false;
  uploadingFile = false;
  error = '';
  uploadError = '';
  modules: ProgramContentModule[] = [];

  readonly form = this.fb.group({
    moduleId: [''],
    title: ['', Validators.required],
    description: [''],
    fileUrl: ['', Validators.required],
    filePath: [''],
    fileName: [''],
    fileType: [DocumentFileType.PDF, Validators.required],
    downloadable: [true],
    order: [0],
    active: [true],
    status: [ContentStatus.DRAFT],
  });

  ngOnInit(): void {
    this.programId = this.getRequiredProgramId();
    this.documentId = this.route.snapshot.params['documentId'] ?? null;
    this.isEditMode = !!this.documentId;

    this.modulesService.getModules(this.programId).subscribe((m) => (this.modules = m));

    if (this.isEditMode && this.documentId) {
      this.documentsService.getDocumentById(this.programId, this.documentId).subscribe((doc) => {
        if (!doc) return;
        this.form.patchValue({
          moduleId: doc.moduleId ?? '',
          title: doc.title,
          description: doc.description,
          fileUrl: doc.fileUrl,
          filePath: doc.filePath ?? '',
          fileName: doc.fileName ?? '',
          fileType: doc.fileType,
          downloadable: doc.downloadable,
          order: doc.order,
          active: doc.active,
          status: doc.status,
        });
      });
    }
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;
    this.saving = true;
    this.error = '';
    try {
      const raw = this.form.getRawValue();
      const payload = {
        programId: this.programId,
        moduleId: raw.moduleId ?? '',
        title: raw.title ?? '',
        description: raw.description ?? '',
        fileUrl: raw.fileUrl ?? '',
        filePath: raw.filePath ?? '',
        fileName: raw.fileName ?? '',
        fileType: raw.fileType as DocumentFileType,
        downloadable: raw.downloadable ?? true,
        order: raw.order ?? 0,
        active: raw.active ?? true,
        status: raw.status as ContentStatus,
      };
      if (this.isEditMode && this.documentId) {
        await this.documentsService.updateDocument(this.programId, this.documentId, payload);
      } else {
        await this.documentsService.createDocument(this.programId, payload);
      }
      await this.router.navigate(['/program-admin/programs', this.programId, 'documents']);
    } catch (e: unknown) {
      this.error = e instanceof Error ? e.message : 'An error occurred';
    } finally {
      this.saving = false;
    }
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      return;
    }

    this.uploadingFile = true;
    this.uploadError = '';

    try {
      const safeName = this.sanitizeFileName(file.name || 'document');
      const storagePath = `programs/${this.programId}/documents/${Date.now()}-${safeName}`;
      const storageRef = ref(this.storage, storagePath);
      await uploadBytes(storageRef, file, {
        contentType: file.type || 'application/octet-stream',
      });
      const downloadUrl = await getDownloadURL(storageRef);

      this.form.patchValue({
        fileUrl: downloadUrl,
        filePath: storagePath,
        fileName: safeName,
        fileType: this.detectFileType(file.name, file.type),
      });

      if (!String(this.form.value.title || '').trim()) {
        this.form.patchValue({ title: safeName.replace(/\.[^.]+$/, '') });
      }
    } catch (e: unknown) {
      this.uploadError = e instanceof Error ? e.message : 'Upload failed. Please try again.';
    } finally {
      this.uploadingFile = false;
      if (input) {
        input.value = '';
      }
    }
  }

  clearFileUrl(): void {
    this.form.patchValue({
      fileUrl: '',
      filePath: '',
      fileName: '',
    });
  }

  private detectFileType(fileName: string, mimeType: string): DocumentFileType {
    const lowerName = String(fileName || '').toLowerCase();
    const lowerMime = String(mimeType || '').toLowerCase();

    if (lowerName.endsWith('.pdf') || lowerMime.includes('pdf')) return DocumentFileType.PDF;
    if (lowerName.endsWith('.doc') || lowerName.endsWith('.docx') || lowerMime.includes('word')) return DocumentFileType.DOCX;
    if (lowerName.endsWith('.ppt') || lowerName.endsWith('.pptx') || lowerMime.includes('presentation') || lowerMime.includes('powerpoint')) return DocumentFileType.PPTX;
    if (lowerName.endsWith('.xls') || lowerName.endsWith('.xlsx') || lowerMime.includes('spreadsheet') || lowerMime.includes('excel')) return DocumentFileType.XLSX;
    if (lowerMime.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(lowerName)) return DocumentFileType.IMAGE;
    return DocumentFileType.OTHER;
  }

  private sanitizeFileName(fileName: string): string {
    const cleaned = String(fileName || 'document')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');

    return cleaned || 'document';
  }

  private getRequiredProgramId(): string {
    const programId = this.route.snapshot.pathFromRoot
      .map((routeSnapshot) => routeSnapshot.paramMap.get('programId'))
      .find((value): value is string => !!value?.trim());

    if (!programId) {
      throw new Error('Missing programId in route. Open this page from a specific program.');
    }

    return programId;
  }
}
