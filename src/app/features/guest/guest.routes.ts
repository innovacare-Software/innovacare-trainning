import { Routes } from '@angular/router';

import { GuestShellComponent } from './guest-shell/guest-shell.component';
import { GuestDashboardComponent } from './dashboard/guest-dashboard.component';
import { guestGuard } from '../../core/guest.guard';
import { GuestCoursesComponent } from './courses/guest-course';
import { GuestOrdersComponent } from './order/guest-order';
import { GuestProfileComponent } from './profile/guest-profile.component';
import { GuestProgramsComponent } from './program/my-program';
import { GuestBookingsComponent } from './program/program-booking';
import { GuestLiveClassesComponent } from './program/program-live-class';
import { GuestCoursePlayerComponent } from './player/guest-player';
import { GuestProgramDetailComponent } from './program-details/guest-program-detail.component';


export const GUEST_ROUTES: Routes = [
  {
    path: '',
    component: GuestShellComponent,
    canActivate: [guestGuard],
    children: [
      { path: 'dashboard', component: GuestDashboardComponent },
      { path: 'session/courses', component: GuestCoursesComponent },
      { path: 'courses', component: GuestCoursesComponent },
       { path: 'courses/:enrollmentId/player', component: GuestCoursePlayerComponent },
      { path: 'programs', component: GuestProgramsComponent },
      { path: 'programs/:programAccessId', component: GuestProgramDetailComponent },
      { path: 'live-classes', component: GuestLiveClassesComponent },
      { path: 'bookings', component: GuestBookingsComponent },
      { path: 'orders', component: GuestOrdersComponent },
      { path: 'profile', component: GuestProfileComponent },
      
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
];