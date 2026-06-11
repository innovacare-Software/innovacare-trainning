import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LocalWorkspaceFile } from '../../models/lab-session.model';
import { LabDefinition } from '../../models/lab-definition.model';

@Component({
  selector: 'app-lab-preview-panel',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="preview-panel">
      <div class="preview-toolbar">
        <span class="preview-title">
          @switch (previewMode()) {
            @case ('browser') { 🌐 Live Preview }
            @case ('agent') { 🤖 Agent Simulation }
            @default { 📄 Output }
          }
        </span>
        @if (previewMode() === 'browser') {
          <div class="preview-toolbar__actions">
            <div class="device-btns">
              <button class="device-btn" [class.device-btn--active]="device()==='desktop'"
                (click)="device.set('desktop')" title="Desktop">🖥</button>
              <button class="device-btn" [class.device-btn--active]="device()==='tablet'"
                (click)="device.set('tablet')" title="Tablet (768px)">📱</button>
              <button class="device-btn" [class.device-btn--active]="device()==='mobile'"
                (click)="device.set('mobile')" title="Mobile (375px)">📲</button>
            </div>
            <button class="preview-btn preview-btn--toggle"
              [class.preview-btn--on]="autoRefresh()"
              (click)="toggleAutoRefresh()"
              [title]="autoRefresh() ? 'Auto-refresh ON' : 'Auto-refresh OFF'"
              id="preview-auto-refresh">⚡ Auto</button>
            <button class="preview-btn preview-btn--run"
              (click)="runPreview()"
              [disabled]="!hasHtmlFile()"
              title="Run preview"
              id="preview-run">▶ Run</button>
            <button class="preview-btn preview-btn--icon"
              (click)="clearPreview()" title="Clear" id="preview-clear">✕</button>
            <button class="preview-btn preview-btn--icon"
              (click)="openFullscreen()" title="Open in new tab" id="preview-fullscreen">⊞</button>
          </div>
        }
      </div>

      @if (previewMode() === 'browser') {
        <div class="preview-frame-wrapper">
          <div class="preview-frame-scaler"
            [style.width]="deviceWidth()"
            [style.max-width]="deviceWidth()">
            @if (!previewActive()) {
              <div class="preview-placeholder">
                <div class="preview-placeholder__icon">🌐</div>
                <p>Click <strong>▶ Run</strong> to render your HTML.</p>
                <p class="preview-placeholder__note">
                  CSS &amp; JS files (including <code>&lt;link&gt;</code> / <code>&lt;script src&gt;</code>) are bundled automatically.<br>
                  Enable <strong>⚡ Auto</strong> for live updates as you type.
                </p>
              </div>
            }
            @if (previewActive()) {
              <iframe
                [srcdoc]="sandboxedHtml()"
                class="preview-iframe"
                sandbox="allow-scripts"
                title="Lab Preview — Isolated Sandbox"
                id="lab-preview-iframe"
                referrerpolicy="no-referrer">
              </iframe>
            }
          </div>
          @if (previewError()) {
            <div class="preview-error" role="alert">
              <span>⚠️</span><span>{{ previewError() }}</span>
            </div>
          }
        </div>
      }

      @if (previewMode() === 'agent') {
        <div class="agent-preview">
          <div class="agent-preview__header">
            <span class="agent-badge">AI Agent Runtime Simulation</span>
          </div>
          <div class="simulation-output">
            <div class="sim-section">
              <span class="sim-label">INTAKE CLASSIFICATION</span>
              <span class="sim-value sim-value--pending">Awaiting agent manifest...</span>
            </div>
            <div class="sim-section">
              <span class="sim-label">RISK SCORE</span>
              <div class="risk-meter"><div class="risk-bar" [style.width.%]="agentRiskScore()"></div></div>
              <span class="sim-value">{{ agentRiskScore() > 70 ? 'HIGH' : agentRiskScore() > 40 ? 'MEDIUM' : 'LOW' }}</span>
            </div>
            <div class="sim-section">
              <span class="sim-label">APPROVAL GATE</span>
              <span class="sim-value" [class.sim-value--required]="agentRiskScore() > 70">
                @if (agentRiskScore() > 70) { 🔴 Human Approval Required }
                @else { 🟢 Auto-process eligible }
              </span>
            </div>
            <div class="sim-section">
              <span class="sim-label">AGENT STATUS</span>
              <span class="sim-value">
                @if (hasAgentManifest()) { ✓ Manifest loaded — agent ready }
                @else { ⚠ Define agent_manifest.yaml to activate simulation }
              </span>
            </div>
          </div>
          @if (hasAgentManifest()) {
            <div class="agent-log">
              <span class="log-title">AUDIT LOG PREVIEW</span>
              <div class="log-entry">
                <span class="log-ts">{{ currentTimestamp() }}</span>
                <span class="log-agent">agent-01</span>
                <span class="log-action">intake_received</span>
                <span class="log-status log-status--ok">processed</span>
              </div>
            </div>
          }
        </div>
      }

      @if (previewMode() === 'none') {
        <div class="preview-disabled">
          <div class="preview-disabled__icon">🖥️</div>
          <h4>Preview not available</h4>
          <p>Validation results will appear after you click "Validate Lab".</p>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      position: absolute;
      inset: 0;
    }

    .preview-panel {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      background: #0a0d14;
      overflow: hidden;
    }

    /* ── Toolbar ──────────────────────────────────────────────────────────── */
    .preview-toolbar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.4rem 0.75rem; background: #010409;
      border-bottom: 1px solid #21262d; flex-shrink: 0; gap: 0.5rem;
      flex-wrap: wrap;
    }
    .preview-title {
      font-size: 0.75rem; font-weight: 700; color: #94a3b8;
      text-transform: uppercase; letter-spacing: 0.08em; white-space: nowrap;
    }
    .preview-toolbar__actions { display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap; }

    .device-btns { display: flex; border: 1px solid #21262d; border-radius: 4px; overflow: hidden; }
    .device-btn {
      background: transparent; border: none; color: #475569;
      padding: 0.2rem 0.45rem; cursor: pointer; font-size: 0.8rem;
      transition: all 0.15s; border-right: 1px solid #21262d;
    }
    .device-btn:last-child { border-right: none; }
    .device-btn:hover { background: rgba(255,255,255,0.06); color: #94a3b8; }
    .device-btn--active { background: rgba(99,102,241,0.15); color: #a5b4fc; }

    .preview-btn {
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
      color: #64748b; padding: 0.22rem 0.55rem; border-radius: 4px;
      font-size: 0.72rem; cursor: pointer; transition: all 0.15s;
      font-family: inherit; white-space: nowrap;
    }
    .preview-btn:hover { color: #e2e8f0; background: rgba(255,255,255,0.08); }
    .preview-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .preview-btn--run { background: rgba(99,102,241,0.15); border-color: rgba(99,102,241,0.3); color: #a5b4fc; }
    .preview-btn--run:hover:not(:disabled) { background: rgba(99,102,241,0.28); color: #c7d2fe; }
    .preview-btn--toggle { background: rgba(255,255,255,0.04); border-color: #21262d; color: #475569; }
    .preview-btn--on { background: rgba(74,222,128,0.12); border-color: rgba(74,222,128,0.3); color: #4ade80; }
    .preview-btn--icon { padding: 0.22rem 0.5rem; }

    /* ── Browser Iframe ───────────────────────────────────────────────────── */
    .preview-frame-wrapper {
      flex: 1;
      min-height: 0;    /* allow flex to constrain so iframe fills correctly */
      position: relative;
      overflow: auto;
      display: flex;
      justify-content: center;
      background: #161b22;
    }
    .preview-frame-scaler {
      width: 100%; height: 100%;
      display: flex; flex-direction: column;
      transition: max-width 0.3s ease; background: white;
    }
    .preview-iframe { width: 100%; flex: 1; border: none; background: white; display: block; }
    .preview-placeholder {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: center; text-align: center;
      padding: 2rem; gap: 0.75rem; color: #475569; background: #0a0d14;
    }
    .preview-placeholder__icon { font-size: 2.5rem; }
    .preview-placeholder p { font-size: 0.85rem; margin: 0; max-width: 300px; line-height: 1.6; }
    .preview-placeholder code { background: rgba(255,255,255,0.07); padding: 0.1rem 0.35rem; border-radius: 3px; font-size: 0.8rem; }
    .preview-placeholder__note { font-size: 0.75rem !important; color: #334155; }
    .preview-error {
      position: absolute; bottom: 0; left: 0; right: 0;
      background: rgba(239,68,68,0.9); color: white;
      padding: 0.5rem 1rem; font-size: 0.8rem; display: flex; gap: 0.5rem;
    }

    /* ── Agent Preview ────────────────────────────────────────────────────── */
    .agent-preview { flex: 1; overflow-y: auto; padding: 1rem; }
    .agent-preview__header { margin-bottom: 1rem; }
    .agent-badge {
      font-size: 0.7rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
      color: #a5b4fc; background: rgba(99,102,241,0.15);
      border: 1px solid rgba(99,102,241,0.3); padding: 0.25rem 0.75rem; border-radius: 100px;
    }
    .simulation-output { background: #0d1117; border: 1px solid #21262d; border-radius: 8px; overflow: hidden; margin-bottom: 1rem; }
    .sim-section { display: flex; align-items: center; gap: 1rem; padding: 0.6rem 1rem; border-bottom: 1px solid #21262d; }
    .sim-section:last-child { border-bottom: none; }
    .sim-label { font-size: 0.65rem; font-weight: 700; letter-spacing: 0.1em; color: #475569; text-transform: uppercase; width: 140px; flex-shrink: 0; }
    .sim-value { font-size: 0.78rem; color: #94a3b8; font-family: 'JetBrains Mono', monospace; }
    .sim-value--pending { color: #475569; font-style: italic; }
    .sim-value--required { color: #f87171 !important; }
    .risk-meter { width: 80px; height: 6px; background: rgba(255,255,255,0.08); border-radius: 100px; overflow: hidden; }
    .risk-bar { height: 100%; background: linear-gradient(90deg, #4ade80, #f59e0b, #ef4444); border-radius: 100px; transition: width 0.5s; }
    .agent-log { background: #010409; border: 1px solid #21262d; border-radius: 8px; padding: 0.75rem; font-family: 'JetBrains Mono', monospace; }
    .log-title { font-size: 0.65rem; font-weight: 700; color: #475569; letter-spacing: 0.1em; display: block; margin-bottom: 0.5rem; }
    .log-entry { display: flex; gap: 0.75rem; padding: 0.2rem 0; font-size: 0.72rem; }
    .log-ts { color: #334155; } .log-agent { color: #6366f1; }
    .log-action { color: #38bdf8; flex: 1; } .log-status { color: #4ade80; }
    .log-status--warn { color: #f59e0b; } .log-status--ok { color: #4ade80; }

    /* ── Disabled ─────────────────────────────────────────────────────────── */
    .preview-disabled {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      color: #334155; gap: 0.5rem; padding: 2rem; text-align: center;
    }
    .preview-disabled__icon { font-size: 2.5rem; }
    .preview-disabled h4 { color: #475569; margin: 0; font-size: 0.9rem; }
    .preview-disabled p { font-size: 0.8rem; color: #334155; }
  `],
})
export class LabPreviewPanelComponent {
  readonly lab   = input<LabDefinition | null>(null);
  readonly files = input<LocalWorkspaceFile[]>([]);

  readonly previewError  = signal<string | null>(null);
  readonly previewActive = signal(false);
  readonly autoRefresh   = signal(false);
  readonly device        = signal<'desktop' | 'tablet' | 'mobile'>('desktop');
  readonly sandboxedHtml = signal('');
  readonly currentTimestamp = signal(new Date().toISOString().slice(11, 19));

  private autoRefreshTimer: ReturnType<typeof setTimeout> | null = null;

  readonly deviceWidth = computed(() => {
    switch (this.device()) {
      case 'tablet': return '768px';
      case 'mobile': return '375px';
      default:       return '100%';
    }
  });

  readonly previewMode = computed((): 'browser' | 'agent' | 'none' => {
    const lab = this.lab();
    if (!lab) return 'none';
    if (lab.labType === 'agent-config') return 'agent';
    // Show browser preview whenever there are HTML files OR lab is marked as browser
    const hasHtml = this.files().some(f => f.language === 'html');
    if (hasHtml || lab.labType === 'browser' || lab.previewEnabled) return 'browser';
    return 'none';
  });

  readonly hasHtmlFile = computed(() =>
    this.files().some((f) => f.language === 'html'),
  );

  readonly hasAgentManifest = computed(() =>
    this.files().some((f) => f.path.includes('agent_manifest') && f.content.length > 50),
  );

  readonly agentRiskScore = computed(() => {
    const manifest = this.files().find((f) => f.path.includes('agent_manifest'));
    if (!manifest) return 30;
    const c = manifest.content.toLowerCase();
    if (c.includes('high_risk') || c.includes('human_approval')) return 75;
    if (c.includes('medium_risk')) return 45;
    return 20;
  });

  constructor() {
    // Auto-refresh: re-run preview when file contents change (debounced 800ms)
    effect(() => {
      const contents = this.files().map(f => f.content).join('|||');
      const enabled  = this.autoRefresh();
      const active   = this.previewActive();
      if (enabled && active && contents) {
        if (this.autoRefreshTimer) clearTimeout(this.autoRefreshTimer);
        this.autoRefreshTimer = setTimeout(() => this.runPreview(), 800);
      }
    });
  }

  /**
   * Builds a fully self-contained HTML document from workspace files.
   * Resolves <link href="..."> and <script src="..."> tags from workspace.
   * Injects any unreferenced CSS/JS files automatically.
   * Security: sandboxed iframe + strict CSP — no external network, no parent access.
   */
  runPreview(): void {
    this.previewError.set(null);

    const htmlFile = this.files().find((f) => f.language === 'html');
    if (!htmlFile) {
      this.previewError.set('No HTML file found in workspace.');
      return;
    }

    // Build lookup map: filename → content (short name and full path)
    const fileMap = new Map<string, string>();
    for (const f of this.files()) {
      fileMap.set(f.path, f.content);
      const shortName = f.path.split('/').pop();
      if (shortName) fileMap.set(shortName, f.content);
    }

    let html = htmlFile.content;
    const inlinedPaths = new Set<string>();

    // 1. Resolve <link rel="stylesheet" href="..."> → inline <style>
    html = html.replace(
      /<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*\/?>/gi,
      (match, href) => {
        const content = fileMap.get(href) ?? fileMap.get(href.split('/').pop() ?? '');
        if (content !== undefined) { inlinedPaths.add(href); inlinedPaths.add(href.split('/').pop() ?? ''); return `<style>/* ${href} */\n${content}\n</style>`; }
        return match;
      },
    );
    html = html.replace(
      /<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["']stylesheet["'][^>]*\/?>/gi,
      (match, href) => {
        const content = fileMap.get(href) ?? fileMap.get(href.split('/').pop() ?? '');
        if (content !== undefined) { inlinedPaths.add(href); inlinedPaths.add(href.split('/').pop() ?? ''); return `<style>/* ${href} */\n${content}\n</style>`; }
        return match;
      },
    );

    // 2. Resolve <script src="..."></script> → inline <script>
    html = html.replace(
      /<script\b[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi,
      (match, src) => {
        const content = fileMap.get(src) ?? fileMap.get(src.split('/').pop() ?? '');
        if (content !== undefined) { inlinedPaths.add(src); inlinedPaths.add(src.split('/').pop() ?? ''); return `<script>/* ${src} */\n${content}\n<\/script>`; }
        return match;
      },
    );

    // 3. Auto-inject unreferenced CSS/JS files
    const extraCss = this.files()
      .filter(f => f.language === 'css' && !inlinedPaths.has(f.path) && !inlinedPaths.has(f.path.split('/').pop()!))
      .map(f => `<style>/* auto: ${f.path} */\n${f.content}\n</style>`)
      .join('\n');
    if (extraCss) {
      html = html.includes('</head>') ? html.replace('</head>', `${extraCss}\n</head>`) : extraCss + '\n' + html;
    }

    const extraJs = this.files()
      .filter(f => f.language === 'javascript' && !inlinedPaths.has(f.path) && !inlinedPaths.has(f.path.split('/').pop()!))
      .map(f => `<script>/* auto: ${f.path} */\n${f.content}\n<\/script>`)
      .join('\n');
    if (extraJs) {
      html = html.includes('</body>') ? html.replace('</body>', `${extraJs}\n</body>`) : html + '\n' + extraJs;
    }

    // 4. Inject strict CSP (inline scripts/styles only, no external network)
    const csp = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline' 'unsafe-eval'; img-src data: blob:; font-src data:; connect-src 'none'; object-src 'none';">`;
    html = html.includes('<head>') ? html.replace('<head>', `<head>\n  ${csp}`) : `<head>\n  ${csp}\n</head>\n` + html;

    this.sandboxedHtml.set(html);
    this.previewActive.set(true);
  }

  toggleAutoRefresh(): void {
    this.autoRefresh.update(v => !v);
  }

  clearPreview(): void {
    this.sandboxedHtml.set('');
    this.previewActive.set(false);
    this.previewError.set(null);
  }

  openFullscreen(): void {
    if (!this.previewActive()) this.runPreview();
    const blob = new Blob([this.sandboxedHtml()], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}
