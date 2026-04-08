import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AppProfile, AppRole } from './auth';

export function defaultRouteForRole(role: AppRole): string {
  switch (role) {
    case 'super_admin':
      return '/super-admin/dashboard';
    case 'admin':
    case 'manager':
      return '/manager/dashboard';
    case 'learner':
      return '/learner';
    case 'guest':
      return '/guest/dashboard';
    default:
      return '/login';
  }
}

@Injectable({ providedIn: 'root' })
export class AuthRedirectService {
  private router = inject(Router);

  async redirectAfterLogin(profile: AppProfile | null): Promise<void> {
    if (!profile || profile.active === false) {
      await this.router.navigate(['/login']);
      return;
    }

    await this.router.navigateByUrl(defaultRouteForRole(profile.role), {
      replaceUrl: true,
    });
  }
}