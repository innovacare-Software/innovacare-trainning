import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  signal,
  inject,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslocoModule } from '@jsverse/transloco';
import { TutorsService } from './tutors.service';
import type { Tutor } from './tutor.model';
import { Subject, takeUntil } from 'rxjs';
import { LocalizedFieldPipe } from '../../../shared/pipes/localized-field.pipe';

@Component({
  selector: 'app-tutors-home-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, FormsModule, TranslocoModule, LocalizedFieldPipe],
  templateUrl: './tutors-home.page.html',
  styleUrls: ['./tutors-home.page.css'],
})
export class TutorsHomePage implements OnInit, OnDestroy {
  private readonly tutorsSvc = inject(TutorsService);
  private readonly destroy$ = new Subject<void>();

  readonly tutors = signal<Tutor[]>([]);
  readonly activeSubject = signal<string>('all');
  readonly loading = signal(true);

  readonly subjects = [
    { key: 'all', labelKey: 'TUTORS.filters.all' },
    { key: 'med-surg', label: 'Med-Surg' },
    { key: 'pharmacology', label: 'Pharmacology' },
    { key: 'pathophysiology', label: 'Pathophysiology' },
    { key: 'maternal-newborn', label: 'Maternal-Newborn' },
    { key: 'mental-health', label: 'Mental Health' },
    { key: 'nclex', label: 'NCLEX Prep' },
  ];

  readonly filteredTutors = computed(() => {
    const subject = this.activeSubject();
    return subject === 'all'
      ? this.tutors()
      : this.tutors().filter(t =>
          t.specialties?.some(s => s.toLowerCase().includes(subject)),
        );
  });

  readonly howItWorks = [
    {
      step: '01',
      icon: '🔍',
      titleKey: 'TUTORS.how_it_works.step_1_title',
      descKey: 'TUTORS.how_it_works.step_1_desc',
    },
    {
      step: '02',
      icon: '📅',
      titleKey: 'TUTORS.how_it_works.step_2_title',
      descKey: 'TUTORS.how_it_works.step_2_desc',
    },
    {
      step: '03',
      icon: '🎓',
      titleKey: 'TUTORS.how_it_works.step_3_title',
      descKey: 'TUTORS.how_it_works.step_3_desc',
    },
  ];

  ngOnInit(): void {
    this.tutorsSvc
      .getAllTutors()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: data => {
          this.tutors.set(data);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setSubject(key: string): void {
    this.activeSubject.set(key);
  }

  stars(rating: number): number[] {
    return Array.from({ length: 5 }, (_, i) => i + 1);
  }
}
