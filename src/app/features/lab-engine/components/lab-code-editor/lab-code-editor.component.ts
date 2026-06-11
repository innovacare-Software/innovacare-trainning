import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
  AfterViewInit,
  ViewChild,
  ElementRef,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LocalWorkspaceFile } from '../../models/lab-session.model';
import { LabWorkspaceService } from '../../services/lab-workspace.service';

@Component({
  selector: 'app-lab-code-editor',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="editor-container">
      <!-- File Tabs -->
      <div class="editor-tabs" role="tablist">
        @for (file of files(); track file.id) {
          <button
            class="editor-tab"
            [class.editor-tab--active]="activeFileId() === file.id"
            [class.editor-tab--dirty]="file.isDirty"
            (click)="selectFile(file.id)"
            [id]="'tab-' + file.id"
            role="tab"
            [attr.aria-selected]="activeFileId() === file.id">
            <span class="tab-lang-dot" [style.background]="getLangColor(file.language)"></span>
            <span class="tab-name">{{ getFileName(file.path) }}</span>
            @if (file.isDirty) { <span class="tab-dirty" title="Unsaved changes">●</span> }
            @if (file.readonly) { <span class="tab-readonly" title="Read only">🔒</span> }
          </button>
        }
      </div>

      <!-- Editor Area -->
      <div class="editor-area">
        @if (activeFile()) {
          @if (activeFile()!.readonly) {
            <div class="readonly-banner">🔒 Read-only file — this file cannot be edited</div>
          }
          <div class="editor-wrapper" #editorWrapper>
            <!-- Monaco editor will mount here; fallback textarea if Monaco not loaded -->
            @if (!monacoLoaded()) {
              <textarea
                class="code-textarea"
                [value]="activeFile()!.content"
                [readonly]="activeFile()!.readonly"
                [attr.data-language]="activeFile()!.language"
                (input)="onTextareaChange($event)"
                spellcheck="false"
                autocomplete="off"
                autocorrect="off"
                autocapitalize="off"
                [id]="'editor-' + activeFileId()">
              </textarea>
            }
          </div>

          <!-- Status Bar -->
          <div class="editor-statusbar">
            <span class="statusbar-lang">{{ activeFile()!.language | uppercase }}</span>
            <span class="statusbar-path">{{ activeFile()!.path }}</span>
            @if (activeFile()!.isSaving) {
              <span class="statusbar-saving">⟳ Saving...</span>
            } @else if (activeFile()!.isDirty) {
              <span class="statusbar-modified">● Modified</span>
            } @else {
              <span class="statusbar-saved">✓ Saved</span>
            }
            <span class="statusbar-size">{{ getSize(activeFile()!.content) }}</span>
          </div>
        } @else {
          <div class="editor-empty">
            <div class="editor-empty__icon">📄</div>
            <p>Select a file from the tabs above to start editing</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    /* ── Host fills the .ide-panel--editor grid cell ──────────────────────── */
    :host {
      display: block;
      position: absolute;
      inset: 0;
    }

    .editor-container {
      display: flex;
      flex-direction: column;
      position: absolute;
      inset: 0;
      background: #0d1117;
      overflow: hidden;
    }

    /* ── Tabs ─────────────────────────────────────────────────────────────── */
    .editor-tabs {
      display: flex;
      overflow-x: auto;
      background: #010409;
      border-bottom: 1px solid #21262d;
      flex-shrink: 0;
    }
    .editor-tabs::-webkit-scrollbar { height: 3px; }
    .editor-tabs::-webkit-scrollbar-track { background: transparent; }
    .editor-tabs::-webkit-scrollbar-thumb { background: #334155; border-radius: 2px; }

    .editor-tab {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.55rem 1rem;
      border: none;
      border-right: 1px solid #21262d;
      background: transparent;
      color: #64748b;
      font-size: 0.8rem;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      position: relative;
    }
    .editor-tab::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: transparent;
      transition: background 0.15s;
    }
    .editor-tab:hover { color: #e2e8f0; background: rgba(255,255,255,0.04); }
    .editor-tab--active { color: #e2e8f0; background: #0d1117; }
    .editor-tab--active::after { background: #6366f1; }
    .editor-tab--dirty .tab-name { font-style: italic; }

    .tab-lang-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .tab-dirty { color: #6366f1; font-size: 1rem; margin-left: 2px; }
    .tab-readonly { font-size: 0.7rem; opacity: 0.5; }

    /* ── Editor Area ──────────────────────────────────────────────────────── */
    .editor-area { display: flex; flex-direction: column; flex: 1; overflow: hidden; }

    .readonly-banner {
      background: rgba(245,158,11,0.08);
      border-bottom: 1px solid rgba(245,158,11,0.2);
      color: #fbbf24;
      font-size: 0.75rem;
      padding: 0.35rem 1rem;
      flex-shrink: 0;
    }

    .editor-wrapper { flex: 1; overflow: hidden; position: relative; }

    .code-textarea {
      width: 100%;
      height: 100%;
      background: #0d1117;
      color: #e2e8f0;
      border: none;
      resize: none;
      outline: none;
      padding: 1rem 1.25rem;
      font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
      font-size: 0.875rem;
      line-height: 1.7;
      tab-size: 2;
      white-space: pre;
      overflow: auto;
      box-sizing: border-box;
    }
    .code-textarea::-webkit-scrollbar { width: 8px; height: 8px; }
    .code-textarea::-webkit-scrollbar-track { background: #010409; }
    .code-textarea::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
    .code-textarea[readonly] { opacity: 0.7; cursor: not-allowed; }

    /* ── Status Bar ───────────────────────────────────────────────────────── */
    .editor-statusbar {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.25rem 1rem;
      background: #161b22;
      border-top: 1px solid #21262d;
      flex-shrink: 0;
    }
    .statusbar-lang {
      font-size: 0.7rem;
      color: #6366f1;
      font-weight: 700;
      letter-spacing: 0.08em;
    }
    .statusbar-path {
      font-size: 0.7rem;
      color: #475569;
      font-family: 'JetBrains Mono', monospace;
      flex: 1;
    }
    .statusbar-saving { font-size: 0.7rem; color: #f59e0b; }
    .statusbar-modified { font-size: 0.7rem; color: #6366f1; }
    .statusbar-saved { font-size: 0.7rem; color: #4ade80; }
    .statusbar-size { font-size: 0.7rem; color: #334155; }

    /* ── Empty State ──────────────────────────────────────────────────────── */
    .editor-empty {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #334155;
      gap: 0.5rem;
    }
    .editor-empty__icon { font-size: 2.5rem; }
    .editor-empty p { font-size: 0.875rem; }
  `],
})
export class LabCodeEditorComponent implements AfterViewInit {
  readonly sessionId = input.required<string>();
  readonly files     = input<LocalWorkspaceFile[]>([]);

  @ViewChild('editorWrapper') editorWrapper!: ElementRef<HTMLDivElement>;

  private readonly workspace = inject(LabWorkspaceService);

  readonly activeFileId = computed(() => this.workspace.activeFileId());
  readonly activeFile   = computed(() => this.workspace.activeFile());
  readonly monacoLoaded = signal(false);

  private monacoEditor: unknown = null;

  ngAfterViewInit(): void {
    void this.tryLoadMonaco();
  }

  private async tryLoadMonaco(): Promise<void> {
    // Monaco Editor requires the 'monaco-editor' npm package.
    // Install it with: npm install monaco-editor
    // Then uncomment the dynamic import below.
    // For now, the textarea fallback is used.
    this.monacoLoaded.set(false);
    return;

    // Example (requires npm install monaco-editor):
    // const monaco = await import('monaco-editor').catch(() => null);
    // if (!monaco || !this.editorWrapper?.nativeElement) return;
    // this.monacoEditor = monaco.editor.create(this.editorWrapper.nativeElement, { ... });
    // this.monacoLoaded.set(true);
  }

  selectFile(fileId: string): void {
    void this.workspace.setActiveFile(fileId, this.sessionId());
  }

  onTextareaChange(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    const fileId   = this.activeFileId();
    if (fileId) {
      this.workspace.updateFileContent(fileId, textarea.value, this.sessionId());
    }
  }

  getLangColor(lang: string): string {
    const colors: Record<string, string> = {
      html: '#e34c26', css: '#1572b6', javascript: '#f7df1e',
      typescript: '#3178c6', json: '#f59e0b', yaml: '#cb171e',
      markdown: '#083fa1', shell: '#4ade80', text: '#64748b',
    };
    return colors[lang] ?? '#64748b';
  }

  getFileName(path: string): string {
    return path.split('/').pop() ?? path;
  }

  getSize(content: string): string {
    const bytes = new TextEncoder().encode(content).length;
    return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
  }

  private getMonacoLanguage(lang: string): string {
    const map: Record<string, string> = {
      javascript: 'javascript', typescript: 'typescript', html: 'html',
      css: 'css', json: 'json', yaml: 'yaml', markdown: 'markdown',
      shell: 'shell', text: 'plaintext',
    };
    return map[lang] ?? 'plaintext';
  }
}
