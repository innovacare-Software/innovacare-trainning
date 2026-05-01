import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  query,
  where,
  collectionData,
} from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { NursingCourse, BundleCalculation } from './nursing-school.model';

@Injectable({ providedIn: 'root' })
export class NursingSchoolService {
  private readonly firestore = inject(Firestore);

  getCoursesByCategory(category: string): Observable<NursingCourse[]> {
    try {
      const ref = collection(this.firestore, 'nursing_school_courses');
      const q = query(ref, where('category', '==', category), where('isActive', '==', true));
      return (collectionData(q, { idField: 'id' }) as Observable<NursingCourse[]>).pipe(
        catchError(() => of([]))
      );
    } catch {
      return of([]);
    }
  }

  getAllCourses(): Observable<NursingCourse[]> {
    try {
      const ref = collection(this.firestore, 'nursing_school_courses');
      const q = query(ref, where('isActive', '==', true));
      return (collectionData(q, { idField: 'id' }) as Observable<NursingCourse[]>).pipe(
        catchError(() => of([]))
      );
    } catch {
      return of([]);
    }
  }

  buildBundle(courseIds: string[]): BundleCalculation {
    const basePrice = 15;
    const count = courseIds.length;
    const subtotal = count * basePrice;
    let discountRate = 0;
    if (count >= 5) discountRate = 0.20;
    else if (count >= 3) discountRate = 0.10;
    const discount = subtotal * discountRate;
    return { courseCount: count, subtotal, discountRate, discount, total: subtotal - discount };
  }
}
