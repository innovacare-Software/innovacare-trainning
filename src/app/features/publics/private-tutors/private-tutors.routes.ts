import { Routes } from '@angular/router';
import { authCanMatch } from '../../../core/role.canmatch';

export const PRIVATE_TUTORS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./tutors-home.page').then(m => m.TutorsHomePage),
  },
  {
    path: 'book/:tutorId',
    loadComponent: () =>
      import('./booking/booking.page').then(m => m.BookingPage),
  },
  {
    path: 'bookings',
    canMatch: [authCanMatch],
    loadComponent: () =>
      import('./bookings.page').then(m => m.TutorBookingsPage),
  },
];
