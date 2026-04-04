import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable, firstValueFrom, of, switchMap } from 'rxjs';
import { map } from 'rxjs/operators';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { GuestEnrollmentsService } from '../../../core/guest-enrollments.service';
import { GuestEnrollment } from '../../../data/guest-commerce.model';


type Lang = 'EN' | 'FR' | 'ES';

type BlockType =
  | 'heading'
  | 'text'
  | 'image'
  | 'audio'
  | 'video'
  | 'callout'
  | 'quiz'
  | 'narrated_slides';

interface SlideItem {
  id: string;
  title?: string;
  body?: string;
  imageUrl: string;
  caption?: string;
  transcript?: string;
  audioUrl?: string;
  autoAdvance?: boolean;
}

interface Block {
  type: BlockType;
  level?: 1 | 2 | 3;
  text?: string;
  html?: string;
  style?: 'info' | 'warn' | 'success';
  url?: string;
  alt?: string;
  caption?: string;
  transcript?: string;
  mode?: 'single' | 'multi' | 'caseStudy';
  question?: string;
  choices?: Array<{ id: string; text: string; correct: boolean }>;

  title?: string;
  description?: string;
  audioUrl?: string;
  autoplay?: boolean;
  allowManualNavigation?: boolean;
  showTranscript?: boolean;
  completionMode?: 'last_slide' | 'all_slides_viewed' | 'all_audio_finished';
  slides?: SlideItem[];
}

interface Lesson {
  id: string;
  title: string;
  estMin?: number;
  blocks: Block[];
}

interface Section {
  id: string;
  title: string;
  lessons: Lesson[];
}

interface CourseDoc {
  id?: string;
  title: string;
  subtitle?: string;
  description?: string;
  lang: Lang;
  durationMin: number;
  active: boolean;
  kind: 'Course' | 'Text' | 'Module';
  imageUrl?: string;
  sections?: Section[];
}

interface FlatLesson {
  id: string;
  title: string;
  estMin?: number;
  sectionId: string;
  sectionTitle: string;
  index: number;
  blocks: Block[];
}

