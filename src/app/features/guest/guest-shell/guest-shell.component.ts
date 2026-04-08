import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '../../../core/auth';
import { LanguageSwitcherComponent } from '../../../shared/components/language-switcher/language-switcher.component';

@Component({
  selector: 'app-guest-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TranslocoModule, LanguageSwitcherComponent],
  templateUrl: './guest-shell.component.html',
  styleUrls: ['./guest-shell.component.css'],
})
export class GuestShellComponent {
  private readonly transloco = inject(TranslocoService);
  selectedCompanyType: string = '';

  constructor(
    private router: Router,
    private auth: AuthService
  ) {}

  async logout(): Promise<void> {
    if (window.confirm(this.transloco.translate('shells.guest.confirmLogout'))) {
      await this.auth.logout();

      // Clear authentication tokens
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');
      
      // Clear user data
      localStorage.removeItem('userData');
      sessionStorage.removeItem('userData');
      
      console.log('User confirmed logout');
      
      // Redirect to login page
      this.router.navigate(['/login']);
    } else {
      console.log('User canceled logout');
    }
  }
}