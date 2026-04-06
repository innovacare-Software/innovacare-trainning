import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguageSwitcherComponent } from '../../../shared/components/language-switcher/language-switcher';
import { AuthService } from '../../../core/auth';

@Component({
  selector: 'app-guest-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TranslateModule, LanguageSwitcherComponent],
  templateUrl: './guest-shell.component.html',
  styleUrls: ['./guest-shell.component.css'],
})
export class GuestShellComponent {
  selectedCompanyType: string = '';
  private translate = inject(TranslateService);

  constructor(
    private router: Router,
    private auth: AuthService
  ) {}

  async logout(): Promise<void> {
    if (window.confirm(this.translate.instant('common.confirmLogout'))) {
      await this.auth.logout();

      // Clear authentication tokens
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');

      // Clear user data
      localStorage.removeItem('userData');
      sessionStorage.removeItem('userData');

      // Redirect to login page
      this.router.navigate(['/login']);
    }
  }
}