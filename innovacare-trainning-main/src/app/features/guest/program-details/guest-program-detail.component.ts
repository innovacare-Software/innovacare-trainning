import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Firestore, doc, docData, collection, collectionData, query, where } from '@angular/fire/firestore';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map, of, switchMap } from 'rxjs';
import { GuestProgramsService } from '../../../core/guest-programs.service';
import { LiveClass, Program } from '../../../data/app-user.model';


@Component({
  selector: 'app-guest-program-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './guest-program-detail.html',
  styleUrls: ['./guest-program-detail.css'],
})
export class GuestProgramDetailComponent {
  private route = inject(ActivatedRoute);
  private afs = inject(Firestore);
  private guestPrograms = inject(GuestProgramsService);

  readonly programAccessId = this.route.snapshot.paramMap.get('programAccessId') ?? '';

  access = toSignal(
    this.guestPrograms.myProgramById$(this.programAccessId),
    { initialValue: null as any }
  );

  private getProgramById$ = (programId: string) => {
    if (!programId) return of(null as Program | null);
    return docData(doc(this.afs, `programs/${programId}`), { idField: 'id' }).pipe(
      map((doc: any) => doc as Program | null)
    );
  };

  program = toSignal(
    this.guestPrograms.myProgramById$(this.programAccessId).pipe(
      switchMap((access) => {
        const programId = access?.programId ?? '';
        return this.getProgramById$(programId);
      })
    ),
    { initialValue: null as Program | null }
  );

  includedCourses = toSignal(
    this.guestPrograms.myProgramById$(this.programAccessId).pipe(
      switchMap((access) => {
        const programId = access?.programId ?? '';
        return this.getProgramById$(programId);
      }),
      switchMap((program: Program | null) => {
        const ids = program?.includesCourseIds ?? [];
        if (!ids.length) return of([]);

        const streams = ids.map((id) =>
          docData(doc(this.afs, `courses/${id}`), { idField: 'id' }).pipe(
            map((course: any) => course ?? null)
          )
        );

        return combineLatest(streams);
      })
    ),
    { initialValue: [] as any[] }
  );

  liveClasses = toSignal(
    this.guestPrograms.myProgramById$(this.programAccessId).pipe(
      switchMap((access) => {
        const programId = access?.programId ?? '';
        if (!programId) return of([]);
        const q = query(
          collection(this.afs, 'liveClasses'),
          where('relatedProgramId', '==', programId),
          where('isActive', '==', true)
        );
        return collectionData(q, { idField: 'id' }) as any;
      })
    ),
    { initialValue: [] as LiveClass[] }
  );
}