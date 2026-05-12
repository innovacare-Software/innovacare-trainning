import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, switchMap } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { UserRole } from '../models/super-admin.models';
import { SuperAdminUsersService } from '../services/super-admin-users';


@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './users.html',
  styleUrls: ['./users.css']
})
export class Users {
  private usersSvc = inject(SuperAdminUsersService);

  search = signal('');
  roleFilter = signal<UserRole | 'all'>('all');
  refreshTrigger = signal(0);
  notice = signal('');

  users = toSignal(
    combineLatest([
      toObservable(this.search),
      toObservable(this.roleFilter),
      toObservable(this.refreshTrigger),
    ]).pipe(
      switchMap(([search, role]) => this.usersSvc.listFiltered(search, role))
    ),
    { initialValue: [] }
  );

  refresh() {
    this.refreshTrigger.update(v => v + 1);
  }

  isUserRole(value: string): value is UserRole {
    return ['super_admin', 'admin', 'manager', 'learner', 'guest', 'instructor', 'tutor', 'staff', 'programAdmin', 'programStaff', 'programLearner'].includes(value);
  }

 async changeRole(uid: string, role: string) {
  try {
    await this.usersSvc.setRole(uid, role as UserRole);
    this.notice.set('Role updated.');
    this.refresh();
  } catch (e: any) {
    this.notice.set(e?.message || 'Failed to update role.');
  }
}

  async toggleProgramAdmin(uid: string, current: boolean) {
    try {
      await this.usersSvc.setProgramAdmin(uid, !current);
      this.notice.set(`Program Admin ${!current ? 'enabled' : 'disabled'}.`);
      this.refresh();
    } catch (e: any) {
      this.notice.set(e?.message || 'Failed to update Program Admin access.');
    }
  }

  async toggleProgramStaff(uid: string, current: boolean) {
    try {
      await this.usersSvc.setProgramStaff(uid, !current);
      this.notice.set(`Program Staff ${!current ? 'enabled' : 'disabled'}.`);
      this.refresh();
    } catch (e: any) {
      this.notice.set(e?.message || 'Failed to update Program Staff access.');
    }
  }

  async normalizeUser(uid: string) {
    try {
      const role = await this.usersSvc.normalizeProgramAccessRole(uid);
      this.notice.set(`Program access normalized. Current explicit role: ${role}.`);
      this.refresh();
    } catch (e: any) {
      this.notice.set(e?.message || 'Failed to normalize program access role.');
    }
  }

  async normalizeAllUsers() {
    try {
      const result = await this.usersSvc.normalizeProgramAccessRoles();
      this.notice.set(result.updated ? `${result.updated} user profiles normalized.` : 'No legacy program-access profiles needed normalization.');
      this.refresh();
    } catch (e: any) {
      this.notice.set(e?.message || 'Failed to normalize legacy program-access roles.');
    }
  }

  async toggleActive(uid: string, current: boolean) {
    try {
      await this.usersSvc.setActive(uid, !current);
      this.notice.set('User status updated.');
      this.refresh();
    } catch (e: any) {
      this.notice.set(e?.message || 'Failed to update user.');
    }
  }
}