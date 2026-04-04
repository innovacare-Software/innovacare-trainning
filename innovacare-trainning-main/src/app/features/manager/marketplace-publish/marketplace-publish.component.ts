import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth';
import { MarketplaceAdminService } from '../services/marketplace-admin.service';

@Component({
  selector: 'app-marketplace-publish',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatSnackBarModule],
  templateUrl: './marketplace-publish.component.html',
  styleUrl: './marketplace-publish.component.css',
})
export class MarketplacePublishComponent {
  private fb = inject(FormBuilder);
  private marketplaceAdmin = inject(MarketplaceAdminService);
  private snackBar = inject(MatSnackBar);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = false;
  isSuperAdmin = false;

  constructor() {
    this.auth.profile$.subscribe((p) => {
      this.isSuperAdmin = p?.role === 'super_admin';
    });
  }

  form = this.fb.nonNullable.group({
    courseId: ['', [Validators.required]],
    price: [49, [Validators.required, Validators.min(0.01)]],
    currency: ['USD', [Validators.required, Validators.minLength(3)]],
    stripePriceId: ['', [Validators.required]],
    isPublic: [true],
  });

  async publish(): Promise<void> {
    if (!this.isSuperAdmin) {
      this.snackBar.open('Action reservee au super admin.', 'Fermer', { duration: 4000 });
      this.router.navigate(['/super-admin/dashboard']);
      return;
    }

    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    try {
      const value = this.form.getRawValue();
      const result = await this.marketplaceAdmin.publishCourse({
        courseId: value.courseId.trim(),
        price: Number(value.price),
        currency: value.currency.trim().toUpperCase(),
        stripePriceId: value.stripePriceId.trim(),
        isPublic: !!value.isPublic,
      });
      const res = result.data;

      if (res?.ok && res?.alreadyExists) {
        this.snackBar.open('Offre deja existante pour ce cours.', 'Fermer', { duration: 4000 });
      } else if (res?.ok) {
        this.snackBar.open('Cours publie dans le marketplace.', 'Fermer', { duration: 4000 });
      } else {
        this.snackBar.open('Publication non confirmee.', 'Fermer', { duration: 4000 });
      }
    } catch (error) {
      console.error('Erreur publication marketplace', error);
      this.snackBar.open('Echec de publication. Verifiez les droits admin.', 'Fermer', {
        duration: 5000,
      });
    } finally {
      this.loading = false;
    }
  }
}
