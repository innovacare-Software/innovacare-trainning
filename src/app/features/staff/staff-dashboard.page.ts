import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth';
import { UserOrgMembershipsService, UserOrgMembership } from '../../core/organization/user-org-memberships';

/**
 * Tableau de bord partagé pour les rôles instructor / tutor / staff.
 * Il propose les raccourcis pertinents (programmes, cours, learners) sans
 * exposer les zones strictement réservées aux admins d'organisation ou de
 * programme. Les rôles non-admin n'ont pas accès aux écrans de gestion
 * sensibles.
 */
@Component({
  selector: 'app-staff-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <section class="page">
      <header class="page-head">
        <div>
          <h1>{{ headline() }}</h1>
          <p class="subtitle">
            Bienvenue {{ profile()?.displayName || profile()?.email }}.
            Voici vos affectations et vos outils pédagogiques.
          </p>
        </div>
        <span class="role-pill" [attr.data-role]="profile()?.role">{{ roleLabel() }}</span>
      </header>

      <!-- KPI -->
      <div class="kpi-row">
        <div class="kpi">
          <span class="kpi-value">{{ activeMemberships().length }}</span>
          <span class="kpi-label">Organisations actives</span>
        </div>
        <div class="kpi">
          <span class="kpi-value">{{ uniqueOrgIds().length }}</span>
          <span class="kpi-label">Tenants distincts</span>
        </div>
        <div class="kpi">
          <span class="kpi-value">{{ adminCount() }}</span>
          <span class="kpi-label">Rôles d'administration</span>
        </div>
        <div class="kpi">
          <span class="kpi-value">{{ inactiveCount() }}</span>
          <span class="kpi-label">Affectations inactives</span>
        </div>
      </div>

      <!-- Memberships -->
      <section class="block">
        <header class="block-head">
          <h2>Mes affectations</h2>
          <span class="muted small" *ngIf="memberships().length">
            {{ memberships().length }} entrée{{ memberships().length > 1 ? 's' : '' }}
          </span>
        </header>

        <div class="empty" *ngIf="!loading() && memberships().length === 0">
          Aucune affectation pour l'instant. Contactez un administrateur pour être ajouté
          à une organisation.
        </div>
        <div class="empty" *ngIf="loading()">Chargement…</div>

        <table class="m-table" *ngIf="memberships().length">
          <thead>
            <tr>
              <th>Organisation</th>
              <th>Rôle</th>
              <th>Statut</th>
              <th>Mis à jour</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let m of memberships()">
              <td><code>{{ m.orgId }}</code></td>
              <td><span class="role-tag">{{ m.role }}</span></td>
              <td>
                <span class="status-dot" [class.active]="m.status === 'active'"></span>
                {{ m.status }}
              </td>
              <td class="muted small">{{ formatDate(m.updatedAt) }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Action cards -->
      <section class="block">
        <header class="block-head">
          <h2>Outils & raccourcis</h2>
        </header>
        <div class="cards">
          <article class="card">
            <h3>Catalogue de programmes</h3>
            <p>Parcourez les programmes publiés disponibles sur la plateforme.</p>
            <a class="btn-primary" routerLink="/programs">Ouvrir le catalogue</a>
          </article>

          <article class="card">
            <h3>Catalogue de cours</h3>
            <p>Explorez les cours publics et les contenus pédagogiques.</p>
            <a class="btn-secondary" routerLink="/courses">Voir les cours</a>
          </article>

          <article class="card" *ngIf="profile()?.role === 'tutor' || profile()?.role === 'instructor'">
            <h3>Espace tuteurs</h3>
            <p>Présentation publique du programme de tutorat et processus.</p>
            <a class="btn-secondary" routerLink="/private-tutors">Découvrir</a>
          </article>

          <article class="card">
            <h3>Notifications</h3>
            <p>Gérez vos préférences d'alertes (e-mail, push, SMS).</p>
            <a class="btn-secondary" routerLink="/my-account/notification-preferences">
              Préférences
            </a>
          </article>

          <article class="card">
            <h3>Centre d'aide</h3>
            <p>Documentation, contact support et guides pédagogiques.</p>
            <a class="btn-secondary" routerLink="/contact">Contacter le support</a>
          </article>
        </div>
      </section>

      <p class="hint" *ngIf="memberships().length === 0 && !loading()">
        Astuce : les fonctionnalités d'administration de programme apparaissent automatiquement
        lorsqu'un super-administrateur vous attribue un rôle <code>program_admin</code> ou
        <code>org_admin</code> dans une organisation.
      </p>
    </section>
  `,
  styles: [`
    .page { padding: 1.4rem; max-width: 1180px; margin: 0 auto; }
    .page-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 1.4rem; }
    .page-head h1 { color: #173f68; margin: 0 0 0.25rem; font-size: 1.45rem; }
    .subtitle { color: #5b7797; margin: 0; }
    .role-pill { display: inline-block; padding: 0.35rem 0.75rem; border-radius: 999px; background: #eef3f9; color: #173f68; font-weight: 600; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.04em; border: 1px solid #d6e3f1; }

    .kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 0.85rem; margin-bottom: 1.6rem; }
    .kpi { background: #fff; border: 1px solid #d6e3f1; border-radius: 0.85rem; padding: 0.95rem 1.05rem; box-shadow: 0 1px 2px rgba(23,63,104,0.04); }
    .kpi-value { display: block; font-size: 1.6rem; font-weight: 700; color: #173f68; line-height: 1.1; }
    .kpi-label { display: block; color: #5b7797; font-size: 0.82rem; margin-top: 0.2rem; }

    .block { margin-bottom: 1.6rem; background: #fff; border: 1px solid #d6e3f1; border-radius: 0.95rem; padding: 1rem 1.15rem; }
    .block-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.85rem; }
    .block-head h2 { color: #173f68; margin: 0; font-size: 1.05rem; }

    .m-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    .m-table th, .m-table td { text-align: left; padding: 0.55rem 0.5rem; border-bottom: 1px solid #eef3f9; }
    .m-table th { color: #5b7797; font-weight: 600; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.03em; }
    .m-table code { background: #f4f7fb; padding: 0.1rem 0.4rem; border-radius: 0.35rem; font-size: 0.82rem; }
    .role-tag { display: inline-block; padding: 0.18rem 0.55rem; border-radius: 0.4rem; background: #eef3f9; color: #173f68; font-weight: 600; font-size: 0.78rem; }
    .status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #c2cfdd; margin-right: 0.45rem; }
    .status-dot.active { background: #2bb673; }

    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 0.9rem; }
    .card { background: #f8fbff; border: 1px solid #d6e3f1; border-radius: 0.8rem; padding: 0.9rem 1rem; display: flex; flex-direction: column; gap: 0.5rem; }
    .card h3 { color: #173f68; margin: 0; font-size: 1rem; }
    .card p { color: #4f6985; margin: 0; font-size: 0.88rem; flex: 1; }
    .btn-primary, .btn-secondary { align-self: flex-start; display: inline-block; padding: 0.45rem 0.9rem; border-radius: 0.55rem; text-decoration: none; font-weight: 600; font-size: 0.84rem; }
    .btn-primary { background: linear-gradient(135deg, #1a74c8, #173f68); color: #fff; }
    .btn-secondary { background: #fff; color: #173f68; border: 1px solid #d6e3f1; }

    .empty { color: #6c8aa5; padding: 0.6rem 0; }
    .hint { color: #6c8aa5; font-size: 0.85rem; }
    .muted { color: #6c8aa5; }
    .small { font-size: 0.82rem; }
  `],
})
export class StaffDashboardPage {
  private auth = inject(AuthService);
  private memberships$ = inject(UserOrgMembershipsService);

  profile = toSignal(this.auth.profile$, { initialValue: null });

  private membershipsStream = toSignal<UserOrgMembership[] | null>(
    this.auth.profile$.pipe(
      switchMap((p) => (p?.uid ? this.memberships$.listForUser(p.uid) : of([] as UserOrgMembership[]))),
    ),
    { initialValue: null },
  );

  loading = computed(() => this.membershipsStream() === null);
  memberships = computed<UserOrgMembership[]>(() => this.membershipsStream() ?? []);
  activeMemberships = computed(() => this.memberships().filter((m) => m.status === 'active'));
  inactiveCount = computed(() => this.memberships().filter((m) => m.status !== 'active').length);
  uniqueOrgIds = computed(() => Array.from(new Set(this.memberships().map((m) => m.orgId))));
  adminCount = computed(() =>
    this.memberships().filter((m) => m.status === 'active' && (m.role === 'program_admin' || m.role === 'org_admin')).length,
  );

  headline = computed(() => {
    const role = this.profile()?.role;
    if (role === 'instructor') return 'Espace Instructor';
    if (role === 'tutor') return 'Espace Tutor';
    if (role === 'staff') return 'Espace Staff';
    return 'Espace personnel';
  });

  roleLabel = computed(() => {
    const role = this.profile()?.role;
    return role ? role.replace(/_/g, ' ') : '—';
  });

  formatDate(value: unknown): string {
    if (!value) return '—';
    try {
      const d = (value as { toDate?: () => Date }).toDate?.() ?? new Date(value as string);
      if (Number.isNaN(d.getTime())) return '—';
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return '—';
    }
  }
}

