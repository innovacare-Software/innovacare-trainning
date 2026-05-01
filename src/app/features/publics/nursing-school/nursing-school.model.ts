import { Timestamp } from '@angular/fire/firestore';

export type CourseCategory = 'prerequisites' | 'introductory' | 'core' | 'transition';

export interface MultiLangString {
  en: string;
  fr: string;
}

export interface NursingCourse {
  id: string;
  name: MultiLangString;
  description?: MultiLangString;
  category: CourseCategory;
  videos: number;
  questions: number;
  price: number;
  isActive: boolean;
  createdAt?: Timestamp;
}

export interface BundleCalculation {
  courseCount: number;
  subtotal: number;
  discountRate: number;
  discount: number;
  total: number;
}

export const NURSING_COURSES_DATA: Record<CourseCategory, Omit<NursingCourse, 'id' | 'createdAt'>[]> = {
  prerequisites: [
    { name: { en: 'Nursing School 101', fr: 'Introduction aux études infirmières' }, category: 'prerequisites', videos: 34, questions: 0, price: 15, isActive: true },
    { name: { en: 'Anatomy & Physiology', fr: 'Anatomie et physiologie' }, category: 'prerequisites', videos: 77, questions: 340, price: 15, isActive: true },
    { name: { en: 'Growth & Development', fr: 'Croissance et développement' }, category: 'prerequisites', videos: 27, questions: 145, price: 15, isActive: true },
    { name: { en: 'Nutrition', fr: 'Nutrition' }, category: 'prerequisites', videos: 26, questions: 145, price: 15, isActive: true },
  ],
  introductory: [
    { name: { en: 'Fluids & Electrolytes', fr: 'Liquides et électrolytes' }, category: 'introductory', videos: 23, questions: 144, price: 15, isActive: true },
    { name: { en: 'Fundamentals', fr: 'Fondamentaux' }, category: 'introductory', videos: 64, questions: 375, price: 15, isActive: true },
    { name: { en: 'Health Assessment', fr: 'Évaluation de la santé' }, category: 'introductory', videos: 62, questions: 419, price: 15, isActive: true },
    { name: { en: 'Pharmacology', fr: 'Pharmacologie' }, category: 'introductory', videos: 61, questions: 477, price: 15, isActive: true },
  ],
  core: [
    { name: { en: 'Adult Health I – Medical Surgical', fr: 'Santé adulte I – médico-chirurgical' }, category: 'core', videos: 78, questions: 339, price: 15, isActive: true },
    { name: { en: 'Behavioral Health', fr: 'Santé comportementale' }, category: 'core', videos: 41, questions: 257, price: 15, isActive: true },
    { name: { en: 'Maternal & Reproductive', fr: 'Santé maternelle et reproductive' }, category: 'core', videos: 58, questions: 358, price: 15, isActive: true },
    { name: { en: 'Pediatrics', fr: 'Pédiatrie' }, category: 'core', videos: 169, questions: 546, price: 15, isActive: true },
    { name: { en: 'Community & Public Health', fr: 'Santé communautaire et publique' }, category: 'core', videos: 68, questions: 380, price: 15, isActive: true },
    { name: { en: 'Geriatrics', fr: 'Gériatrie' }, category: 'core', videos: 50, questions: 349, price: 15, isActive: true },
    { name: { en: 'Adult Health II – Critical Care', fr: 'Santé adulte II – soins intensifs' }, category: 'core', videos: 130, questions: 424, price: 15, isActive: true },
  ],
  transition: [
    { name: { en: 'Dosage Calculation & Medication Admin', fr: 'Calcul des doses et administration des médicaments' }, category: 'transition', videos: 25, questions: 134, price: 15, isActive: true },
    { name: { en: 'Lab Values', fr: 'Valeurs de laboratoire' }, category: 'transition', videos: 23, questions: 103, price: 15, isActive: true },
    { name: { en: 'ABGs', fr: 'Gaz du sang artériel' }, category: 'transition', videos: 15, questions: 52, price: 15, isActive: true },
    { name: { en: 'ECG Interpretation', fr: 'Interprétation ECG' }, category: 'transition', videos: 32, questions: 92, price: 15, isActive: true },
    { name: { en: 'Clinical Skills', fr: 'Compétences cliniques' }, category: 'transition', videos: 204, questions: 0, price: 15, isActive: true },
    { name: { en: 'Leadership & Management', fr: 'Leadership et gestion' }, category: 'transition', videos: 28, questions: 5, price: 15, isActive: true },
  ],
};
