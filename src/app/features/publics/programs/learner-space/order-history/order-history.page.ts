import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { map, switchMap } from 'rxjs/operators';
import { LearnerDashboardExperienceService } from '../services/learner-dashboard-experience.service';

@Component({
  selector: 'app-order-history-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    @if (experience(); as experience) {
      <section class="oh-shell">
        <header class="oh-hero">
          <span class="oh-kicker">Order history</span>
          <h1>Your purchases and upgrade trail</h1>
          <p>Review what you bought, when it was purchased, and what to add next.</p>
        </header>

        <div class="oh-layout">
          <div class="oh-list">
            @for (order of experience.orders; track order.id) {
              <button type="button" class="oh-row" [class.is-active]="selectedOrder()?.id === order.id" (click)="selectedOrderId.set(order.id || null)">
                <div>
                  <strong>{{ order.title }}</strong>
                  <span>{{ order.status }} · {{ formatDate(order.createdAt) }}</span>
                </div>
                <b>{{ formatAmount(order.amount, order.currency) }}</b>
              </button>
            } @empty {
              <div class="oh-empty">No orders yet.</div>
            }
          </div>

          <div class="oh-detail" *ngIf="selectedOrder() as order; else noSelection">
            <span class="oh-kicker">Selected order</span>
            <h2>{{ order.title }}</h2>
            <p>Type: {{ order.itemType }} · Status: {{ order.status }}</p>
            <p>Amount: {{ formatAmount(order.amount, order.currency) }}</p>
            <a class="oh-btn" routerLink="../explore-products">Buy more</a>
          </div>

          <ng-template #noSelection>
            <div class="oh-detail oh-empty">Select an order to see its details.</div>
          </ng-template>
        </div>
      </section>
    }
  `,
  styles: [`
    :host { display: block; }
    .oh-shell, .oh-layout, .oh-list { display: grid; gap: 1rem; }
    .oh-layout { grid-template-columns: minmax(0, 1.1fr) minmax(320px, .9fr); }
    .oh-hero, .oh-row, .oh-detail, .oh-empty { border-radius: 1.3rem; border: 1px solid rgba(20,33,50,.08); background: rgba(255,255,255,.92); box-shadow: 0 18px 46px rgba(20,33,50,.08); }
    .oh-hero, .oh-detail, .oh-empty { padding: 1.1rem; }
    .oh-kicker, .oh-row span { text-transform: uppercase; letter-spacing: .12em; font-size: .72rem; font-weight: 800; color: #155e75; }
    .oh-hero h1, .oh-detail h2 { margin: .2rem 0 0; font-family: 'Iowan Old Style', Georgia, serif; }
    .oh-hero p, .oh-detail p { color: #52606d; line-height: 1.7; }
    .oh-row { display: flex; justify-content: space-between; gap: 1rem; align-items: center; padding: .95rem 1rem; cursor: pointer; text-align: left; }
    .oh-row.is-active { border-color: rgba(21,94,117,.2); background: rgba(237,248,248,.95); }
    .oh-row div { display: grid; gap: .15rem; }
    .oh-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 42px; padding: 0 1rem; width: fit-content; border-radius: 999px; background: linear-gradient(135deg, #155e75, #0f766e); color: #fff; text-decoration: none; font-weight: 800; }
    @media (max-width: 860px) { .oh-layout { grid-template-columns: 1fr; } }
    @media (max-width: 560px) {
      .oh-row { flex-direction: column; align-items: flex-start; }
      .oh-btn { width: 100%; }
    }
  `],
})
export class OrderHistoryPage {
  private readonly route = inject(ActivatedRoute);
  private readonly experienceService = inject(LearnerDashboardExperienceService);

  readonly selectedOrderId = signal<string | null>(null);

  readonly experience = toSignal(
    this.route.parent!.paramMap.pipe(
      map((params) => params.get('programId') || ''),
      switchMap((programId) => this.experienceService.buildExperience(programId))
    ),
    { initialValue: null }
  );

  readonly selectedOrder = computed(() => {
    const orders = this.experience()?.orders ?? [];
    if (!orders.length) {
      return undefined;
    }
    return orders.find((order) => order.id === this.selectedOrderId()) || orders[0];
  });

  formatAmount(amount: number, currency = 'USD'): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(amount || 0));
  }

  formatDate(value: unknown): string {
    if (!value || typeof value !== 'object' || !('toDate' in value)) {
      return 'Pending date';
    }
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format((value as { toDate(): Date }).toDate());
  }
}