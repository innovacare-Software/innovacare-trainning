import { Timestamp } from '@angular/fire/firestore';

export interface Institution {
  id: string;
  name: string;
  adminEmail: string;
  plan: 'starter' | 'professional' | 'enterprise';
  seatCount: number;
  seatsUsed: number;
  expiresAt: Timestamp;
  students: string[];
  createdAt: Timestamp;
}

export interface DemoRequest {
  id: string;
  institutionName: string;
  contactName: string;
  email: string;
  phone?: string;
  studentCount: string;
  programType: string;
  message?: string;
  status: 'pending' | 'email_sent' | 'contacted' | 'closed';
  createdAt?: Timestamp;
}
