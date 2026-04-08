import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map, of, switchMap } from 'rxjs';
import { Firestore, doc, docData } from '@angular/fire/firestore';
import { LiveClassesService } from '../../../core/live-classes.service';


interface BookingRow {
  booking: any;
  liveClass: any | null;
}

@Component({
  selector: 'app-guest-bookings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './guest-bookings.component.html',
  styleUrls: ['./guest-bookings.component.css'],
})
export class GuestBookingsComponent {
  private liveClassesService = inject(LiveClassesService);
  private afs = inject(Firestore);

  rows = toSignal(
    this.liveClassesService.listMyBookings$().pipe(
      switchMap((bookings) => {
        if (!bookings.length) return of([] as BookingRow[]);

        const streams = bookings.map((booking) =>
          docData(doc(this.afs, `liveClasses/${booking.liveClassId}`), {
            idField: 'id',
          }).pipe(
            map((liveClass) => ({
              booking,
              liveClass: (liveClass ?? null) as any | null,
            }))
          )
        );

        return combineLatest(streams);
      })
    ),
    { initialValue: [] as BookingRow[] }
  );
}