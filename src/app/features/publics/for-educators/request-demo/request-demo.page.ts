import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  signal,
  inject,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { EducatorsService } from '../educators.service';
import { LanguageService } from '../../../../core/language.service';

@Component({
  selector: 'app-request-demo-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, TranslocoModule],
  templateUrl: './request-demo.page.html',
  styleUrls: ['./request-demo.page.css'],
})
export class RequestDemoPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly educatorsService = inject(EducatorsService);
  private readonly lang = inject(LanguageService);

  readonly submitting = signal(false);
  readonly submitted = signal(false);
  readonly errorMsg = signal<string | null>(null);

  form = this.fb.group({
    institutionName: ['', [Validators.required, Validators.minLength(2)]],
    contactName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    studentCount: ['', Validators.required],
    programType: ['', Validators.required],
    message: [''],
  });

  readonly programTypes = [
    { value: 'ADN', labelKey: 'FOR_EDUCATORS.demo_form.options.adn' },
    { value: 'BSN', labelKey: 'FOR_EDUCATORS.demo_form.options.bsn' },
    { value: 'LPN', labelKey: 'FOR_EDUCATORS.demo_form.options.lpn' },
    { value: 'MSN', labelKey: 'FOR_EDUCATORS.demo_form.options.msn' },
    { value: 'OTHER', labelKey: 'FOR_EDUCATORS.demo_form.options.other' },
  ];

  readonly studentCountOptions = [
    { value: 'LESS_THAN_50', labelKey: 'FOR_EDUCATORS.demo_form.options.students_50' },
    { value: '51_TO_200', labelKey: 'FOR_EDUCATORS.demo_form.options.students_200' },
    { value: 'MORE_THAN_200', labelKey: 'FOR_EDUCATORS.demo_form.options.students_more' },
  ];

  ngOnInit(): void {}

  ctrl(name: string): AbstractControl {
    return this.form.get(name)!;
  }

  showError(name: string): boolean {
    const c = this.ctrl(name);
    return c.invalid && (c.dirty || c.touched);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.submitting()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.submitting.set(true);
    this.errorMsg.set(null);

    try {
      const { phone, message, ...required } = this.form.value as {
        institutionName: string;
        contactName: string;
        email: string;
        phone?: string;
        studentCount: string;
        programType: string;
        message?: string;
      };

      await this.educatorsService.submitDemoRequest({
        ...required,
        ...(phone ? { phone } : {}),
        ...(message ? { message } : {}),
      });
      this.submitted.set(true);
    } catch {
      this.errorMsg.set(this.lang.instant('COMMON.error'));
    } finally {
      this.submitting.set(false);
    }
  }
}
