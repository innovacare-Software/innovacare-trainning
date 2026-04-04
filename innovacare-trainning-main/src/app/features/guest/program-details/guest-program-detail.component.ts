import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Firestore, doc, docData, collection, collectionData, query, where } from '@angular/fire/firestore';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map, of, switchMap } from 'rxjs';
import { GuestProgramsService } from '../../../core/guest-programs.service';
import { LiveClass, Program } from '../../../data/app-user.model';
import { GuestProgramAccess } from '../../../data/guest-commerce.model';

interface IncludedCourse {
  id: string;
  title?: string;
  subtitle?: string;
  description?: string;
}


@Component({
  selector: 'app-guest-program-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './guest-program-detail.component.html',
  styleUrls: ['./guest-program-detail.component.css'],
})
export class GuestProgramDetailComponent {
  private route = inject(ActivatedRoute);
  private afs = inject(Firestore);
  private guestPrograms = inject(GuestProgramsService);

  readonly programAccessId = this.route.snapshot.paramMap.get('programAccessId') ?? '';

  access = toSignal(
    this.guestPrograms.myProgramById$(this.programAccessId),
    { initialValue: null as GuestProgramAccess | null }
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
        if (!ids.length) return of([] as IncludedCourse[]);

        const streams = ids.map((id) =>
          docData(doc(this.afs, `courses/${id}`), { idField: 'id' }).pipe(
            map((course) => (course as IncludedCourse | null) ?? null)
          )
        );

        return combineLatest(streams).pipe(
          map((courses) => courses.filter((c): c is IncludedCourse => !!c))
        );
      })
    ),
    { initialValue: [] as IncludedCourse[] }
  );

  liveClasses = toSignal(
    this.guestPrograms.myProgramById$(this.programAccessId).pipe(
      switchMap((access) => {
        const programId = access?.programId ?? '';
        if (!programId) return of([] as LiveClass[]);
        const q = query(
          collection(this.afs, 'liveClasses'),
          where('relatedProgramId', '==', programId),
          where('isActive', '==', true)
        );
        return collectionData(q, { idField: 'id' }).pipe(
          map((items) => items as LiveClass[])
        );
      })
    ),
    { initialValue: [] as LiveClass[] }
  );
}