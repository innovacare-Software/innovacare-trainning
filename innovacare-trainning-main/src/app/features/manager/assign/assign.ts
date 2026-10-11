import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Firestore } from '@angular/fire/firestore';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable, map, of, switchMap } from 'rxjs';
import { OrganizationAssignmentsService } from '../../../core/organization/services/organization-assignments.service';
import { OrganizationCoursesService } from '../../../core/organization/services/organization-courses.service';
import { OrganizationUsersService } from '../../../core/organization/services/organization-users.service';
import { AuthService } from '../../../core/auth';


type UserItem = { id: string; displayName?: string; email?: string; role?: string };
type CourseItem = { id: string; title?: string; kind?: string; active?: boolean; durationMin?: number };


@Component({
  selector: 'app-assign',
  imports: [CommonModule, FormsModule],
  templateUrl: './assign.html',
  styleUrl: './assign.css'
})
export class Assign {
  private afs = inject(Firestore);
  private assignments = inject(OrganizationAssignmentsService);
  private orgCourses = inject(OrganizationCoursesService);
  private orgUsers = inject(OrganizationUsersService);
  private auth = inject(AuthService);

  // state
  busy = signal(false);
  notice = signal('');
  error = signal(false);

  private readonly profile = toSignal(this.auth.profile$, { initialValue: null });

  // selections
  selectedUsers = signal<Set<string>>(new Set());
  selectedCourses = signal<Set<string>>(new Set());

  uQuery = signal('');
  cQuery = signal('');

  // data
  users = toSignal(
    this.auth.profile$.pipe(
      switchMap((profile) => {
        const orgId = String(profile?.orgId || '').trim();
        if (!orgId) return of([] as UserItem[]);

        return this.orgUsers.listLearners(orgId).pipe(
          map((rows) => rows.map((u) => ({
            id: u.uid,
            displayName: u.displayName,
            email: u.email,
            role: u.role,
          } as UserItem)))
        );
      })
    ),
    { initialValue: [] }
  );
  courses = toSignal(
    this.auth.profile$.pipe(
      switchMap((profile) => {
        const orgId = String(profile?.orgId || '').trim();
        if (!orgId) return of([] as CourseItem[]);

        return this.orgCourses.listAssigned(orgId).pipe(
          map((rows) => rows.filter((c) => c.active !== false).map((c) => ({
            id: c.courseId,
            title: c.title,
            active: c.active,
          } as CourseItem)))
        );
      })
    ),
    { initialValue: [] }
  );

  filteredUsers = computed(() => {
    const q = this.uQuery().toLowerCase().trim();
    return this.users().filter(u =>
      !q ||
      (u.displayName?.toLowerCase().includes(q)) ||
      (u.email?.toLowerCase().includes(q)) ||
      u.id.toLowerCase().includes(q)
    );
  });

  filteredCourses = computed(() => {
    const q = this.cQuery().toLowerCase().trim();
    return this.courses().filter(c =>
      !q ||
      (c.title?.toLowerCase().includes(q)) ||
      c.id.toLowerCase().includes(q)
    );
  });

  toggleUser(id: string, checked: boolean) {
    const next = new Set(this.selectedUsers());
    if (checked) next.add(id); else next.delete(id);
    this.selectedUsers.set(next);
  }

  toggleCourse(id: string, checked: boolean) {
    const next = new Set(this.selectedCourses());
    if (checked) next.add(id); else next.delete(id);
    this.selectedCourses.set(next);
  }

  async assign() {
    this.notice.set('');
    this.error.set(false);
    this.busy.set(true);

    try {
      const profile = this.profile();
      const orgId = String(profile?.orgId || '').trim();
      if (!orgId) {
        throw new Error('No organization context found.');
      }

      const assignedBy = String(this.auth.currentUid || '').trim() || 'unknown';
      const userIds = Array.from(this.selectedUsers());
      const courseIds = Array.from(this.selectedCourses());

      let ok = 0;
      const failed: Array<{ uid: string; courseId: string; err: unknown }> = [];

      for (const uid of userIds) {
        for (const courseId of courseIds) {
          try {
            await this.assignments.assignCourseToUser(orgId, {
              orgId,
              userId: uid,
              courseId,
              assignedBy,
              status: 'assigned',
            });
            ok++;
          } catch (err) {
            failed.push({ uid, courseId, err });
          }
        }
      }

      if (failed.length === 0) {
        this.notice.set(`Assigned ${ok} enrollment${ok > 1 ? 's' : ''} successfully.`);
      } else {
        this.notice.set(`Assigned ${ok} ok, ${failed.length} failed.`);
        this.error.set(true);
        console.warn('Failed assignments:', failed);
      }
    } catch (e:any) {
      this.notice.set(e?.message || 'Assignment failed.');
      this.error.set(true);
    } finally {
      this.busy.set(false);
    }
  }
  clearSelectedUsers() {
    // create a fresh Set instance and assign via signal setter
    this.selectedUsers.set(new Set<string>());
  }
  
  clearSelectedCourses() {
    this.selectedCourses.set(new Set<string>());
  }
  
}
