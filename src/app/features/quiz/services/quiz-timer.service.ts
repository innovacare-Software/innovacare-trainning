import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Injectable({ providedIn: 'root' })
export class QuizTimerService {
  private readonly destroyRef = inject(DestroyRef);

  private readonly totalElapsedState = signal(0);
  private readonly questionElapsedState = signal(0);
  private readonly pausedState = signal(false);

  private ticker: Subscription | null = null;
  private totalStartedAtMs = 0;
  private questionStartedAtMs = 0;
  private pausedAtMs = 0;
  private questionRunning = false;

  readonly totalElapsed = computed(() => this.totalElapsedState());
  readonly currentQuestionElapsed = computed(() => this.questionElapsedState());
  readonly paused = computed(() => this.pausedState());

  start(totalElapsed = 0, questionElapsed = 0, questionRunning = true): void {
    this.stopTicker();
    this.totalElapsedState.set(Math.max(0, Math.floor(totalElapsed)));
    this.questionElapsedState.set(Math.max(0, Math.floor(questionElapsed)));
    this.pausedState.set(false);
    this.totalStartedAtMs = Date.now() - this.totalElapsedState() * 1000;
    this.questionStartedAtMs = Date.now() - this.questionElapsedState() * 1000;
    this.questionRunning = questionRunning;
    this.ticker = interval(250)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.tick());
  }

  beginQuestion(initialElapsed = 0): void {
    this.questionElapsedState.set(Math.max(0, Math.floor(initialElapsed)));
    this.questionStartedAtMs = Date.now() - this.questionElapsedState() * 1000;
    this.questionRunning = true;
  }

  freezeQuestion(elapsed = this.questionElapsedState()): void {
    this.questionElapsedState.set(Math.max(0, Math.floor(elapsed)));
    this.questionRunning = false;
  }

  pause(): void {
    if (this.pausedState()) {
      return;
    }
    this.syncNow();
    this.pausedAtMs = Date.now();
    this.pausedState.set(true);
  }

  resume(): void {
    if (!this.pausedState()) {
      return;
    }
    const deltaMs = Date.now() - this.pausedAtMs;
    this.totalStartedAtMs += deltaMs;
    if (this.questionRunning) {
      this.questionStartedAtMs += deltaMs;
    }
    this.pausedState.set(false);
  }

  reset(): void {
    this.stopTicker();
    this.totalElapsedState.set(0);
    this.questionElapsedState.set(0);
    this.pausedState.set(false);
    this.totalStartedAtMs = 0;
    this.questionStartedAtMs = 0;
    this.pausedAtMs = 0;
    this.questionRunning = false;
  }

  syncNow(): void {
    if (!this.totalStartedAtMs) {
      return;
    }
    const now = Date.now();
    this.totalElapsedState.set(Math.max(0, Math.floor((now - this.totalStartedAtMs) / 1000)));
    if (this.questionRunning) {
      this.questionElapsedState.set(Math.max(0, Math.floor((now - this.questionStartedAtMs) / 1000)));
    }
  }

  private tick(): void {
    if (this.pausedState()) {
      return;
    }
    this.syncNow();
  }

  private stopTicker(): void {
    this.ticker?.unsubscribe();
    this.ticker = null;
  }
}
