import { CourseGroupId, type ExamCourseGroup, type ExamModule, type ExamProgram, type ExamProgramId } from './exam-prep.models';

type CanonicalProgramSeed = Pick<ExamProgram, 'id' | 'title' | 'slug' | 'description' | 'jurisdictions' | 'examTracks' | 'active'>;
type CanonicalCourseGroupSeed = Pick<ExamCourseGroup, 'id' | 'title' | 'slug' | 'order' | 'programIds' | 'jurisdictions' | 'tags' | 'active'>;
type CanonicalModuleSeed = Pick<ExamModule, 'id' | 'courseGroupId' | 'courseGroupTitle' | 'title' | 'slug' | 'order' | 'programIds' | 'jurisdictions' | 'tags' | 'active'>;

export const CANONICAL_PROGRAMS: CanonicalProgramSeed[] = [
  {
    id: 'nclex-rn-prep',
    title: 'NCLEX-RN Prep',
    slug: 'nclex-rn-prep',
    description: 'Registered nurse licensure preparation with classic and NGN-aligned assessment paths.',
    jurisdictions: ['US', 'Canada'],
    examTracks: ['NCLEX-RN'],
    active: true,
  },
  {
    id: 'nclex-pn-prep',
    title: 'NCLEX-PN Prep',
    slug: 'nclex-pn-prep',
    description: 'Practical nurse licensure preparation across core fundamentals and progressive mock exams.',
    jurisdictions: ['US', 'Canada'],
    examTracks: ['NCLEX-PN'],
    active: true,
  },
  {
    id: 'uae-nursing-licensure-prep',
    title: 'UAE Nursing Licensure Prep',
    slug: 'uae-nursing-licensure-prep',
    description: 'Jurisdiction-aware preparation for DHA and DOH Abu Dhabi nursing licensure pathways.',
    jurisdictions: ['UAE-DHA', 'UAE-DOH'],
    examTracks: ['DHA', 'DOH'],
    active: true,
  },
];

export const CANONICAL_COURSE_GROUPS: CanonicalCourseGroupSeed[] = [
  seedCourseGroup('exam-strategy-ngn', 'Exam Strategy and NGN', 1, ['clinical-judgment', 'prioritization', 'delegation']),
  seedCourseGroup('leadership-communication-ethics', 'Leadership, Communication, Ethics', 2, ['ethics', 'communication', 'delegation']),
  seedCourseGroup('fundamentals-safety-basic-nursing', 'Fundamentals, Safety and Basic Nursing', 3, ['infection-control', 'lab-values', 'safety']),
  seedCourseGroup('pharmacology', 'Pharmacology', 4, ['pharmacology', 'medication-safety']),
  seedCourseGroup('adult-health-med-surg', 'Adult Health / Med-Surg', 5, ['adult-health', 'prioritization', 'critical-care']),
  seedCourseGroup('maternal-newborn-reproductive', 'Maternal-Newborn / Reproductive', 6, ['maternity', 'reproductive-health']),
  seedCourseGroup('pediatrics', 'Pediatrics', 7, ['pediatrics', 'growth-development']),
  seedCourseGroup('mental-health-wellness', 'Mental Health and Wellness', 8, ['mental-health', 'nutrition']),
];

export const CANONICAL_MODULES: CanonicalModuleSeed[] = [
  ...seedModules('exam-strategy-ngn', 'Exam Strategy and NGN', ['all-about-ngn', 'test-strategies', 'prioritization', 'delegation']),
  ...seedModules('leadership-communication-ethics', 'Leadership, Communication, Ethics', ['therapeutic-communication', 'legal-and-ethical-concepts', 'management-of-care', 'medical-terminology']),
  ...seedModules('fundamentals-safety-basic-nursing', 'Fundamentals, Safety and Basic Nursing', ['safety-and-infection', 'basic-care-and-comfort', 'health-promotion', 'physiological-adaptation', 'reduction-of-risk-potential', 'assistive-devices', 'fluid-and-electrolytes', 'lines-drains-tubes', 'lab-values']),
  ...seedModules('pharmacology', 'Pharmacology', ['general-pharmacology']),
  ...seedModules('adult-health-med-surg', 'Adult Health / Med-Surg', ['cardiovascular', 'respiratory', 'gastrointestinal', 'renal', 'endocrine', 'hematologic', 'immunologic', 'neurologic', 'musculoskeletal', 'integumentary', 'oncology', 'shock-and-critical-care', 'ekg-interpretation']),
  ...seedModules('maternal-newborn-reproductive', 'Maternal-Newborn / Reproductive', ['maternity', 'labor-and-delivery', 'fetal-heart-rate', 'reproductive-system']),
  ...seedModules('pediatrics', 'Pediatrics', ['pediatric', 'growth-and-development']),
  ...seedModules('mental-health-wellness', 'Mental Health and Wellness', ['mental-health', 'nutrition-and-diet']),
];

export function canonicalProgramTitle(programId: ExamProgramId): string {
  return CANONICAL_PROGRAMS.find((program) => program.id === programId)?.title ?? programId;
}

export function canonicalCourseGroupTitle(courseGroupId: CourseGroupId): string {
  return CANONICAL_COURSE_GROUPS.find((group) => group.id === courseGroupId)?.title ?? courseGroupId;
}

function seedCourseGroup(id: CourseGroupId, title: string, order: number, tags: string[]): CanonicalCourseGroupSeed {
  return {
    id,
    title,
    slug: id,
    order,
    programIds: ['nclex-rn-prep', 'nclex-pn-prep', 'uae-nursing-licensure-prep'],
    jurisdictions: ['US', 'Canada', 'UAE-DHA', 'UAE-DOH'],
    tags,
    active: true,
  };
}

function seedModules(courseGroupId: CourseGroupId, courseGroupTitle: string, moduleSlugs: string[]): CanonicalModuleSeed[] {
  return moduleSlugs.map((slug, index) => ({
    id: slug,
    courseGroupId,
    courseGroupTitle,
    title: humanize(slug),
    slug,
    order: index + 1,
    programIds: ['nclex-rn-prep', 'nclex-pn-prep', 'uae-nursing-licensure-prep'],
    jurisdictions: ['US', 'Canada', 'UAE-DHA', 'UAE-DOH'],
    tags: slug.split('-'),
    active: true,
  }));
}

function humanize(value: string): string {
  return value
    .split('-')
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ');
}