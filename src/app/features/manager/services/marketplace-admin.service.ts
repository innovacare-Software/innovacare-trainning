import { Injectable, inject } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';

export type PublishCoursePayload = {
  courseId: string;
  price: number;
  currency: string;
  stripePriceId: string;
  stripeProductId?: string;
  isPublic: boolean;
};

export type PublishCourseResult = {
  ok: boolean;
  offerId?: string;
  alreadyExists?: boolean;
};

@Injectable({ providedIn: 'root' })
export class MarketplaceAdminService {
  private functions = inject(Functions);

  private publishFn = httpsCallable<PublishCoursePayload, PublishCourseResult>(
    this.functions,
    'publishCourseToMarketplace'
  );

  publishCourse(payload: PublishCoursePayload) {
    return this.publishFn(payload);
  }
}
