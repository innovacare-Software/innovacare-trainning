import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { animate, style, transition, trigger } from '@angular/animations';
import { combineLatest, firstValueFrom } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguageSwitcherComponent } from '../../../shared/components/language-switcher/language-switcher';
import { AuthService, AppProfile } from '../../../core/auth';
import { AuthRedirectService, defaultRouteForRole } from '../../../core/auth-redirect.service';

type TabType = 'guest' | 'org' | 'register';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule, LanguageSwitcherComponent],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
  animations: [
    trigger('slideAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(8px)' }),
        animate('220ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
      transition(':leave', [
        animate('180ms ease-in', style({ opacity: 0, transform: 'translateY(-6px)' })),
      ]),
    ]),
  ],
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private authRedirect = inject(AuthRedirectService);
  private translate = inject(TranslateService);

  loading = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  currentTab = signal<TabType>('guest');

  guestForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    rememberMe: [true],
  });

  orgForm = this.fb.group({
    orgCode: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    rememberMe: [true],
  });

  registerForm = this.fb.group({
    fullName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
    rememberMe: [true],
  });

  resetForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  private async waitForFreshProfile(): Promise<AppProfile> {
    return firstValueFrom(
      combineLatest([this.auth.ready$, this.auth.profile$]).pipe(
        filter(([ready, profile]) =>
          ready &&
          !!profile &&
          !!this.auth.currentUid &&
          profile.uid === this.auth.currentUid
        ),
        map(([_, profile]) => profile as AppProfile),
        take(1)
      )
    );
  }

  private async redirectAfterAuth(profile: AppProfile): Promise<void> {
    const parsed = this.router.parseUrl(this.router.url);
    const returnUrl = String(parsed.queryParams?.['returnUrl'] || '').trim();

    if (returnUrl.startsWith('/')) {
      await this.router.navigateByUrl(returnUrl, { replaceUrl: true });
      return;
    }

    await this.authRedirect.redirectAfterLogin(profile);
  }

  switchTab(tab: TabType) {
    this.currentTab.set(tab);
    this.error.set(null);
    this.success.set(null);
  }

  async submitGuest() {
    if (this.guestForm.invalid) {
      this.guestForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    try {
      const { email, password, rememberMe } = this.guestForm.getRawValue();

      await this.auth.loginWithEmail(email!, password!, !!rememberMe);

      const profile = await this.waitForFreshProfile();
      await this.redirectAfterAuth(profile);
    } catch (e: any) {
      this.error.set(this.mapAuthError(e));
    } finally {
      this.loading.set(false);
    }
  }

  async submitOrg() {
    if (this.orgForm.invalid) {
      this.orgForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    try {
      const { email, password, orgCode, rememberMe } = this.orgForm.getRawValue();

      await this.auth.loginWithOrganization({
        orgCode: orgCode!,
        email: email!,
        password: password!,
        rememberMe: !!rememberMe,
      });

      const profile = await this.waitForFreshProfile();
      await this.redirectAfterAuth(profile);
    } catch (e: any) {
      this.error.set(this.mapAuthError(e));
    } finally {
      this.loading.set(false);
    }
  }

  async submitRegister() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const { password, confirmPassword } = this.registerForm.getRawValue();
    if (password !== confirmPassword) {
      this.error.set(this.translate.instant('auth.validation.passwordsMustMatch'));
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    try {
      const { email, password, fullName, rememberMe } = this.registerForm.getRawValue();

      await this.auth.registerWithEmail(
        email!,
        password!,
        fullName!,
        !!rememberMe
      );

      const profile = await this.waitForFreshProfile();
      await this.redirectAfterAuth(profile);
    } catch (e: any) {
      this.error.set(this.mapAuthError(e));
    } finally {
      this.loading.set(false);
    }
  }

  async google() {
    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    try {
      await this.auth.loginWithGoogle(true);

      const profile = await this.waitForFreshProfile();
      await this.redirectAfterAuth(profile);
    } catch (e: any) {
      this.error.set(this.mapAuthError(e));
    } finally {
      this.loading.set(false);
    }
  }

  async sendResetPassword() {
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    try {
      const { email } = this.resetForm.getRawValue();
      await this.auth.resetPassword(email!);
      this.success.set(this.translate.instant('auth.reset.successMessage'));
    } catch (e: any) {
      this.error.set(this.mapAuthError(e));
    } finally {
      this.loading.set(false);
    }
  }

  private mapAuthError(error: any): string {
    const code = error?.code ?? '';

    switch (code) {
      case 'auth/invalid-email':
        return this.translate.instant('auth.errors.invalidCredentials');
      case 'auth/user-disabled':
        return this.translate.instant('auth.errors.accessDenied');
      case 'auth/user-not-found':
        return this.translate.instant('auth.errors.userNotFound');
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return this.translate.instant('auth.errors.invalidCredentials');
      case 'auth/email-already-in-use':
        return this.translate.instant('auth.errors.invalidCredentials');
      case 'auth/weak-password':
        return this.translate.instant('auth.validation.passwordRequired');
      case 'auth/popup-closed-by-user':
        return this.translate.instant('auth.errors.accessDenied');
      case 'auth/network-request-failed':
        return this.translate.instant('auth.errors.networkError');
      default:
        return error?.message ?? this.translate.instant('auth.errors.unknown');
    }
  }

  // optional debug helper
  async debugRedirectCheck() {
    const profile = await this.waitForFreshProfile();
    console.log('PROFILE AFTER LOGIN', profile);
    console.log('REDIRECT TO', defaultRouteForRole(profile.role));
    await this.router.navigateByUrl(defaultRouteForRole(profile.role), {
      replaceUrl: true,
    });
  }
}