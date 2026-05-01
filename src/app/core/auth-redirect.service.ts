import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AppProfile } from './auth';
import { defaultRouteForRole, resolveDefaultRoute } from './auth-redirect.util';

export { defaultRouteForRole, resolveDefaultRoute } from './auth-redirect.util';

@Injectable({ providedIn: 'root' })
export class AuthRedirectService {
  private router = inject(Router);

  async redirectAfterLogin(profile: AppProfile | null): Promise<void> {
    if (!profile || profile.active === false) {
      await this.router.navigate(['/login']);
      return;
    }

    await this.router.navigateByUrl(resolveDefaultRoute(profile), {
      replaceUrl: true,
    });
  }
}