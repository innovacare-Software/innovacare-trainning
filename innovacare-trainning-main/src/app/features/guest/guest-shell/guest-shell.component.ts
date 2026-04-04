import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth';

@Component({
  selector: 'app-guest-shell',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './guest-shell.component.html',
  styleUrls: ['./guest-shell.component.css'],
})
export class GuestShellComponent {
  selectedCompanyType: string = '';

  constructor(
    private router: Router,
    private auth: AuthService
  ) {}

  async logout(): Promise<void> {
    if (window.confirm('Are you sure you want to log out?')) {
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