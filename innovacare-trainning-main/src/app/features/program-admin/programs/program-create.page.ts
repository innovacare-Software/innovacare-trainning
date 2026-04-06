import { Component } from '@angular/core';
import { ProgramFormComponent } from './program-form.component';

@Component({
  selector: 'app-program-create-page',
  standalone: true,
  imports: [ProgramFormComponent],
  template: `<app-program-form mode="create"></app-program-form>`,
})
export class ProgramCreatePage {}
