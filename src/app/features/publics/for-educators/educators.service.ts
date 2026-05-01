import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { DemoRequest } from './institution.model';

@Injectable({ providedIn: 'root' })
export class EducatorsService {
  private readonly firestore = inject(Firestore);
  private readonly functions = inject(Functions);

  async submitDemoRequest(
    data: Omit<DemoRequest, 'id' | 'status' | 'createdAt'>
  ): Promise<string> {
    const ref = await addDoc(collection(this.firestore, 'demo_requests'), {
      ...data,
      status: 'pending',
      createdAt: serverTimestamp(),
    });

    // Non-blocking: call confirmation email function
    try {
      const sendConfirmation = httpsCallable<{ requestId: string }, { success: boolean }>(
        this.functions,
        'sendDemoRequestConfirmation'
      );
      await sendConfirmation({ requestId: ref.id });
    } catch {
      // Email function failure should not block the user flow
    }

    return ref.id;
  }
}
