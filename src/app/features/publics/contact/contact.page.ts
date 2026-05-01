import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { LanguageService } from '../../../core/language.service';
import { HeroParallaxDirective } from '../../../shared/marketing/hero-parallax.directive';
import { MarketingLeadsService } from '../../../shared/marketing/services/marketing-leads.service';

@Component({
  selector: 'app-contact-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatSnackBarModule, HeroParallaxDirective, RouterLink],
  templateUrl: './contact.page.html',
  styleUrls: ['./contact.page.css'],
})
export class ContactPage {
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);
  private readonly leads = inject(MarketingLeadsService);
  private readonly lang = inject(LanguageService);

  readonly visuals = {
    primary:
      'https://res.cloudinary.com/dtdpx59sc/image/upload/q_auto/f_auto/v1775622326/D12A1509-BD77-4AF8-8D46-36CCEE440BC4_ctl46n.png',
    secondary:
      'https://res.cloudinary.com/dtdpx59sc/image/upload/q_auto/f_auto/v1775622329/3AB0EC16-DEE3-4198-AD16-3F74FF0DCEAB_j85tzf.png',
  };

  readonly contactCards = computed(() => {
    this.lang.currentLang();
    return [
      {
        title: this.t('CONTACT_PAGE.cards.email.title'),
        value: 'hello@innovacare.training',
        note: this.t('CONTACT_PAGE.cards.email.note'),
      },
      {
        title: this.t('CONTACT_PAGE.cards.address.title'),
        value: 'Atlanta, GA',
        note: this.t('CONTACT_PAGE.cards.address.note'),
      },
      {
        title: this.t('CONTACT_PAGE.cards.institutional.title'),
        value: this.t('CONTACT_PAGE.cards.institutional.value'),
        note: this.t('CONTACT_PAGE.cards.institutional.note'),
      },
    ];
  });

  readonly supportPoints = computed(() => {
    this.lang.currentLang();
    return [
      this.t('CONTACT_PAGE.support.point_1'),
      this.t('CONTACT_PAGE.support.point_2'),
      this.t('CONTACT_PAGE.support.point_3'),
      this.t('CONTACT_PAGE.support.point_4'),
    ];
  });

  readonly complianceLinks = computed(() => {
    this.lang.currentLang();
    return [
      {
        label: this.lang.currentLang() === 'fr' ? 'Conditions générales' : 'Terms and Conditions',
        path: this.lang.currentLang() === 'fr' ? '/fr/terms' : '/terms',
      },
      {
        label: this.lang.currentLang() === 'fr' ? 'Politique de confidentialité' : 'Privacy Policy',
        path: this.lang.currentLang() === 'fr' ? '/fr/privacy' : '/privacy',
      },
      {
        label: this.lang.currentLang() === 'fr' ? 'Support institutionnel' : 'Institutional Support',
        path: this.lang.currentLang() === 'fr' ? '/fr/contact' : '/contact',
      },
    ];
  });

  readonly interestOptions = computed(() => {
    this.lang.currentLang();
    return [
      { value: 'NCLEX-RN', label: 'NCLEX-RN' },
      { value: 'NCLEX-PN', label: 'NCLEX-PN' },
      { value: 'FNP', label: 'FNP' },
      { value: 'Institutional Sales', label: this.t('CONTACT_PAGE.interests.institutional_sales') },
      { value: 'Partnership Request', label: this.t('CONTACT_PAGE.interests.partnership_request') },
      { value: 'Support', label: this.t('CONTACT_PAGE.interests.support') },
    ];
  });

  readonly form = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    organization: [''],
    interest: ['NCLEX-RN'],
    message: ['', [Validators.required, Validators.minLength(20)]],
  });

  submitting = false;

  t(key: string): string {
    return this.lang.instant(key);
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.submitting = true;

    try {
      await this.leads.submitLead({
        name: value.name || '',
        email: value.email || '',
        organization: value.organization || '',
        interest: value.interest || 'NCLEX-RN',
        message: value.message || '',
        source: 'contact-page',
      });

      this.snackBar.open(
        this.t('CONTACT_PAGE.form.success'),
        this.t('common.close'),
        { duration: 5000 }
      );

      this.form.reset({
        name: '',
        email: '',
        organization: '',
        interest: 'NCLEX-RN',
        message: '',
      });
    } finally {
      this.submitting = false;
    }
  }
}