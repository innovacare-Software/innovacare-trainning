import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-listening-timer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="timer-wrap" [class.timer--warn]="isWarning()" [class.timer--critical]="isCritical()">
      <span class="timer-icon">⏱</span>
      <span class="timer-display">{{ displayTime() }}</span>
      @if (isWarning()) {
        <span class="timer-label">Time running out!</span>
      }
    </div>
  `,
  styles: [`
    .timer-wrap {
      display: flex; align-items: center; gap: 0.45rem;
      padding: 0.4rem 0.9rem; border-radius: 0.7rem;
      background: rgba(14, 165, 233, 0.1); border: 1px solid rgba(14,165,233,0.25);
      color: #0ea5e9; font-weight: 700; font-size: 1rem;
      transition: all 0.3s;
    }
    .timer--warn { background: rgba(251,146,60,0.12); border-color: rgba(251,146,60,0.35); color: #fb923c; }
    .timer--critical { background: rgba(248,113,113,0.15); border-color: rgba(248,113,113,0.4); color: #f87171; animation: pulse 1s infinite; }
    .timer-icon { font-size: 1.1rem; }
    .timer-label { font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
  `],
})
export class ListeningTimerComponent implements OnInit, OnDestroy {
  @Input({ required: true }) durationMin!: number;
  @Output() timesUp = new EventEmitter<number>(); // emits seconds used
  @Output() tickSeconds = new EventEmitter<number>();

  private intervalId: ReturnType<typeof setInterval> | null = null;
  private secondsUsed = 0;
  readonly remaining = signal(0);

  readonly displayTime = computed(() => {
    const s = this.remaining();
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  });

  readonly isWarning = computed(() => this.remaining() <= 120 && this.remaining() > 60);
  readonly isCritical = computed(() => this.remaining() <= 60);

  ngOnInit(): void {
    this.remaining.set(this.durationMin * 60);
    this.intervalId = setInterval(() => this.tick(), 1000);
  }

  private tick(): void {
    const r = this.remaining() - 1;
    this.secondsUsed++;
    this.tickSeconds.emit(this.secondsUsed);

    if (r <= 0) {
      this.remaining.set(0);
      this.stopTimer();
      this.timesUp.emit(this.secondsUsed);
    } else {
      this.remaining.set(r);
    }
  }

  stopTimer(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  getSecondsUsed(): number {
    return this.secondsUsed;
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }
}
