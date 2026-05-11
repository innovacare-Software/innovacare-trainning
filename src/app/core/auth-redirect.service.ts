import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, take } from 'rxjs';
import { AppProfile } from './auth';
import { defaultRouteForRole, resolveDefaultRoute } from './auth-redirect.util';
import { OrgContextService } from './organization/org-context.service';

export { defaultRouteForRole, resolveDefaultRoute } from './auth-redirect.util';

@Injectable({ providedIn: 'root' })
export class AuthRedirectService {
  private router = inject(Router);
  private orgContext = inject(OrgContextService);

  async redirectAfterLogin(profile: AppProfile | null): Promise<void> {
    if (!profile || profile.active === false) {
      await this.router.navigate(['/login']);
      return;
    }

    // Pull the latest org context (with memberships) so the redirect honors
    // org-scoped admin assignments instead of the legacy users.role field.
    let ctx = null;
    try {
      ctx = await firstValueFrom(this.orgContext.context$.pipe(take(1)));
    } catch {
      ctx = null;
    }

    await this.router.navigateByUrl(resolveDefaultRoute(profile, ctx), {
      replaceUrl: true,
    });
  }
}
