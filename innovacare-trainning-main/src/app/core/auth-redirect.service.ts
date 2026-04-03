import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AppUserProfile } from '../data/app-user.model';


@Injectable({ providedIn: 'root' })
export class AuthRedirectService {
  private router = inject(Router);

  async redirectAfterLogin(profile: AppUserProfile | null) {
    if (!profile || !profile.isActive) {
      await this.router.navigate(['/']);
      return;
    }

    switch (profile.primaryRole) {
      case 'guest':
        await this.router.navigate(['/guest/dashboard']);
        return;
      case 'learner':
        await this.router.navigate(['/learner/courses']);
        return;
      case 'manager':
      case 'admin':
      case 'super_admin':
        await this.router.navigate(['/manager']);
        return;
      default:
        await this.router.navigate(['/']);
    }
  }
}