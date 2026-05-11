import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { animate, style, transition, trigger } from '@angular/animations';
import { combineLatest, firstValueFrom, throwError } from 'rxjs';
import { filter, map, take, timeout } from 'rxjs/operators';
import { AuthService, AppProfile, RegisterWithEmailPayload } from '../../../core/auth';
import { AuthRedirectService, resolveDefaultRoute } from '../../../core/auth-redirect.service';

type TabType = 'guest' | 'org' | 'register';

@Component({
  standalone: true,
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
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
  readonly logoUrl = 'https://res.cloudinary.com/dtdpx59sc/image/upload/q_auto/f_auto/v1775625663/142F3705-07E3-43F3-BD40-F5556DD88AEC_uemn1w.png';

  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authRedirect = inject(AuthRedirectService);

  readonly learnerTypes = [
    'Nursing student',
    'Licensed nurse',
    'International graduate',
    'Healthcare professional',
    'Educator',
  ];

  readonly examGoals = [
    'NCLEX-RN',
    'NCLEX-PN',
    'Nursing school success',
    'Private tutoring',
    'USMLE / medical boards',
    'Other exam prep',
  ];

  readonly referralSources = [
    'Google search',
    'Social media',
    'Friend or colleague',
    'School or organization',
    'Email campaign',
    'Other',
  ];

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
    phone: ['', Validators.required],
    country: ['', Validators.required],
    learnerType: ['', Validators.required],
    examGoal: ['', Validators.required],
    organizationName: [''],
    referralSource: [''],
    goals: [''],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
    acceptTerms: [false, Validators.requiredTrue],
    rememberMe: [true],
  });

  resetForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  constructor() {
    this.applyRequestedTab();

    this.route.queryParamMap.subscribe(() => {
      this.applyRequestedTab();
    });
  }

  private async waitForFreshProfile(): Promise<AppProfile> {
    // SECURITY/UX: bound the wait so a stale Firestore listener (e.g. left
    // over from the previous account when the user switches accounts) cannot
    // hang the login spinner forever. If the new profile fails to load in
    // time we surface a clear error and let the caller retry.
    return firstValueFrom(
      combineLatest([this.auth.ready$, this.auth.profile$]).pipe(
        filter(([ready, profile]) =>
          ready &&
          !!profile &&
          !!this.auth.currentUid &&
          profile.uid === this.auth.currentUid
        ),
        map(([_, profile]) => profile as AppProfile),
        take(1),
        timeout({
          each: 15000,
          with: () =>
            throwError(() => new Error(
              'Profile load timed out. Please reload the page and sign in again.'
            )),
        })
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

  private applyRequestedTab(): void {
    const routePath = String(this.route.snapshot.routeConfig?.path || '').trim().toLowerCase();
    const requestedTab = String(this.route.snapshot.queryParamMap.get('tab') || '')
      .trim()
      .toLowerCase();

    let nextTab: TabType = 'guest';

    if (routePath === 'register' || requestedTab === 'register') {
      nextTab = 'register';
    } else if (requestedTab === 'org') {
      nextTab = 'org';
    }

    if (nextTab !== this.currentTab()) {
      this.switchTab(nextTab);
    }
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

      // SECURITY: enforce that org-affiliated users sign in via the
      // Organization tab with their org access code. Public/guest login is
      // reserved for accounts with no org assignment (role 'guest', no orgId).
      if (this.isOrgAffiliated(profile)) {
        await this.auth.logout();
        this.error.set(
          'This account belongs to an organization. Please use the "Organization" tab and enter your organization code.'
        );
        // Switch the visible tab to organization to guide the user.
        this.switchTab('org');
        return;
      }

      await this.redirectAfterAuth(profile);
    } catch (e: any) {
      this.error.set(this.mapAuthError(e, 'Login failed'));
    } finally {
      this.loading.set(false);
    }
  }

  // SECURITY helper: an account is org-affiliated when it carries an explicit
  // orgId. Such users MUST sign in via the Organization tab so the org access
  // code is verified. Super admins, platform staff and brand-new guests have
  // no orgId and are allowed through the guest tab.
  private isOrgAffiliated(profile: AppProfile): boolean {
    const orgId = String(profile?.orgId ?? '').trim();
    return orgId.length > 0;
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
      const payload = this.registerForm.getRawValue() as RegisterWithEmailPayload & {
        confirmPassword: string;
        acceptTerms: boolean;
      };

      await this.auth.registerWithEmail({
        fullName: payload.fullName!,
        email: payload.email!,
        password: payload.password!,
        phone: payload.phone!,
        country: payload.country!,
        learnerType: payload.learnerType!,
        examGoal: payload.examGoal!,
        organizationName: payload.organizationName || '',
        referralSource: payload.referralSource || '',
        goals: payload.goals || '',
        rememberMe: !!payload.rememberMe,
      });

      const profile = await this.waitForFreshProfile();
      await this.redirectAfterAuth(profile);
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
      await this.redirectAfterAuth(profile);
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

  // optional debug helper
  async debugRedirectCheck() {
    const profile = await this.waitForFreshProfile();
    console.log('PROFILE AFTER LOGIN', profile);
    console.log('REDIRECT TO', resolveDefaultRoute(profile));
    await this.router.navigateByUrl(resolveDefaultRoute(profile), {
      replaceUrl: true,
    });
  }
}