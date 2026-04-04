import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map, of, switchMap } from 'rxjs';
import { Program} from '../../../data/app-user.model';
import { GuestProgramsService } from '../../../core/guest-programs.service';
import { GuestProgramAccess } from '../../../data/guest-commerce.model';


interface GuestProgramRow {
  access: GuestProgramAccess;
  program: Program | null;
}

@Component({
  selector: 'app-guest-programs',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './my-program.html',
  styleUrls: ['./my-program.css'],
})
export class GuestProgramsComponent {
  private guestPrograms = inject(GuestProgramsService);
  private afs = inject(Firestore);
  private router = inject(Router);

  rows = toSignal(
    this.guestPrograms.listMyPrograms$().pipe(
      switchMap((programs) => {
        if (!programs.length) return of([] as GuestProgramRow[]);

        const streams = programs.map((access) =>
          docData(doc(this.afs, `programs/${access.programId}`), {
            idField: 'id',
          }).pipe(
            map((program) => ({
              access,
              program: (program ?? null) as Program | null,
            }))
          )
        );

        return combineLatest(streams);
      })
    ),
    { initialValue: [] as GuestProgramRow[] }
  );

  openProgram(row: GuestProgramRow): void {
    if (!row.access?.id) return;
    this.router.navigate(['/guest/programs', row.access.id]);
  }
}