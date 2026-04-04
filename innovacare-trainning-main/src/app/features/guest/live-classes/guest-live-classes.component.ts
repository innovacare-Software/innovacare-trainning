import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { LiveClassesService } from '../../../core/live-classes.service';

@Component({
  selector: 'app-guest-live-classes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './guest-live-classes.component.html',
  styleUrls: ['./guest-live-classes.component.css'],
})
export class GuestLiveClassesComponent {
  private liveClassesService = inject(LiveClassesService);

  notice = '';
  bookingId: string | null = null;

  classes = toSignal(
    this.liveClassesService.listActiveLiveClasses$(),
    { initialValue: [] as any[] }
  );

  async book(liveClassId: string): Promise<void> {
    this.notice = '';
    this.bookingId = liveClassId;

    try {
      await this.liveClassesService.bookLiveClass(liveClassId);
      this.notice = 'Live class booked successfully.';
    } catch (e: any) {
      this.notice = e?.message || 'Failed to book live class.';
    } finally {
      this.bookingId = null;
    }
  }
}