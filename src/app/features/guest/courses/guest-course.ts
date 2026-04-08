import { Component, inject, Signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { KeyValuePipe } from '@angular/common';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, combineLatest, map, of, switchMap } from 'rxjs';
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
 templateUrl: './guest-course.html',
  styleUrls: ['./guest-course.css'],
})
export class GuestCoursesComponent {
  private guestEnrollments = inject(GuestEnrollmentsService);
  private afs = inject(Firestore);
  private router = inject(Router);
  private searchTerm = '';
  private filterValue: '' | 'completed' | 'in-progress' | 'not-started' = '';

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
            })),
            catchError(() =>
              of({
                enrollment,
                course: null as CourseLite | null,
              })
            )
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

  browseCourses() {
    this.router.navigate(['/catalogue']);
  }

  getCompletedCount(row?: GuestCourseRow): number {
    if (row) return row.enrollment?.completedLessonIds?.length ?? 0;

    return this.rows().filter((r) => (r.enrollment.progressPct ?? 0) >= 100).length;
  }

  getInProgressCount(): number {
    return this.rows().filter((r) => {
      const progress = r.enrollment.progressPct ?? 0;
      return progress > 0 && progress < 100;
    }).length;
  }

  getAverageProgress(): number {
    const list = this.rows();
    if (!list.length) return 0;

    const total = list.reduce((sum, r) => sum + (r.enrollment.progressPct ?? 0), 0);
    return Math.round(total / list.length);
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.searchTerm = (input?.value ?? '').trim().toLowerCase();
  }

  onFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement | null;
    const value = (select?.value ?? '') as '' | 'completed' | 'in-progress' | 'not-started';
    this.filterValue = value;
  }

  getProgressStatus(progressPct: number): 'completed' | 'in-progress' | 'not-started' {
    if (progressPct >= 100) return 'completed';
    if (progressPct > 0) return 'in-progress';
    return 'not-started';
  }

  getProgressBadgeText(progressPct: number): string {
    const status = this.getProgressStatus(progressPct);
    if (status === 'completed') return 'Completed';
    if (status === 'in-progress') return 'In Progress';
    return 'Not Started';
  }

  getProgressStatusText(progressPct: number): string {
    return this.getProgressBadgeText(progressPct);
  }

  viewDetails(row: GuestCourseRow): void {
    if (!row.enrollment?.id) return;
    this.router.navigate(['/guest/courses', row.enrollment.id, 'player']);
  }
}