import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnDestroy,
  signal,
  computed,
  ElementRef,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ListeningAudioSettings } from '../../models/listening-test.models';

@Component({
  selector: 'app-listening-audio-player',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="audio-player" [class.player--disabled]="isExhausted()">

      <!-- Headphone confirmation -->
      @if (settings.requireHeadphonesConfirmation && !headphonesConfirmed()) {
        <div class="headphone-gate">
          <div class="headphone-icon">🎧</div>
          <p class="headphone-label">Please confirm you are using headphones or a quiet environment.</p>
          <label class="headphone-check">
            <input type="checkbox" (change)="toggleHeadphones($event)" />
            I am ready to listen
          </label>
        </div>
      }

      <!-- Player UI -->
      @if (!settings.requireHeadphonesConfirmation || headphonesConfirmed()) {
        <div class="player-inner">

          <!-- Title & Badge row -->
          <div class="player-meta">
            <span class="player-title">{{ title }}</span>
            @if (settings.allowReplay && settings.maxPlays > 1) {
              <span class="plays-badge" [class.plays-badge--warn]="playsLeft() <= 1">
                {{ playsLeft() }} play{{ playsLeft() === 1 ? '' : 's' }} left
              </span>
            }
            @if (!settings.allowReplay || settings.maxPlays === 1) {
              <span class="plays-badge plays-badge--once">▶ Play once</span>
            }
          </div>

          <!-- Native audio (hidden or shown based on showControls) -->
          <audio
            #audioEl
            [src]="audioUrl"
            preload="metadata"
            (play)="onPlay()"
            (ended)="onEnded()"
            (timeupdate)="onTimeUpdate()"
            [style.display]="settings.showControls ? 'none' : 'none'"
          ></audio>

          <!-- Custom controls -->
          <div class="player-controls">
            <button
              class="ctrl-btn ctrl-btn--play"
              [disabled]="isExhausted() || isPlaying()"
              (click)="play()"
              [title]="isExhausted() ? 'No plays remaining' : 'Play audio'"
            >
              @if (isPlaying()) { ⏸ Playing… } @else { ▶ Play }
            </button>

            @if (settings.allowReplay && settings.maxPlays > 1 && playCount() > 0 && !isPlaying()) {
              <button
                class="ctrl-btn ctrl-btn--replay"
                [disabled]="isExhausted()"
                (click)="replay()"
              >
                ↺ Replay
              </button>
            }

            <!-- Progress bar (if seeking not disabled) -->
            <div class="progress-wrap">
              <div
                class="progress-bar"
                [style.width.%]="progressPct()"
                [class.progress-bar--active]="isPlaying()"
              ></div>
              @if (!settings.disableSeeking && isPlaying()) {
                <input
                  type="range"
                  class="seek-range"
                  min="0"
                  [max]="duration()"
                  [value]="currentTime()"
                  (input)="seek($event)"
                />
              }
            </div>

            <span class="time-label">{{ formatTime(currentTime()) }} / {{ formatTime(duration()) }}</span>
          </div>

          <!-- Exhausted message -->
          @if (isExhausted()) {
            <p class="exhausted-msg">⚠ Maximum number of plays reached. You cannot play the audio again.</p>
          }

          <!-- Completed indicator -->
          @if (audioCompleted() && !isPlaying()) {
            <p class="completed-msg">✓ Audio completed</p>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .audio-player {
      background: linear-gradient(135deg, #0f2540, #1a3a5e);
      border-radius: 1rem;
      padding: 1.25rem 1.4rem;
      color: #e8f4ff;
      display: grid;
      gap: 1rem;
    }
    .audio-player.player--disabled { opacity: 0.7; }

    .headphone-gate { display: flex; flex-direction: column; align-items: center; gap: 0.7rem; padding: 0.5rem 0; }
    .headphone-icon { font-size: 2.5rem; }
    .headphone-label { margin: 0; color: #a8c8e8; text-align: center; font-size: 0.9rem; }
    .headphone-check { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.9rem; color: #d0e8ff; }
    .headphone-check input { width: 1.1rem; height: 1.1rem; accent-color: #38bdf8; cursor: pointer; }

    .player-meta { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
    .player-title { font-weight: 700; font-size: 0.95rem; color: #e8f4ff; }

    .plays-badge {
      padding: 0.2rem 0.6rem; border-radius: 999px;
      background: rgba(56, 189, 248, 0.2); color: #38bdf8;
      font-size: 0.75rem; font-weight: 700; letter-spacing: 0.04em;
    }
    .plays-badge--warn { background: rgba(251, 146, 60, 0.25); color: #fb923c; }
    .plays-badge--once { background: rgba(167, 139, 250, 0.2); color: #a78bfa; }

    .player-controls { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }

    .ctrl-btn {
      border: none; border-radius: 0.6rem; cursor: pointer;
      font-weight: 700; font-size: 0.88rem; padding: 0.5rem 1.2rem;
      transition: opacity 0.2s;
    }
    .ctrl-btn:disabled { opacity: 0.45; cursor: not-allowed; }
    .ctrl-btn--play { background: linear-gradient(135deg, #0284c7, #38bdf8); color: #fff; }
    .ctrl-btn--replay { background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56,189,248,0.3); }

    .progress-wrap { flex: 1; min-width: 120px; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; position: relative; }
    .progress-bar { height: 100%; border-radius: 3px; background: linear-gradient(90deg, #0284c7, #38bdf8); transition: width 0.25s linear; }
    .progress-bar--active { transition: width 0.25s linear; }
    .seek-range { position: absolute; inset: 0; width: 100%; opacity: 0; cursor: pointer; height: 100%; }

    .time-label { font-size: 0.78rem; color: #7eafd4; white-space: nowrap; }

    .exhausted-msg { margin: 0; color: #f87171; font-size: 0.83rem; text-align: center; }
    .completed-msg { margin: 0; color: #4ade80; font-size: 0.83rem; text-align: center; }
  `],
})
export class ListeningAudioPlayerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('audioEl') audioElRef!: ElementRef<HTMLAudioElement>;
  @Input({ required: true }) audioUrl!: string;
  @Input({ required: true }) settings!: ListeningAudioSettings;
  @Input() title = 'Listening Audio';

  @Output() playCountChange = new EventEmitter<number>();
  @Output() audioComplete = new EventEmitter<void>();

  readonly playCount = signal(0);
  readonly isPlaying = signal(false);
  readonly headphonesConfirmed = signal(false);
  readonly audioCompleted = signal(false);
  readonly currentTime = signal(0);
  readonly duration = signal(0);

  readonly isExhausted = computed(() =>
    this.playCount() >= this.settings.maxPlays && !this.settings.allowReplay
      ? this.playCount() > 0
      : this.playCount() >= this.settings.maxPlays
  );

  readonly progressPct = computed(() => {
    const d = this.duration();
    if (!d) return 0;
    return Math.min(100, (this.currentTime() / d) * 100);
  });

  readonly playsLeft = computed(() =>
    Math.max(0, this.settings.maxPlays - this.playCount())
  );

  private get audio(): HTMLAudioElement {
    return this.audioElRef.nativeElement;
  }

  ngAfterViewInit(): void {
    this.audio.addEventListener('loadedmetadata', () => {
      this.duration.set(this.audio.duration || 0);
    });

    if (this.settings.autoStart && !this.settings.requireHeadphonesConfirmation) {
      this.play();
    }

    // Prevent seeking if disabled
    if (this.settings.disableSeeking) {
      this.audio.addEventListener('seeking', () => {
        this.audio.currentTime = this.currentTime();
      });
    }
  }

  ngOnDestroy(): void {
    if (!this.audio.paused) this.audio.pause();
  }

  toggleHeadphones(event: Event): void {
    this.headphonesConfirmed.set((event.target as HTMLInputElement).checked);
    if (this.settings.autoStart && this.headphonesConfirmed()) {
      setTimeout(() => this.play(), 300);
    }
  }

  play(): void {
    if (this.isExhausted()) return;
    this.audio.currentTime = 0;
    this.audio.play().catch(console.error);
  }

  replay(): void {
    if (this.isExhausted()) return;
    this.audio.currentTime = 0;
    this.audio.play().catch(console.error);
  }

  onPlay(): void {
    this.isPlaying.set(true);
    const newCount = this.playCount() + 1;
    this.playCount.set(newCount);
    this.playCountChange.emit(newCount);
  }

  onEnded(): void {
    this.isPlaying.set(false);
    this.audioCompleted.set(true);
    this.audioComplete.emit();
  }

  onTimeUpdate(): void {
    this.currentTime.set(this.audio.currentTime);
  }

  seek(event: Event): void {
    if (this.settings.disableSeeking) return;
    const t = +(event.target as HTMLInputElement).value;
    this.audio.currentTime = t;
    this.currentTime.set(t);
  }

  formatTime(s: number): string {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }
}
