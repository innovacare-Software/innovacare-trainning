import {Component, inject, signal, computed} from "@angular/core";
import {CommonModule} from "@angular/common";
import {toSignal} from "@angular/core/rxjs-interop";
import {Observable, map, startWith} from "rxjs";

import {NotificationDetailDialogComponent} from "../notification-detail-dialog/notification-detail-dialog";
import {
  AppNotification,
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CATEGORY_LABELS,
  NotificationCategory,
  NotificationService,
} from "../../../services/notification";

@Component({
  standalone: true,
  selector: "app-notification-bell-plain",
  imports: [CommonModule, NotificationDetailDialogComponent],
  templateUrl: "./notification-bell-plain.html",
  styleUrls: ["./notification-bell-plain.css"],
})
export class NotificationBellPlainComponent {
  private notifSvc = inject(NotificationService);

  open = signal(false);
  prefsOpen = signal(false);
  readonly categories = NOTIFICATION_CATEGORIES;
  readonly categoryLabels = NOTIFICATION_CATEGORY_LABELS;

  // ✅ 1) On force un Observable<AppNotification[]> SANS undefined
  private unreadSafe$: Observable<AppNotification[]> = (this.notifSvc.unread$ as Observable<unknown>).pipe(
    map((v) => (Array.isArray(v) ? (v as AppNotification[]) : [])),
    startWith([] as AppNotification[]),
  );

  unread = toSignal(this.unreadSafe$, {initialValue: [] as AppNotification[]});
  preferences = toSignal(this.notifSvc.preferences$(), {initialValue: DEFAULT_NOTIFICATION_PREFERENCES});

  unreadCount = computed(() => this.unread().length);

  toggle() { this.open.set(!this.open()); }
  togglePrefs() { this.prefsOpen.set(!this.prefsOpen()); }

  openDetail(n: AppNotification, dlg: NotificationDetailDialogComponent) {
    dlg.openWithItem(n as any);
    this.open.set(false);
  }

  async setCategoryPreference(category: NotificationCategory, event: Event) {
    const checked = (event.target as HTMLInputElement | null)?.checked ?? true;
    await this.notifSvc.updateCategoryPreference(category, checked);
  }
}
