import { Component } from '@angular/core';
import { AdminProgramFormComponent } from './admin-program-form.component';

@Component({
  selector: 'app-admin-program-create-page',
  standalone: true,
  imports: [AdminProgramFormComponent],
  template: `<app-admin-program-form mode="create"></app-admin-program-form>`,
})
export class AdminProgramCreatePage {}
