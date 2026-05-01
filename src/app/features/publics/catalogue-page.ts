import { Injectable, inject } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  doc,
  docData,
  limit,
  query,
  where,
} from '@angular/fire/firestore';
import { addDoc, getDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { catchError, combineLatest, from, map, Observable, of, switchMap, throwError } from 'rxjs';
import { Course } from '../../data/models';


export interface PathwayRequest {
  courseId: string;
  courseTitle: string;
  source?: string;
}

@Injectable({
  providedIn: 'root',
})
export class CourseCatalogService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(Auth);

  private loadActiveCourses(): Observable<Course[]> {
    const coursesRef = collection(this.firestore, 'courses');
    return from(getDocs(coursesRef)).pipe(
      map((coursesSnap) =>
        coursesSnap.docs
          .map((d) => ({ id: d.id, ...(d.data() as object) }) as Course)
          .filter((course) => course.active === true)
      )
    );
  }

  private loadCoursesForOffers(offers: Array<{ id: string; courseId?: string; title?: string; description?: string; imageUrl?: string }>): Observable<Course[]> {
    const courseIdToOffer = new Map<string, { id: string; title?: string; description?: string; imageUrl?: string }>();
    for (const offer of offers) {
      const courseId = String(offer.courseId || '').trim();
      if (!courseId) continue;
      if (!courseIdToOffer.has(courseId)) {
        courseIdToOffer.set(courseId, {
          id: offer.id,
          title: offer.title,
          description: offer.description,
          imageUrl: offer.imageUrl,
        });
      }
    }

    const courseIds = Array.from(courseIdToOffer.keys());
    if (!courseIds.length) return of([] as Course[]);

    const coursesRef = collection(this.firestore, 'courses');
    return from(getDocs(coursesRef)).pipe(
      map((coursesSnap) => {
        const rows = coursesSnap.docs
          .map((d) => ({ id: d.id, ...(d.data() as object) }) as Course)
          .filter((c) => !!c.id && courseIdToOffer.has(String(c.id)));

        const merged = rows.map((course) => {
          const offer = courseIdToOffer.get(String(course.id));
          return {
            ...course,
            title: course.title || offer?.title || '',
            description: course.description || offer?.description || '',
            imageUrl: course.imageUrl || offer?.imageUrl || '',
          } as Course;
        });

        return merged;
      })
    );
  }

  private loadVisibleCourses(
    offers: Array<{ id: string; courseId?: string; title?: string; description?: string; imageUrl?: string }>
  ): Observable<Course[]> {
    return combineLatest([this.loadCoursesForOffers(offers), this.loadActiveCourses()]).pipe(
      map(([offeredCourses, activeCourses]) => {
        const merged = new Map<string, Course>();

        for (const course of activeCourses) {
          if (!course.id) {
            continue;
          }
          merged.set(String(course.id), course);
        }

        for (const course of offeredCourses) {
          if (!course.id) {
            continue;
          }
          merged.set(String(course.id), course);
        }

        return Array.from(merged.values());
      })
    );
  }

  getPublicActiveCourses(): Observable<Course[]> {
    const offersRef = collection(this.firestore, 'publicOffers');
    const globalOffersQ = query(
      offersRef,
      where('type', '==', 'course'),
      where('isActive', '==', true),
      where('isPublic', '==', true)
    );

    return authState(this.auth).pipe(
      switchMap((user) => {
        const global$ = from(getDocs(globalOffersQ));

        if (!user?.uid) {
          return global$.pipe(
            map((snap) => snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) } as any))),
            switchMap((offers) => this.loadVisibleCourses(offers))
          );
        }

        const userRef = doc(this.firestore, `users/${user.uid}`);
        return from(getDoc(userRef)).pipe(
          switchMap((userSnap) => {
            const orgId = String(userSnap.get('orgId') || '').trim();
            if (!orgId) {
              return global$.pipe(
                map((snap) => snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) } as any))),
                switchMap((offers) => this.loadVisibleCourses(offers))
              );
            }

            const orgOffersQ = query(
              offersRef,
              where('type', '==', 'course'),
              where('isActive', '==', true),
              where('orgId', '==', orgId)
            );

            return combineLatest([global$, from(getDocs(orgOffersQ))]).pipe(
              map(([globalSnap, orgSnap]) => {
                const merged = new Map<string, any>();
                for (const docSnap of globalSnap.docs) {
                  merged.set(docSnap.id, { id: docSnap.id, ...(docSnap.data() as object) });
                }
                for (const docSnap of orgSnap.docs) {
                  merged.set(docSnap.id, { id: docSnap.id, ...(docSnap.data() as object) });
                }
                return Array.from(merged.values()) as Array<{ id: string; courseId?: string; title?: string; description?: string; imageUrl?: string }>;
              }),
              switchMap((offers) => this.loadVisibleCourses(offers))
            );
          })
        );
      }),
      map((rows) => {
        console.log('Catalogue tenant-aware rows:', rows);
        return rows;
      }),
      catchError((error) => {
        console.error('Erreur Firestore courses:', error);
        return of([] as Course[]);
      })
    );
  }

  getCourseById(courseId: string): Observable<Course | undefined> {
    const ref = doc(this.firestore, `courses/${courseId}`);
    return docData(ref, { idField: 'id' }).pipe(
      map((item) => item as Course)
    );
  }

  async getPublicOfferIdForCourse(courseId: string): Promise<string | null> {
    const clean = String(courseId || '').trim();
    if (!clean) return null;

    const ref = collection(this.firestore, 'publicOffers');
    const q = query(
      ref,
      where('courseId', '==', clean),
      where('isActive', '==', true),
      where('isPublic', '==', true),
      limit(1)
    );

    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs[0].id;
  }

  addToPathway(payload: PathwayRequest): Observable<void> {
    const currentUser = this.auth.currentUser;
    if (!currentUser?.uid) {
      return throwError(() => new Error('AUTH_REQUIRED_FOR_PATHWAY'));
    }

    const ref = collection(this.firestore, 'pathwayRequests');

    const promise = addDoc(ref, {
      ...payload,
      source: payload.source ?? 'catalog-page',
      status: 'new',
      requesterUid: currentUser.uid,
      addedAt: serverTimestamp(),
    }).then(() => void 0);

    return new Observable<void>((subscriber) => {
      promise
        .then(() => {
          subscriber.next();
          subscriber.complete();
        })
        .catch((error) => subscriber.error(error));
    });
  }
}