import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-guest-shell',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './guest-shell.component.html',
  styleUrls: ['./guest-shell.component.css'],
})
export class GuestShellComponent {}