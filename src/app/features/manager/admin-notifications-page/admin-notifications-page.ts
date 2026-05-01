import {Component, inject, signal} from "@angular/core";
import {CommonModule} from "@angular/common";
import {FormsModule} from "@angular/forms";
import {toSignal} from "@angular/core/rxjs-interop";

import {MatCardModule} from "@angular/material/card";
import {MatFormFieldModule} from "@angular/material/form-field";
import {MatInputModule} from "@angular/material/input";
import {MatSelectModule} from "@angular/material/select";
import {MatButtonModule} from "@angular/material/button";
import {MatDividerModule} from "@angular/material/divider";
import {MatListModule} from "@angular/material/list";
import { AdminNotificationLog, AdminNotificationService } from "../../../shared/services/admin-notification";
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CATEGORY_LABELS,
  NotificationCategory,
} from '../../../shared/services/notification';

type Role = "learner" | "nurse" | "staff" | "admin" | "manager";
type AudienceType = "all" | "role" | "user";
type Severity = "info" | "warning" | "critical";

@Component({
  standalone: true,
  selector: 'app-admin-notifications-page',
  imports: [ CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDividerModule,
    MatListModule,],
  templateUrl: './admin-notifications-page.html',
  styleUrl: './admin-notifications-page.css',
})
export class AdminNotificationsPage {
  private notif = inject(AdminNotificationService);

  // Form state (signals)
  title = signal<string>("");
  body = signal<string>("");
  link = signal<string>("");
  severity = signal<Severity>("info");
  category = signal<NotificationCategory>('announcements');

  audienceType = signal<AudienceType>("all");
  audienceRole = signal<Role>("learner");
  audienceUid = signal<string>("");

  busy = signal<boolean>(false);
  notice = signal<string>("");
  isError = signal<boolean>(false);
  readonly categories = NOTIFICATION_CATEGORIES;
  readonly categoryLabels = NOTIFICATION_CATEGORY_LABELS;
  readonly categoryHelpText: Record<NotificationCategory, string> = {
    announcements: 'Messages generaux, communication large et annonces produit.',
    account: 'Creation de compte, activation et changements lies au profil.',
    commerce: 'Achats, confirmations de commande et octroi d acces commercial.',
    live_sessions: 'Reservations, confirmations et rappels de sessions live.',
    exam_prep: 'Soumissions, scores et activite liee a l exam prep.',
    certificates: 'Certificats disponibles, generes ou mis a jour.',
    content: 'Publication ou disponibilite de nouveaux contenus.',
  };

  recent = toSignal(this.notif.recentNotifications$(20), {initialValue: [] as AdminNotificationLog[]});

  async send() {
    this.notice.set("");
    this.isError.set(false);
    this.busy.set(true);

    try {
      const t = this.title().trim();
      const b = this.body().trim();
      if (!t || !b) throw new Error("Title and body are required.");

      const type = this.audienceType();
      const audience =
        type === "all"
          ? {type: "all" as const}
          : type === "role"
            ? {type: "role" as const, role: this.audienceRole()}
            : {type: "user" as const, uid: this.audienceUid().trim()};

      if (audience.type === "user" && !audience.uid) {
        throw new Error("Audience UID is required for type=user.");
      }

      const result = await this.notif.createNotification({
        title: t,
        body: b,
        link: this.link().trim() || null,
        severity: this.severity(),
        category: this.category(),
        audience,
      });

      this.notice.set(`Notification sent to ${result.recipientsCount} recipient(s).`);

      // reset
      this.title.set("");
      this.body.set("");
      this.link.set("");
      this.audienceUid.set("");
      this.audienceType.set("all");
      this.audienceRole.set("learner");
      this.severity.set("info");
      this.category.set('announcements');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.notice.set(msg || "Failed to send notification.");
      this.isError.set(true);
    } finally {
      this.busy.set(false);
    }
  }

  categoryLabel(category?: NotificationCategory | null): string {
    if (!category) {
      return this.categoryLabels.announcements;
    }
    return this.categoryLabels[category] || category;
  }

  currentCategoryHelp(): string {
    return this.categoryHelpText[this.category()] || '';
  }
}