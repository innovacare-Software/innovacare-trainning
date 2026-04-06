import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';                 // ✅ pour *ngIf, *ngFor
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms'; // ✅ pour formGroup
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguageSwitcherComponent } from '../../../shared/components/language-switcher/language-switcher';
import { AuthService } from '../../../core/auth';


@Component({
  standalone: true,
  selector: 'app-reset',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule, LanguageSwitcherComponent],     // ✅ AJOUTS ICI
  templateUrl: './reset.html',
  styleUrls: ['./reset.css'],
})
export class ResetComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private translate = inject(TranslateService);

  loading = signal(false);
  success = signal<string | null>(null);
  error = signal<string | null>(null);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  async submit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);
    try {
      await this.auth.resetPassword(this.form.value.email!);
      this.success.set(this.translate.instant('auth.reset.successMessage'));
    } catch {
      this.error.set(this.translate.instant('auth.errors.networkError'));
    } finally {
      this.loading.set(false);
    }
  }
}
