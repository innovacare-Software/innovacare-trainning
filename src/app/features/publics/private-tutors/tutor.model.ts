import { Timestamp } from '@angular/fire/firestore';
import { MultiLangString } from '../nursing-school/nursing-school.model';

export interface Tutor {
  id: string;
  name: string;
  credentials: string;
  bio: MultiLangString;
  specialties: string[];
  profileImageUrl: string;
  rating: number;
  reviewCount: number;
  hourlyRate: number;
  availableDates: string[];
  isVerified: boolean;
  isActive: boolean;
  ownerUid?: string;
  ownerEmail?: string;
}

export interface TutorBooking {
  id: string;
  tutorId: string;
  tutorName?: string;
  tutorOwnerUid?: string;
  tutorOwnerEmail?: string;
  studentId: string;
  studentName?: string;
  studentEmail?: string;
  sessionDate: string;
  sessionTime: string;
  slotKey?: string;
  subject: string;
  sessionType: 'individual' | 'group';
  durationMinutes: number;
  totalPrice: number;
  discount: number;
  status: 'payment_pending' | 'confirmed' | 'completed' | 'cancelled' | 'payment_failed';
  notes?: string;
  meetingUrl?: string;
  orderId?: string;
  checkoutSessionId?: string;
  paymentIntentId?: string;
  lockedUntil?: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  confirmedAt?: Timestamp;
  cancelledAt?: Timestamp;
}

export const MOCK_TUTORS: Tutor[] = [
  {
    id: 'tutor-1',
    name: 'Jennifer Hayes',
    credentials: 'RN, BSN, CCRN',
    bio: {
      en: 'ICU nurse with 12+ years of bedside experience. Specializes in critical care, ABGs, and pharmacology prep.',
      fr: 'Infirmière en soins intensifs avec plus de 12 ans d’expérience au chevet. Spécialisée en soins critiques, gaz du sang et préparation en pharmacologie.',
    },
    specialties: ['Adult Health II (Critical Care)', 'ABGs', 'Pharmacology', 'ECG Interpretation'],
    profileImageUrl: 'https://ui-avatars.com/api/?name=Jennifer+Hayes&background=0A9DB8&color=fff&size=128',
    rating: 4.9,
    reviewCount: 147,
    hourlyRate: 65,
    availableDates: [],
    isVerified: true,
    isActive: true,
  },
  {
    id: 'tutor-2',
    name: 'Marcus Williams',
    credentials: 'RN, MSN, CMSRN',
    bio: {
      en: 'Former nursing professor and med-surg specialist. Known for breaking down complex concepts into simple mnemonics.',
      fr: 'Ancien professeur en sciences infirmières et spécialiste médico-chirurgical. Réputé pour transformer les notions complexes en repères simples.',
    },
    specialties: ['Adult Health I (Med-Surg)', 'Fundamentals', 'Health Assessment', 'Geriatrics'],
    profileImageUrl: 'https://ui-avatars.com/api/?name=Marcus+Williams&background=6366F1&color=fff&size=128',
    rating: 5.0,
    reviewCount: 89,
    hourlyRate: 75,
    availableDates: [],
    isVerified: true,
    isActive: true,
  },
  {
    id: 'tutor-3',
    name: 'Sofia Reyes',
    credentials: 'RN, BSN, RNC-OB',
    bio: {
      en: 'Labor and delivery nurse with a passion for teaching maternity nursing. Helps students visualize clinical scenarios.',
      fr: 'Infirmière en travail et accouchement, passionnée par l’enseignement de la maternité. Aide les étudiants à visualiser les scénarios cliniques.',
    },
    specialties: ['Maternal & Reproductive', 'Pediatrics', 'Fundamentals', 'Community & Public Health'],
    profileImageUrl: 'https://ui-avatars.com/api/?name=Sofia+Reyes&background=10B981&color=fff&size=128',
    rating: 4.8,
    reviewCount: 203,
    hourlyRate: 60,
    availableDates: [],
    isVerified: true,
    isActive: true,
  },
  {
    id: 'tutor-4',
    name: 'David Chen',
    credentials: 'RN, PMHN-BC',
    bio: {
      en: 'Psychiatric nurse with expertise in behavioral health, clinical leadership, and NCLEX exam strategy.',
      fr: 'Infirmier en psychiatrie avec une expertise en santé comportementale, leadership clinique et stratégie d’examen NCLEX.',
    },
    specialties: ['Behavioral Health', 'Leadership & Management', 'Pharmacology', 'Mental Health'],
    profileImageUrl: 'https://ui-avatars.com/api/?name=David+Chen&background=F59E0B&color=fff&size=128',
    rating: 4.9,
    reviewCount: 112,
    hourlyRate: 70,
    availableDates: [],
    isVerified: true,
    isActive: true,
  },
];
