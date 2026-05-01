import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import {
  NURSING_COURSES_DATA,
  CourseCategory,
} from './nursing-school.model';
import { NursingSchoolService } from './nursing-school.service';
import { LanguageService } from '../../../core/language.service';
import { LocalizedFieldPipe } from '../../../shared/pipes/localized-field.pipe';

interface CategoryTab {
  key: CourseCategory;
  labelKey: string;
  badgeKey: string;
  color: string;
}

@Component({
  selector: 'app-nursing-school-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DecimalPipe, RouterModule, TranslocoModule, LocalizedFieldPipe],
  templateUrl: './nursing-school.page.html',
  styleUrls: ['./nursing-school.page.css'],
})
export class NursingSchoolPage implements OnDestroy {
  readonly lang = inject(LanguageService);

  readonly categories: CategoryTab[] = [
    { key: 'prerequisites', labelKey: 'NURSING_SCHOOL.catalogue.categories.prerequisites', badgeKey: 'NURSING_SCHOOL.catalogue.badges.prerequisites', color: '#6366F1' },
    { key: 'introductory', labelKey: 'NURSING_SCHOOL.catalogue.categories.introductory', badgeKey: 'NURSING_SCHOOL.catalogue.badges.introductory', color: '#0A9DB8' },
    { key: 'core', labelKey: 'NURSING_SCHOOL.catalogue.categories.core', badgeKey: 'NURSING_SCHOOL.catalogue.badges.core', color: '#10B981' },
    { key: 'transition', labelKey: 'NURSING_SCHOOL.catalogue.categories.transition', badgeKey: 'NURSING_SCHOOL.catalogue.badges.transition', color: '#F59E0B' },
  ];

  readonly whyCards = [
    { icon: '🧩', titleKey: 'NURSING_SCHOOL.why.card_1_title', descKey: 'NURSING_SCHOOL.why.card_1_desc' },
    { icon: '⚡', titleKey: 'NURSING_SCHOOL.why.card_2_title', descKey: 'NURSING_SCHOOL.why.card_2_desc' },
    { icon: '🎯', titleKey: 'NURSING_SCHOOL.why.card_3_title', descKey: 'NURSING_SCHOOL.why.card_3_desc' },
    { icon: '🗺️', titleKey: 'NURSING_SCHOOL.why.card_4_title', descKey: 'NURSING_SCHOOL.why.card_4_desc' },
    { icon: '👁️', titleKey: 'NURSING_SCHOOL.why.card_5_title', descKey: 'NURSING_SCHOOL.why.card_5_desc' },
    { icon: '📊', titleKey: 'NURSING_SCHOOL.why.card_6_title', descKey: 'NURSING_SCHOOL.why.card_6_desc' },
  ];

  readonly activeCategory = signal<CourseCategory>('prerequisites');
  readonly selectedIds = signal<Set<string>>(new Set());

  readonly activeCourses = computed(() =>
    NURSING_COURSES_DATA[this.activeCategory()].map((c, i) => ({
      ...c,
      id: `${c.category}-${i}`,
    }))
  );

  readonly bundle = computed(() => {
    const ids = Array.from(this.selectedIds());
    return this.bundleSvc.buildBundle(ids);
  });

  readonly totalVideos = 1190;
  readonly totalQuestions = 5287;
  readonly totalCourses = 21;

  constructor(private readonly bundleSvc: NursingSchoolService) {}

  ngOnDestroy(): void {}

  setCategory(key: CourseCategory): void {
    this.activeCategory.set(key);
  }

  toggleCourse(id: string): void {
    const s = new Set(this.selectedIds());
    s.has(id) ? s.delete(id) : s.add(id);
    this.selectedIds.set(s);
  }

  isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  clearBundle(): void {
    this.selectedIds.set(new Set());
  }

  getCategoryColor(key: CourseCategory): string {
    return this.categories.find((c) => c.key === key)?.color ?? '#0A9DB8';
  }

  bundleSelectedLabel(count: number): string {
    const label = this.lang.instant('NURSING_SCHOOL.bundle.selected');
    return `${count} ${label}`;
  }
}
