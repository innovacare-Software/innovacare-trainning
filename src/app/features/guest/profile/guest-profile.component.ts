import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Auth } from '@angular/fire/auth';
import { Storage, getDownloadURL, ref, uploadBytes } from '@angular/fire/storage';
import { ProfileService } from '../../../core/profile.service';
import { AppUserProfile } from '../../../data/app-user.model';


interface ProfileData {
  fullName: string;
  email: string;
  phone: string;
  bio: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  notifications: boolean;
  marketing: boolean;
}



@Component({
  selector: 'app-guest-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="profile-container">
      <section class="profile-header">
        <h1>Guest Profile</h1>
        <p class="subtitle">Manage your profile information and preferences</p>
      </section>

      <div class="profile-content">
        <div class="profile-avatar">
          <div class="avatar-placeholder">
            <img *ngIf="avatarUrl" [src]="avatarUrl" alt="Avatar" class="avatar-image" />
            <span *ngIf="!avatarUrl">{{ avatarInitial }}</span>
          </div>
          <input
            #avatarInput
            type="file"
            accept="image/*"
            style="display: none"
            (change)="onAvatarSelected($event)"
          />
          <button type="button" class="btn-upload" (click)="avatarInput.click()" [disabled]="avatarUploading">
            {{ avatarUploading ? 'Uploading...' : 'Change Avatar' }}
          </button>
        </div>

        <form [formGroup]="profileForm" class="profile-form" (ngSubmit)="onSaveChanges()">
          <div class="form-section">
            <h2>Personal Information</h2>
            
            <div class="form-group">
              <label>Full Name</label>
              <input type="text" formControlName="fullName" placeholder="Enter your full name" />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Email</label>
                <input type="email" formControlName="email" placeholder="Enter your email" />
              </div>
              <div class="form-group">
                <label>Phone</label>
                <input type="tel" formControlName="phone" placeholder="Enter your phone number" />
              </div>
            </div>

            <div class="form-group">
              <label>Bio</label>
              <textarea formControlName="bio" placeholder="Tell us about yourself" rows="4"></textarea>
            </div>
          </div>

          <div class="form-section">
            <h2>Address</h2>
            
            <div class="form-group">
              <label>Street Address</label>
              <input type="text" formControlName="streetAddress" placeholder="Enter street address" />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>City</label>
                <input type="text" formControlName="city" placeholder="Enter city" />
              </div>
              <div class="form-group">
                <label>State/Province</label>
                <input type="text" formControlName="state" placeholder="Enter state" />
              </div>
              <div class="form-group">
                <label>Zip Code</label>
                <input type="text" formControlName="zipCode" placeholder="Enter zip code" />
              </div>
            </div>
          </div>

          <div class="form-section">
            <h2>Preferences</h2>
            
            <div class="form-group checkbox">
              <input type="checkbox" id="notifications" formControlName="notifications" />
              <label for="notifications">Receive email notifications</label>
            </div>

            <div class="form-group checkbox">
              <input type="checkbox" id="marketing" formControlName="marketing" />
              <label for="marketing">Subscribe to marketing emails</label>
            </div>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" (click)="onCancel()">Cancel</button>
            <button type="submit" class="btn btn-primary" [disabled]="profileForm.invalid">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .profile-container {
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
    }

    .profile-header {
      margin-bottom: 30px;
      border-bottom: 2px solid #f0f0f0;
      padding-bottom: 20px;
    }

    .profile-header h1 {
      font-size: 28px;
      font-weight: 600;
      color: #333;
      margin: 0 0 8px 0;
    }

    .subtitle {
      color: #666;
      font-size: 14px;
      margin: 0;
    }

    .profile-content {
      display: grid;
      grid-template-columns: 200px 1fr;
      gap: 40px;
      background: #fff;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .profile-avatar {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 15px;
    }

    .avatar-placeholder {
      width: 150px;
      height: 150px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 48px;
      font-weight: bold;
      color: white;
      overflow: hidden;
    }

    .avatar-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .btn-upload {
      padding: 8px 16px;
      background-color: #f0f0f0;
      border: 1px solid #ddd;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      color: #666;
      transition: all 0.3s ease;
    }

    .btn-upload:hover {
      background-color: #e8e8e8;
      border-color: #ccc;
    }

    .profile-form {
      display: flex;
      flex-direction: column;
      gap: 30px;
    }

    .form-section {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .form-section h2 {
      font-size: 16px;
      font-weight: 600;
      color: #333;
      margin: 0 0 10px 0;
      border-bottom: 1px solid #f0f0f0;
      padding-bottom: 10px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-group label {
      font-size: 13px;
      font-weight: 500;
      color: #333;
    }

    .form-group input,
    .form-group textarea {
      padding: 10px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      font-family: inherit;
      transition: border-color 0.2s;
    }

    .form-group input:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .form-group textarea {
      resize: vertical;
    }

    .form-group.checkbox {
      flex-direction: row;
      align-items: center;
      gap: 8px;
    }

    .form-group.checkbox input {
      width: 18px;
      height: 18px;
      cursor: pointer;
      margin: 0;
    }

    .form-group.checkbox label {
      margin: 0;
      cursor: pointer;
    }

    .form-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
    }

    .form-actions {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #f0f0f0;
    }

    .btn {
      padding: 10px 24px;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-primary {
      background-color: #667eea;
      color: white;
    }

    .btn-primary:hover {
      background-color: #5568d3;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .btn-secondary {
      background-color: #f0f0f0;
      color: #333;
      border: 1px solid #ddd;
    }

    .btn-secondary:hover {
      background-color: #e8e8e8;
    }

    @media (max-width: 768px) {
      .profile-content {
        grid-template-columns: 1fr;
        padding: 20px;
        gap: 20px;
      }

      .form-row {
        grid-template-columns: 1fr;
      }

      .form-actions {
        flex-direction: column-reverse;
      }

      .btn {
        width: 100%;
      }
    }
  `],
})
export class GuestProfileComponent implements OnInit, OnDestroy {
  private profileService = inject(ProfileService);
  private fb = inject(FormBuilder);
  private auth = inject(Auth);
  private storage = inject(Storage);

  profileForm!: FormGroup;
  private destroy$ = new Subject<void>();
  private currentUid: string | null = null;
  avatarUrl: string | null = null;
  avatarUploading = false;

  get avatarInitial(): string {
    const fullName = (this.profileForm?.get('fullName')?.value ?? '').toString().trim();
    if (fullName.length > 0) return fullName[0].toUpperCase();

    const email = (this.profileForm?.get('email')?.value ?? '').toString().trim();
    if (email.length > 0) return email[0].toUpperCase();

    return 'G';
  }

  constructor() {
    this.profileForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.pattern(/^[\d\s\-\+\(\)]+$/)],
      bio: ['', Validators.maxLength(500)],
      streetAddress: [''],
      city: [''],
      state: [''],
      zipCode: [''],
      notifications: [false],
      marketing: [false]
    });
  }

  ngOnInit(): void {
    const uid = this.auth.currentUser?.uid ?? null;
    if (!uid) {
      return;
    }

    this.currentUid = uid;

    this.profileService.getProfileData(uid)
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: AppUserProfile | null) => {
        if (!data) {
          return;
        }

        const raw = data as any;
        this.profileForm.patchValue({
          fullName: raw.displayName ?? '',
          email: data.email,
          phone: raw.phone ?? '',
          bio: raw.bio ?? '',
          streetAddress: raw.streetAddress ?? '',
          city: raw.city ?? '',
          state: raw.state ?? '',
          zipCode: raw.zipCode ?? '',
          notifications: raw.notifications ?? false,
          marketing: raw.marketing ?? false
        }, { emitEvent: false });

        this.avatarUrl = raw.photoURL ?? null;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async onSaveChanges(): Promise<void> {
    if (!this.profileForm.valid || !this.currentUid) {
      return;
    }

    const formValue = this.profileForm.value as ProfileData;

    await this.profileService.updateProfileData(this.currentUid, {
      displayName: formValue.fullName,
      email: formValue.email,
      phone: formValue.phone,
      bio: formValue.bio,
      streetAddress: formValue.streetAddress,
      city: formValue.city,
      state: formValue.state,
      zipCode: formValue.zipCode,
      notifications: formValue.notifications,
      marketing: formValue.marketing,
    } as any);

    console.log('Profile updated successfully');
  }

  async onAvatarSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.currentUid) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      return;
    }

    this.avatarUploading = true;

    try {
      const safeName = file.name.replace(/\s+/g, '_');
      const path = `avatars/${this.currentUid}/${Date.now()}_${safeName}`;
      const storageRef = ref(this.storage, path);

      await uploadBytes(storageRef, file, { contentType: file.type });
      const photoURL = await getDownloadURL(storageRef);

      this.avatarUrl = photoURL;
      await this.profileService.updateProfileData(this.currentUid, { photoURL });
    } finally {
      this.avatarUploading = false;
      input.value = '';
    }
  }

  onCancel(): void {
    this.profileForm.reset();
  }
}