import { CommonModule } from '@angular/common';
import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  animate,
  query,
  stagger,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { Course } from '../../../data/models';
import { CourseCatalogService } from '../catalogue-page';

type CourseFilter = 'all' | 'nursing' | 'medical';

@Component({
  selector: 'app-public-courses-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './public-courses.page.html',
  styleUrls: ['./public-courses.page.css'],
  animations: [
    trigger('gridAnimation', [
      transition('* => *', [
        query(
          ':enter',
          [
            style({ opacity: 0, transform: 'translateY(18px) scale(0.985)' }),
            stagger(55, [
              animate(
                '340ms cubic-bezier(.2,.8,.2,1)',
                style({ opacity: 1, transform: 'translateY(0) scale(1)' })
              ),
            ]),
          ],
          { optional: true }
        ),
        query(
          ':leave',
          [
            animate(
              '180ms ease',
              style({ opacity: 0, transform: 'translateY(-8px) scale(0.985)' })
            ),
          ],
          { optional: true }
        ),
      ]),
    ]),
    trigger('drawerAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(40px)' }),
        animate(
          '260ms cubic-bezier(.2,.8,.2,1)',
          style({ opacity: 1, transform: 'translateX(0)' })
        ),
      ]),
      transition(':leave', [
        animate(
          '180ms ease',
          style({ opacity: 0, transform: 'translateX(36px)' })
        ),
      ]),
    ]),
    trigger('backdropAnimation', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('180ms ease', style({ opacity: 1 })),
      ]),
      transition(':leave', [
        animate('160ms ease', style({ opacity: 0 })),
      ]),
    ]),
  ],
})
export class PublicCoursesPage {
  private readonly router = inject(Router);
  private readonly courseService = inject(CourseCatalogService);

  readonly visuals = {
    nursing:
      'https://res.cloudinary.com/dtdpx59sc/image/upload/v1778121787/ChatGPT_Image_6_mai_2026_22_40_09_2_ibwoar.png',
    medical:
      'https://res.cloudinary.com/dtdpx59sc/image/upload/v1778121787/ChatGPT_Image_6_mai_2026_22_40_08_1_gv03b6.png',
  };

  readonly activeFilter = signal<CourseFilter>('all');
  readonly selectedCourse = signal<Course | null>(null);
  readonly scrollY = signal(0);

  readonly courses = toSignal(this.courseService.getPublicActiveCourses(), {
    initialValue: [] as Course[],
  });

  readonly nursingCourses = computed(() =>
    this.courses().filter((course) => this.resolveTrack(course) === 'nursing')
  );

  readonly medicalCourses = computed(() =>
    this.courses().filter((course) => this.resolveTrack(course) === 'medical')
  );

  readonly displayedCourses = computed(() => {
    if (this.activeFilter() === 'nursing') return this.nursingCourses();
    if (this.activeFilter() === 'medical') return this.medicalCourses();
    return this.courses();
  });

  readonly heroTitle = computed(() => {
    if (this.activeFilter() === 'nursing') return 'Nursing and NCLEX courses';
    if (this.activeFilter() === 'medical') return 'Medical and clinical review courses';
    return 'NCLEX, nursing, and clinical review catalogue';
  });

  readonly heroDescription = computed(() => {
    if (this.activeFilter() === 'nursing') {
      return 'Browse nursing courses covering coursework support, NCLEX preparation, remediation, and clinical readiness.';
    }
    if (this.activeFilter() === 'medical') {
      return 'Browse medical review courses for certification prep, clinical refreshers, and advanced practice study.';
    }
    return 'Browse public courses for pre-licensure nursing, NCLEX review, medical exam support, and institutional deployment.';
  });

  readonly frontParallax = computed(() => {
    const value = Math.min(this.scrollY(), 700) * 0.045;
    return `translate3d(0, ${value}px, 0)`;
  });

  readonly backParallax = computed(() => {
    const value = Math.min(this.scrollY(), 700) * 0.022;
    return `translate3d(0, ${value}px, 0)`;
  });

  readonly topFloatParallax = computed(() => {
    const value = Math.min(this.scrollY(), 700) * -0.02;
    return `translate3d(0, ${value}px, 0)`;
  });

  readonly bottomFloatParallax = computed(() => {
    const value = Math.min(this.scrollY(), 700) * 0.016;
    return `translate3d(0, ${value}px, 0)`;
  });

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (typeof window === 'undefined') return;
    this.scrollY.set(window.scrollY || 0);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.selectedCourse()) this.closeCourseDrawer();
  }

  setFilter(filter: CourseFilter): void {
    this.activeFilter.set(filter);
  }

  openCourseDrawer(course: Course): void {
    this.selectedCourse.set(course);
  }

  closeCourseDrawer(): void {
    this.selectedCourse.set(null);
  }

  goToCourse(course: Course): void {
    if (!course.id) return;
    this.closeCourseDrawer();
    this.router.navigate(['/catalogue', course.id]);
  }

  resolveTrack(course: Course): 'nursing' | 'medical' {
    const haystack =
      `${course.title} ${course.subtitle || ''} ${(course.tags || []).join(' ')}`.toLowerCase();

    return /(nclex|rn|pn|nursing|fnp|np)/.test(haystack) ? 'nursing' : 'medical';
  }

  getCourseImage(course: Course): string {
    const image = (course.imageUrl || '').trim();
    if (image) return image;
    return this.resolveTrack(course) === 'nursing' ? this.visuals.nursing : this.visuals.medical;
  }

  getCourseSummary(course: Course): string {
    return (
      course.description ||
      course.subtitle ||
      'Premium prep content designed for structured exam readiness and learner confidence.'
    );
  }

  getCourseDuration(course: Course): string {
    return course.durationMin ? `${course.durationMin} min` : 'Self-paced';
  }

  getCourseLevel(course: Course): string {
    return course.level || 'All levels';
  }

  getCourseTags(course: Course): string[] {
    return (course.tags || []).slice(0, 3);
  }
}