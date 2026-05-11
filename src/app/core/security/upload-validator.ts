/**
 * Lightweight client-side upload validator.
 *
 * Returns a list of human-readable reasons when an upload looks unsafe.
 * The frontend should reject the upload AND log a SUSPICIOUS_UPLOAD event
 * via SecurityLoggerService when this returns a non-empty array.
 *
 * This is defence-in-depth: the canonical check still happens server-side.
 */

const DANGEROUS_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'sh', 'ps1', 'vbs', 'js', 'mjs', 'jar',
  'msi', 'apk', 'dll', 'so', 'php', 'asp', 'aspx', 'jsp',
]);

const DANGEROUS_MIME = new Set([
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-sh',
  'application/x-bat',
  'application/javascript',
  'text/javascript',
  'image/svg+xml', // SVG can carry inline <script>
  'text/html',
  'application/xhtml+xml',
]);

const ALLOWED_MIME_PREFIXES = ['image/', 'application/pdf', 'video/', 'audio/'];

export interface UploadValidationResult {
  ok: boolean;
  reasons: string[];
}

export function validateUpload(
  file: File,
  opts: { maxBytes?: number; allowedMime?: string[] } = {},
): UploadValidationResult {
  const reasons: string[] = [];
  const maxBytes = opts.maxBytes ?? 25 * 1024 * 1024; // 25 MB default

  if (!file || file.size === 0) {
    return { ok: false, reasons: ['empty_file'] };
  }

  if (file.size > maxBytes) {
    reasons.push(`size_exceeds_${maxBytes}`);
  }

  const name = file.name.toLowerCase();
  const parts = name.split('.');
  if (parts.length >= 3) {
    // Double extension like "report.pdf.exe"
    const tail2 = parts.slice(-2).join('.');
    if (DANGEROUS_EXTENSIONS.has(parts[parts.length - 1]) ||
        DANGEROUS_EXTENSIONS.has(tail2)) {
      reasons.push('double_extension');
    }
  }
  const ext = parts[parts.length - 1] ?? '';
  if (DANGEROUS_EXTENSIONS.has(ext)) {
    reasons.push(`dangerous_extension_${ext}`);
  }

  const mime = (file.type || '').toLowerCase();
  if (DANGEROUS_MIME.has(mime)) {
    reasons.push(`dangerous_mime_${mime}`);
  }

  if (opts.allowedMime && opts.allowedMime.length) {
    const allowed = opts.allowedMime.map((m) => m.toLowerCase());
    if (!allowed.includes(mime)) {
      reasons.push('mime_not_allowed');
    }
  } else if (mime && !ALLOWED_MIME_PREFIXES.some((p) => mime.startsWith(p))) {
    reasons.push('mime_outside_default_allowlist');
  }

  return { ok: reasons.length === 0, reasons };
}
