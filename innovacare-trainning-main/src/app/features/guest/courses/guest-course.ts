import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map, of, switchMap } from 'rxjs';
import { GuestEnrollment } from '../../../data/guest-commerce.model';
import { GuestEnrollmentsService } from '../../../core/guest-enrollments.service';

interface CourseLite {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  durationMin?: number;
  lang?: 'EN' | 'FR' | 'ES';
  active?: boolean;
}

interface GuestCourseRow {
  enrollment: GuestEnrollment;
  course: CourseLite | null;
}

@Component({
  selector: 'app-guest-courses',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './guest-courses.component.html',
  styleUrls: ['./guest-courses.component.css'],
})
export class GuestCoursesComponent {
  private guestEnrollments = inject(GuestEnrollmentsService);
  private afs = inject(Firestore);
  private router = inject(Router);

  rows = toSignal(
    this.guestEnrollments.listMyEnrollments$().pipe(
      switchMap((enrollments) => {
        if (!enrollments.length) return of([] as GuestCourseRow[]);

        const streams = enrollments.map((enrollment) =>
          docData(doc(this.afs, `courses/${enrollment.courseId}`), {
            idField: 'id',
          }).pipe(
            map((course) => ({
              enrollment,
              course: (course ?? null) as CourseLite | null,
            }))
          )
        );

        return combineLatest(streams);
      })
    ),
    { initialValue: [] as GuestCourseRow[] }
  );

  openCourse(row: GuestCourseRow) {
    if (!row.course?.id || !row.enrollment?.id) return;
    this.router.navigate(['/guest/courses', row.enrollment.id, 'player']);
  }
}