/**
 * Lab JSON Import Utility
 * ─────────────────────────────────────────────────────────────────────────────
 * Template, parser, and types for importing a lab definition from JSON.
 * The JSON can pre-fill all lab form fields (metadata + learning outcomes +
 * tags + prerequisites). Tasks/files are NOT handled by the form import
 * (they belong to Firestore sub-collections seeded separately).
 */

export interface LabJsonImport {
  title?: string;
  slug?: string;
  subtitle?: string;
  description?: string;
  category?: string;
  difficulty?: string;
  labType?: string;
  validationMode?: string;
  order?: number;
  xp?: number;
  estimatedMinutes?: number;
  tags?: string[];
  learningOutcomes?: string[];
  prerequisites?: string[];
  previewEnabled?: boolean;
  terminalEnabled?: boolean;
  aiCoachEnabled?: boolean;
}

// ─── JSON Template ────────────────────────────────────────────────────────────

export const LAB_JSON_TEMPLATE: string = JSON.stringify(
  {
    title: "Build a CI/CD Pipeline with GitHub Actions",
    slug: "build-cicd-pipeline-github-actions",
    subtitle: "Automate build, test, and deploy using GitHub Actions workflows",
    description: "In this hands-on lab you will create a complete CI/CD pipeline using GitHub Actions. You will configure workflow triggers, add build and test steps, set up Docker image builds, and deploy to a cloud target.",
    category: "devops",
    difficulty: "intermediate",
    labType: "browser",
    validationMode: "rules",
    order: 1,
    xp: 150,
    estimatedMinutes: 45,
    tags: ["github-actions", "ci-cd", "docker", "yaml", "devops"],
    learningOutcomes: [
      "Configure a GitHub Actions workflow YAML file",
      "Set up automated testing in a CI pipeline",
      "Build and push a Docker image from a workflow",
      "Deploy an application to a cloud environment"
    ],
    prerequisites: [
      "Basic understanding of Git and version control",
      "Familiarity with YAML syntax",
      "A GitHub account (free tier is sufficient)"
    ],
    previewEnabled: true,
    terminalEnabled: false,
    aiCoachEnabled: true
  },
  null,
  2
);

// ─── Parser ───────────────────────────────────────────────────────────────────

/**
 * Parses raw JSON text into a LabJsonImport.
 * Throws a descriptive Error on invalid JSON or schema issues.
 */
export function parseLabJsonImport(raw: string): LabJsonImport {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error('No JSON content provided.');

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error('Invalid JSON — please check for missing commas, quotes, or brackets.');
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('JSON must be an object (not an array or primitive).');
  }

  const obj = parsed as Record<string, unknown>;

  // At least a title is required for a useful import
  if (!obj['title'] && !obj['description']) {
    throw new Error('JSON must include at least a "title" or "description" field.');
  }

  const result: LabJsonImport = {};

  if (typeof obj['title'] === 'string')            result.title            = obj['title'];
  if (typeof obj['slug'] === 'string')             result.slug             = obj['slug'];
  if (typeof obj['subtitle'] === 'string')         result.subtitle         = obj['subtitle'];
  if (typeof obj['description'] === 'string')      result.description      = obj['description'];
  if (typeof obj['category'] === 'string')         result.category         = obj['category'];
  if (typeof obj['difficulty'] === 'string')       result.difficulty       = obj['difficulty'];
  if (typeof obj['labType'] === 'string')          result.labType          = obj['labType'];
  if (typeof obj['validationMode'] === 'string')   result.validationMode   = obj['validationMode'];
  if (typeof obj['order'] === 'number')            result.order            = obj['order'];
  if (typeof obj['xp'] === 'number')               result.xp               = obj['xp'];
  if (typeof obj['estimatedMinutes'] === 'number') result.estimatedMinutes = obj['estimatedMinutes'];
  if (typeof obj['previewEnabled'] === 'boolean')  result.previewEnabled   = obj['previewEnabled'];
  if (typeof obj['terminalEnabled'] === 'boolean') result.terminalEnabled  = obj['terminalEnabled'];
  if (typeof obj['aiCoachEnabled'] === 'boolean')  result.aiCoachEnabled   = obj['aiCoachEnabled'];

  if (Array.isArray(obj['tags'])) {
    result.tags = (obj['tags'] as unknown[]).filter((t) => typeof t === 'string') as string[];
  }
  if (Array.isArray(obj['learningOutcomes'])) {
    result.learningOutcomes = (obj['learningOutcomes'] as unknown[]).filter((t) => typeof t === 'string') as string[];
  }
  if (Array.isArray(obj['prerequisites'])) {
    result.prerequisites = (obj['prerequisites'] as unknown[]).filter((t) => typeof t === 'string') as string[];
  }

  return result;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Triggers a browser download of a JSON template file.
 */
export function downloadLabTemplateFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
