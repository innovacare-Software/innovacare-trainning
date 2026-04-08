import { Component } from '@angular/core';
import { ProgramFormComponent } from './program-form.component';

@Component({
  selector: 'app-program-edit-page',
  standalone: true,
  imports: [ProgramFormComponent],
  template: `<app-program-form mode="edit"></app-program-form>`,
})
export class ProgramEditPage {}
