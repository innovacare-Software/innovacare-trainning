import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map, of, switchMap } from 'rxjs';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  query,
  where,
} from '@angular/fire/firestore';
import { AuthService } from '../../../core/auth';

@Component({
  selector: 'app-org-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './org-dashboard.html',
  styleUrl: './org-dashboard.css',
})
export class OrgDashboardComponent {
  private afs = inject(Firestore);
  private auth = inject(AuthService);

  private readonly profile$ = this.auth.profile$;

  private readonly org$ = this.profile$.pipe(
    switchMap((p) => {
      const orgId = String(p?.orgId || '').trim();
      if (!orgId) return of(null);
      return docData(doc(this.afs, `organizations/${orgId}`), { idField: 'id' }) as any;
    })
  );

  private readonly orgUsers$ = this.profile$.pipe(
    switchMap((p) => {
      const orgId = String(p?.orgId || '').trim();
      if (!orgId) return of([] as any[]);
      return collectionData(query(collection(this.afs, 'users'), where('orgId', '==', orgId)), { idField: 'uid' });
    })
  );

  private readonly orgOffers$ = this.profile$.pipe(
    switchMap((p) => {
      const orgId = String(p?.orgId || '').trim();
      if (!orgId) return of([] as any[]);
      return collectionData(query(collection(this.afs, 'publicOffers'), where('orgId', '==', orgId)), { idField: 'id' });
    })
  );

  readonly vm = toSignal(
    combineLatest([this.profile$, this.org$, this.orgUsers$, this.orgOffers$]).pipe(
      map(([profile, org, users, offers]) => {
        const totalUsers = users.length;
        const activeUsers = users.filter((u: any) => u.active !== false).length;
        const admins = users.filter((u: any) => u.role === 'admin' || u.role === 'manager').length;
        const learners = users.filter((u: any) => u.role === 'learner').length;

        return {
          orgId: profile?.orgId || null,
          orgName: (org as any)?.name || 'Mon organisation',
          totalUsers,
          activeUsers,
          admins,
          learners,
          offers: offers.length,
        };
      })
    ),
    {
      initialValue: {
        orgId: null,
        orgName: 'Mon organisation',
        totalUsers: 0,
        activeUsers: 0,
        admins: 0,
        learners: 0,
        offers: 0,
      },
    }
  );
}