@Component({
  selector: 'app-guest-course-player',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './guest-player.html',
  styleUrls: ['./guest-player.css'],
})
export class GuestCoursePlayerComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(Auth);
  private afs = inject(Firestore);
  private sanitizer = inject(DomSanitizer);
  private guestEnrollments = inject(GuestEnrollmentsService);

  readonly enrollmentId = this.route.snapshot.paramMap.get('enrollmentId') ?? '';

  notice = '';
  busyId: string | null = null;

  // local UI state
  activeIndex = signal(0);

  // quiz state
  private quizSel = new Map<string, Set<string>>();
  private quizRes = new Map<string, 'passed' | 'failed'>();
  private quizLock = new Set<string>();

  // narrated slides state
  private slideIndexes = new Map<string, number>();
  private slideAudioDone = new Map<string, Set<number>>();

  ngOnInit(): void {}

  ngOnDestroy(): void {}

  enrollment = toSignal(
    this.guestEnrollments.myEnrollmentById$(this.enrollmentId),
    { initialValue: null as GuestEnrollment | null }
  );

  course = toSignal(
    this.guestEnrollments.myEnrollmentById$(this.enrollmentId).pipe(
      switchMap((enrollment) => {
        const courseId = enrollment?.courseId ?? '';
        if (!courseId) return of(null);
        return docData(doc(this.afs, `courses/${courseId}`), {
          idField: 'id',
        }) as Observable<CourseDoc | null>;
      })
    ),
    { initialValue: null as CourseDoc | null }
  );

  lessons = computed<FlatLesson[]>(() => {
    const c = this.course();
    const secs = Array.isArray(c?.sections) ? c!.sections! : [];
    const out: FlatLesson[] = [];

    secs.forEach((s) => {
      const ls = Array.isArray(s.lessons) ? s.lessons : [];
      ls.forEach((l) => {
        out.push({
          id: String(l.id),
          title: l.title || 'Lesson',
          estMin: l.estMin,
          sectionId: s.id,
          sectionTitle: s.title,
          index: out.length,
          blocks: Array.isArray(l.blocks) ? l.blocks : [],
        });
      });
    });

    // restore active lesson from enrollment currentLessonId
    const currentLessonId = this.enrollment()?.currentLessonId ?? null;
    if (currentLessonId) {
      const idx = out.findIndex((x) => x.id === currentLessonId);
      if (idx >= 0 && idx !== this.activeIndex()) {
        this.activeIndex.set(idx);
      }
    }

    const current = this.activeIndex();
    if (current >= out.length && out.length > 0) {
      this.activeIndex.set(out.length - 1);
    }

    return out;
  });

  current = computed<FlatLesson | null>(() => {
    const ls = this.lessons();
    const idx = this.activeIndex();
    return idx >= 0 && idx < ls.length ? ls[idx] : null;
  });

  completedSet = computed(() => new Set<string>(this.enrollment()?.completedLessonIds ?? []));

  // -------------------------
  // Quiz helpers
  // -------------------------

  private qKey(lessonId: string, bi: number): string {
    return `${lessonId}::${bi}`;
  }

  isQuizLocked(lessonId: string, bi: number): boolean {
    return this.quizLock.has(this.qKey(lessonId, bi));
  }

  quizStatus(lessonId: string, bi: number): 'passed' | 'failed' | '' {
    return this.quizRes.get(this.qKey(lessonId, bi)) ?? '';
  }

  isSelected(lessonId: string, bi: number, choiceId: string): boolean {
    return this.quizSel.get(this.qKey(lessonId, bi))?.has(choiceId) ?? false;
  }

  selectSingle(lessonId: string, bi: number, choiceId: string): void {
    const k = this.qKey(lessonId, bi);
    this.quizSel.set(k, new Set([choiceId]));
    this.quizRes.delete(k);
  }

  toggleMulti(lessonId: string, bi: number, choiceId: string): void {
    const k = this.qKey(lessonId, bi);
    const set = new Set(this.quizSel.get(k) ?? []);
    if (set.has(choiceId)) set.delete(choiceId);
    else set.add(choiceId);
    this.quizSel.set(k, set);
    this.quizRes.delete(k);
  }

  submitQuiz(lessonId: string, bi: number, block: Block): void {
    const k = this.qKey(lessonId, bi);
    const picked = this.quizSel.get(k) ?? new Set<string>();
    const correctIds = new Set((block.choices ?? []).filter((c) => c.correct).map((c) => c.id));
    const mode = block.mode ?? 'single';
    const isMulti = mode === 'multi' || mode === 'caseStudy';

    let ok = false;
    if (!isMulti) {
      ok = picked.size === 1 && correctIds.has([...picked][0]);
    } else {
      ok = picked.size === correctIds.size && [...picked].every((id) => correctIds.has(id));
    }

    this.quizRes.set(k, ok ? 'passed' : 'failed');
    if (ok) this.quizLock.add(k);
  }

  // -------------------------
  // HTML block renderer
  // -------------------------

  blockHtml(b: Block): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.renderBlockToHtmlString(b));
  }

  private renderBlockToHtmlString(b: Block): string {
    switch (b.type) {
      case 'heading': {
        const lv = Math.min(3, Math.max(1, Number(b.level ?? 2))) as 1 | 2 | 3;
        const tag = `h${lv}`;
        return `<${tag}>${escapeHtml(b.text || '')}</${tag}>`;
      }

      case 'text':
        return b.html ? String(b.html) : b.text ? `<p>${escapeHtml(b.text)}</p>` : '';

      case 'image': {
        const url = escapeAttr(b.url || '');
        const alt = escapeAttr(b.alt || '');
        const cap = b.caption ? `<figcaption>${escapeHtml(b.caption)}</figcaption>` : '';
        return url ? `<figure><img src="${url}" alt="${alt}" />${cap}</figure>` : '';
      }

      case 'audio': {
        const url = escapeAttr(b.url || '');
        const tr = b.transcript
          ? `<details><summary>Transcript</summary><pre>${escapeHtml(b.transcript)}</pre></details>`
          : '';
        return url ? `<div class="audio"><audio controls src="${url}"></audio>${tr}</div>` : tr;
      }

      case 'callout': {
        const cls = `callout ${escapeAttr(b.style || 'info')}`;
        const content = b.html ? String(b.html) : b.text ? `<p>${escapeHtml(b.text)}</p>` : '';
        return `<div class="${cls}">${content}</div>`;
      }

      default:
        return '';
    }
  }

  // -------------------------
  // Lesson navigation / progress
  // -------------------------

  async setActive(i: number): Promise<void> {
    const ls = this.lessons();
    if (i < 0 || i >= ls.length) return;

    this.activeIndex.set(i);
    this.notice = '';

    const user = await firstValueFrom(authState(this.auth));
    const enrollment = this.enrollment();
    const lesson = ls[i];

    if (user?.uid && enrollment?.id && lesson?.id) {
      await this.guestEnrollments.setCurrentLesson({
        uid: user.uid,
        enrollmentId: enrollment.id,
        lessonId: lesson.id,
      });
    }
  }

  async completeLesson(lessonId: string): Promise<void> {
    this.notice = '';

    const user = await firstValueFrom(authState(this.auth));
    const enrollment = this.enrollment();

    if (!user?.uid || !enrollment?.id) {
      this.notice = 'Please sign in first.';
      return;
    }

    this.busyId = lessonId;
    try {
      await this.guestEnrollments.markLessonComplete({
        uid: user.uid,
        enrollmentId: enrollment.id,
        lessonId,
        totalLessons: this.lessons().length,
      });

      const idx = this.lessons().findIndex((l) => l.id === lessonId);
      this.next(idx);
    } catch (e: any) {
      this.notice = e?.message || 'Failed to complete lesson.';
    } finally {
      this.busyId = null;
    }
  }

  next(currentIndex: number): void {
    const total = this.lessons().length;
    if (total === 0) {
      this.notice = 'No lessons available.';
      return;
    }

    if (currentIndex < total - 1) {
      void this.setActive(currentIndex + 1);
      this.notice = `Moved to lesson ${currentIndex + 2} / ${total}.`;
      return;
    }

    this.notice = 'You reached the last lesson.';
  }

  backToCourses(): void {
    this.router.navigate(['/guest/courses']);
  }

  // -------------------------
  // Narrated slides helpers
  // -------------------------

  private slideKey(lessonId: string, bi: number): string {
    return `${lessonId}::slides::${bi}`;
  }

  slideIndex(lessonId: string, bi: number, block: Block): number {
    const total = block.slides?.length ?? 0;
    if (!total) return 0;

    const raw = this.slideIndexes.get(this.slideKey(lessonId, bi)) ?? 0;
    return Math.max(0, Math.min(raw, total - 1));
  }

  currentSlide(lessonId: string, bi: number, block: Block): SlideItem | null {
    const slides = block.slides ?? [];
    if (!slides.length) return null;
    return slides[this.slideIndex(lessonId, bi, block)] ?? null;
  }

  setSlide(lessonId: string, bi: number, block: Block, index: number): void {
    const total = block.slides?.length ?? 0;
    if (!total) return;

    const next = Math.max(0, Math.min(index, total - 1));
    this.slideIndexes.set(this.slideKey(lessonId, bi), next);
  }

  prevSlide(lessonId: string, bi: number, block: Block): void {
    this.setSlide(lessonId, bi, block, this.slideIndex(lessonId, bi, block) - 1);
  }

  nextSlide(lessonId: string, bi: number, block: Block): void {
    this.setSlide(lessonId, bi, block, this.slideIndex(lessonId, bi, block) + 1);
  }

  slideAudioUrl(lessonId: string, bi: number, block: Block): string {
    const slide = this.currentSlide(lessonId, bi, block);
    return (slide?.audioUrl || block.audioUrl || '').trim();
  }

  slideProgressPct(lessonId: string, bi: number, block: Block): number {
    const total = block.slides?.length ?? 0;
    if (!total) return 0;

    const done = this.slideAudioDone.get(this.slideKey(lessonId, bi))?.size ?? 0;
    const mode = block.completionMode ?? 'all_audio_finished';

    if (mode === 'all_audio_finished') {
      return Math.round((done / total) * 100);
    }

    return Math.round(((this.slideIndex(lessonId, bi, block) + 1) / total) * 100);
  }

  onNarratedAudioEnded(lessonId: string, bi: number, block: Block): void {
    const key = this.slideKey(lessonId, bi);
    const idx = this.slideIndex(lessonId, bi, block);
    const set = new Set(this.slideAudioDone.get(key) ?? []);
    set.add(idx);
    this.slideAudioDone.set(key, set);

    const slide = this.currentSlide(lessonId, bi, block);
    if (slide?.autoAdvance && idx < ((block.slides?.length ?? 1) - 1)) {
      this.nextSlide(lessonId, bi, block);
    }
  }

  // -------------------------
  // trackBy
  // -------------------------

  trackByBlock = (index: number, block: Block): string =>
    `${block.type}-${index}-${block.url ?? block.text ?? block.question ?? ''}`;
}

function escapeHtml(s: string): string {
  return (s ?? '').replace(
    /[&<>"']/g,
    (ch) =>
      (
        {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        } as Record<string, string>
      )[ch] || ch
  );
}

function escapeAttr(s: string): string {
  return (s ?? '').replace(/"/g, '&quot;');
}