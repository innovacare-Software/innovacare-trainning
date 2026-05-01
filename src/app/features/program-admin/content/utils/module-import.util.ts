import { ContentModuleStatus, ContentStatus, LessonType } from '../models/content-builder.models';

/* ─────────────────────────────────────────
   TYPES
───────────────────────────────────────── */

export interface ImportedLesson {
  order: number;
  title: string;
  slug: string;
  description: string;
  lessonType: LessonType;
  contentHtml: string;
  durationMin: number;
  isRequired: boolean;
  isActive: boolean;
  status: ContentStatus;
}

export interface ModuleJsonImport {
  title: string;
  slug: string;
  description: string;
  estimatedHours: number;
  isRequired: boolean;
  isActive: boolean;
  status: ContentModuleStatus;
  objectives: string[];
  lessons: ImportedLesson[];
}

/* ─────────────────────────────────────────
   PARSE
───────────────────────────────────────── */

export function parseModuleJsonImport(rawJson: string): ModuleJsonImport {
  const trimmed = rawJson.trim();
  if (!trimmed) {
    throw new Error('Paste or upload a module JSON before importing.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error('Invalid JSON — could not parse file.');
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('The module JSON must be a top-level object.');
  }

  const rec = parsed as Record<string, unknown>;

  const title = readString(rec['title'], 'title');
  const slug = readString(rec['slug'] ?? slugify(title), 'slug');
  const description = readString(rec['description'] ?? '', 'description', false);
  const estimatedHours = readNumber(rec['estimatedHours'] ?? rec['estimatedMinutes'], 'estimatedHours', true);
  const isRequired = rec['isRequired'] === true || rec['required'] === true;
  const isActive = rec['isActive'] === true || rec['active'] === true;
  const status = readEnum(rec['status'], ContentModuleStatus, ContentModuleStatus.DRAFT);

  const objectivesRaw = rec['learningObjectives'] ?? rec['objectives'];
  const objectives: string[] = Array.isArray(objectivesRaw)
    ? objectivesRaw.filter((o): o is string => typeof o === 'string')
    : [];

  const rawLessons = rec['lessons'];
  const lessons: ImportedLesson[] = Array.isArray(rawLessons)
    ? rawLessons.map((l, i) => parseLessonEntry(l, i))
    : [];

  return { title, slug, description, estimatedHours, isRequired, isActive, status, objectives, lessons };
}

function parseLessonEntry(raw: unknown, index: number): ImportedLesson {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error(`Lesson at index ${index} is not an object.`);
  }

  const rec = raw as Record<string, unknown>;

  const order = typeof rec['order'] === 'number' ? rec['order'] : index;
  const title = readString(rec['title'], `lessons[${index}].title`);
  const slug = readString(rec['slug'] ?? slugify(title), `lessons[${index}].slug`, false);
  const description = readString(rec['description'] ?? '', `lessons[${index}].description`, false);

  const rawType = typeof rec['lessonType'] === 'string' ? rec['lessonType'].toUpperCase() : 'TEXT';
  const lessonType = mapLessonType(rawType);

  // htmlContent can come from "htmlContent" or "content"
  const contentHtml = typeof rec['htmlContent'] === 'string'
    ? rec['htmlContent']
    : typeof rec['content'] === 'string'
    ? rec['content']
    : '';

  const durationMin = typeof rec['estimatedMinutes'] === 'number'
    ? rec['estimatedMinutes']
    : typeof rec['durationMin'] === 'number'
    ? rec['durationMin']
    : 0;

  const isRequired = rec['isRequired'] === true;
  const isActive = rec['isActive'] === true || rec['active'] === true;
  const status = readEnum(rec['status'], ContentStatus, ContentStatus.DRAFT);

  return { order, title, slug, description, lessonType, contentHtml, durationMin, isRequired, isActive, status };
}

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */

function readString(value: unknown, field: string, required = true): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (required) throw new Error(`Missing required field: ${field}`);
  return '';
}

function readNumber(value: unknown, field: string, allowZero = false): number {
  if (typeof value === 'number' && (allowZero || value > 0)) return value;
  if (typeof value === 'string') {
    const n = parseFloat(value);
    if (!isNaN(n) && (allowZero || n > 0)) return n;
  }
  return 0;
}

function readEnum<T extends Record<string, string>>(
  value: unknown,
  enumObj: T,
  fallback: T[keyof T]
): T[keyof T] {
  if (typeof value === 'string') {
    const upper = value.toUpperCase();
    const found = Object.values(enumObj).find((v) => v.toUpperCase() === upper);
    if (found) return found as T[keyof T];
  }
  return fallback;
}

function mapLessonType(raw: string): LessonType {
  switch (raw) {
    case 'VIDEO': return LessonType.VIDEO;
    case 'DOCUMENT': return LessonType.DOCUMENT;
    case 'WEB': return LessonType.WEB;
    case 'MIXED': return LessonType.MIXED;
    default: return LessonType.TEXT;
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
}

/* ─────────────────────────────────────────
   TEMPLATE JSON (downloadable)
───────────────────────────────────────── */

export const MODULE_JSON_TEMPLATE = JSON.stringify(
  {
    title: 'My Training Module',
    slug: 'my-training-module',
    description: 'Short description of this module.',
    estimatedHours: 4,
    isRequired: true,
    isActive: true,
    status: 'DRAFT',
    learningObjectives: [
      'Understand the core concepts.',
      'Apply practical skills in a lab environment.',
    ],
    lessons: [
      {
        order: 0,
        title: 'Lesson 0 — Introduction',
        slug: 'introduction',
        description: 'Overview of the module and objectives.',
        lessonType: 'TEXT',
        estimatedMinutes: 30,
        isRequired: true,
        isActive: true,
        status: 'DRAFT',
        htmlContent: '<p>Welcome to this module. In this lesson we cover...</p>',
      },
      {
        order: 1,
        title: 'Lesson 1 — Hands-on Lab',
        slug: 'hands-on-lab',
        description: 'Practical lab session.',
        lessonType: 'MIXED',
        estimatedMinutes: 60,
        isRequired: true,
        isActive: true,
        status: 'DRAFT',
        htmlContent: '<p>In this lab you will...</p>',
      },
    ],
  },
  null,
  2
);
