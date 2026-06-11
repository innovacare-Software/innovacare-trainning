import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { filter, take, timeout } from 'rxjs/operators';
import { AuthService } from '../../../core/auth';
import { AuthRedirectService } from '../../../core/auth-redirect.service';

@Component({
  selector: 'app-force-password-change-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="force-password-page">
      <article class="card">
        <p class="eyebrow">Security check</p>
        <h1>Change your temporary password</h1>
        <p class="intro">
          Your administrator assigned a temporary password. You must create a new personal password before accessing your space.
        </p>

        <form [formGroup]="form" (ngSubmit)="submit()" class="form-grid">
          <label>
            New password
            <input type="password" formControlName="password" placeholder="Minimum 8 characters" />
          </label>

          <label>
            Confirm password
            <input type="password" formControlName="confirmPassword" placeholder="Repeat the new password" />
          </label>

          <p class="error" *ngIf="error()">{{ error() }}</p>
          <p class="success" *ngIf="success()">{{ success() }}</p>

          <button class="btn" type="submit" [disabled]="loading()">
            {{ loading() ? 'Updating…' : 'Update password' }}
          </button>
        </form>
      </article>
    </section>
  `,
  styles: [`
    .force-password-page { min-height: 100dvh; display: grid; place-items: center; padding: 1.5rem; background: linear-gradient(180deg, #f4f8fc 0%, #e8f0f8 100%); }
    .card { width: min(100%, 520px); background: #fff; border: 1px solid #d9e5f1; border-radius: 1.1rem; padding: 1.4rem; box-shadow: 0 18px 45px rgba(18, 57, 91, 0.12); }
    .eyebrow { margin: 0 0 0.35rem; text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.72rem; font-weight: 800; color: #335f88; }
    h1 { margin: 0; color: #12395b; }
    .intro { margin: 0.6rem 0 1rem; color: #5d7691; line-height: 1.5; }
    .form-grid { display: grid; gap: 0.8rem; }
    label { display: grid; gap: 0.3rem; color: #21496f; font-weight: 600; }
    input { border: 1px solid #c8daea; border-radius: 0.75rem; padding: 0.75rem 0.85rem; font-size: 0.95rem; }
    .btn { border: 0; border-radius: 0.8rem; padding: 0.8rem 1rem; font-weight: 700; color: #fff; background: linear-gradient(135deg, #1a74c8, #0f5ca6); cursor: pointer; }
    .btn:disabled { opacity: 0.7; cursor: wait; }
    .error { margin: 0; color: #8a3344; background: #fef2f4; border: 1px solid #efc5ce; padding: 0.7rem 0.8rem; border-radius: 0.7rem; }
    .success { margin: 0; color: #0f6c46; background: #effcf6; border: 1px solid #9dd7be; padding: 0.7rem 0.8rem; border-radius: 0.7rem; }
  `],
})
export class ForcePasswordChangePage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly authRedirect = inject(AuthRedirectService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  readonly form = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  });

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { password, confirmPassword } = this.form.getRawValue();
    if (password !== confirmPassword) {
      this.error.set('Passwords do not match.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    try {
      await this.auth.completeTemporaryPasswordChange(password || '');
      this.success.set('Password updated. Redirecting…');

      const profile = await firstValueFrom(
        this.auth.profile$.pipe(
          filter((value) => !!value && value.requirePasswordChange !== true),
          take(1),
          timeout(10000),
        )
      );

      await this.authRedirect.redirectAfterLogin(profile);
    } catch (error: any) {
      if (error?.message?.includes('auth/requires-recent-login')) {
        await this.auth.logout();
        await this.router.navigate(['/login']);
        return;
      }
      this.error.set(error?.message || 'Unable to update password.');
    } finally {
      this.loading.set(false);
    }
  }
}