import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { combineLatest, firstValueFrom } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';
import { AuthService, AppProfile } from '../../../core/auth';

type TabType = 'guest' | 'org' | 'register';

function defaultRouteForRole(role: AppProfile['role']): string {
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

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

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
      await this.router.navigateByUrl(defaultRouteForRole(profile.role), {
        replaceUrl: true,
      });
    } catch (e: any) {
      this.error.set(this.mapAuthError(e, 'Login failed'));
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
      await this.router.navigateByUrl(defaultRouteForRole(profile.role), {
        replaceUrl: true,
      });
    } catch (e: any) {
      this.error.set(this.mapAuthError(e, 'Organization login failed'));
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
      this.error.set('Passwords do not match');
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
      await this.router.navigateByUrl(defaultRouteForRole(profile.role), {
        replaceUrl: true,
      });
    } catch (e: any) {
      this.error.set(this.mapAuthError(e, 'Registration failed'));
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
      await this.router.navigateByUrl(defaultRouteForRole(profile.role), {
        replaceUrl: true,
      });
    } catch (e: any) {
      this.error.set(this.mapAuthError(e, 'Google sign-in failed'));
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
      this.success.set('Password reset email sent. Please check your inbox.');
    } catch (e: any) {
      this.error.set(this.mapAuthError(e, 'Password reset failed'));
    } finally {
      this.loading.set(false);
    }
  }

  private mapAuthError(error: any, fallback: string): string {
    const code = error?.code ?? '';

    switch (code) {
      case 'auth/invalid-email':
        return 'Invalid email address.';
      case 'auth/user-disabled':
        return 'This account has been disabled.';
      case 'auth/user-not-found':
        return 'No account found with this email.';
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Incorrect email or password.';
      case 'auth/email-already-in-use':
        return 'This email is already in use.';
      case 'auth/weak-password':
        return 'Password is too weak.';
      case 'auth/popup-closed-by-user':
        return 'Google sign-in was cancelled.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection.';
      default:
        return error?.message ?? fallback;
    }
  }
}