import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map, switchMap } from 'rxjs';
import { SESSION_TYPE_LABELS, ProgramLiveSession } from '../../program.models';
import { LearnerLiveSessionsService } from '../services/learner-live-sessions.service';

@Component({
  selector: 'app-live-sessions-page',
  standalone: true,
  imports: [CommonModule, DatePipe],
  template: `
    <div class="ls-page">
      <h1 class="ls-title">Live Sessions</h1>
      <p class="ls-subtitle">Scheduled live lectures, workshops, and Q&A sessions with instructors.</p>

      @if (sessions().length > 0) {
        <div class="ls-grid">
          @for (s of sessions(); track s.id) {
            <div class="ls-card" [class.ls-past]="isPast(s)">
              <div class="ls-card-header">
                <span class="ls-session-type">{{ sessionTypeLabel(s.sessionType) }}</span>
                @if (s.required) { <span class="ls-required">Required</span> }
              </div>
              <h3 class="ls-session-title">{{ s.title }}</h3>
              @if (s.description) { <p class="ls-session-desc">{{ s.description }}</p> }
              <div class="ls-session-meta">
                <span>📅 {{ toDate(s.startAt) | date:'MMM d, y · h:mm a' }}</span>
                @if (s.instructorName) { <span>👤 {{ s.instructorName }}</span> }
                @if (s.capacity) { <span>👥 {{ s.capacity }} seats</span> }
              </div>
              @if (!isPast(s) && s.meetingUrl) {
                <a [href]="s.meetingUrl" target="_blank" rel="noopener" class="ls-join-btn">
                  🎥 Join Session
                </a>
              }
              @if (isPast(s)) {
                <span class="ls-past-label">Session Ended</span>
              }
            </div>
          }
        </div>
      } @else {
        <div class="ls-empty"><span>🎥</span><p>No live sessions scheduled yet.</p></div>
      }
    </div>
  `,
  styles: [`
    .ls-page { max-width: 900px; }
    .ls-title { font-size: 1.4rem; font-weight: 800; color: #111827; margin: 0 0 .3rem; }
    .ls-subtitle { font-size: .82rem; color: #6b7280; margin: 0 0 1.5rem; }

    .ls-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
    .ls-card {
      background: #ffffff; border: 1px solid #e5e7eb;
      border-radius: 14px; padding: 1.2rem; display: flex; flex-direction: column; gap: .4rem;
      transition: border-color .2s; box-shadow: 0 1px 3px rgba(0,0,0,.04);
    }
    .ls-card:hover { border-color: #6366f1; }
    .ls-past { opacity: .6; }

    .ls-card-header { display: flex; align-items: center; gap: .5rem; }
    .ls-session-type {
      font-size: .62rem; font-weight: 700; text-transform: uppercase;
      padding: .15rem .5rem; border-radius: 6px; background: #eef2ff; color: #4f46e5;
    }
    .ls-required {
      font-size: .6rem; font-weight: 700; text-transform: uppercase;
      padding: .15rem .4rem; border-radius: 6px; background: #fee2e2; color: #dc2626;
    }
    .ls-session-title { font-size: .95rem; font-weight: 700; color: #111827; margin: .2rem 0; }
    .ls-session-desc { font-size: .75rem; color: #6b7280; line-height: 1.4; }
    .ls-session-meta { display: flex; flex-direction: column; gap: .2rem; font-size: .72rem; color: #9ca3af; }

    .ls-join-btn {
      display: inline-block; margin-top: .5rem; padding: .45rem 1rem;
      background: #6366f1; color: #fff; font-size: .78rem; font-weight: 700;
      border-radius: 8px; text-decoration: none; text-align: center; transition: background .2s;
    }
    .ls-join-btn:hover { background: #4f46e5; }

    .ls-past-label { font-size: .72rem; color: #9ca3af; font-style: italic; margin-top: .4rem; }

    .ls-empty { text-align: center; padding: 3rem 0; color: #9ca3af; font-size: .85rem; }
    .ls-empty span { font-size: 2rem; display: block; margin-bottom: .5rem; }
  `],
})
export class LiveSessionsPage {
  private readonly route = inject(ActivatedRoute);
  private readonly sessionsService = inject(LearnerLiveSessionsService);

  private readonly programId$ = this.route.parent!.paramMap.pipe(map((p) => p.get('programId') || ''));

  readonly sessions = toSignal(
    this.programId$.pipe(switchMap((id) => this.sessionsService.getSessions(id))),
    { initialValue: [] }
  );

  sessionTypeLabel(type: string): string {
    return (SESSION_TYPE_LABELS as Record<string, string>)[type] || type;
  }

  toDate(val: unknown): Date {
    if (!val) return new Date();
    if (typeof val === 'object' && val !== null && 'toDate' in val) {
      return (val as { toDate(): Date }).toDate();
    }
    if (val instanceof Date) return val;
    return new Date();
  }

  isPast(s: ProgramLiveSession): boolean {
    return this.toDate(s.endAt).getTime() < Date.now();
  }
}
