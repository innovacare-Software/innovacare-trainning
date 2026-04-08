import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { map, switchMap } from 'rxjs/operators';
import {
  Program,
  ProgramCategory,
  PROGRAM_CATEGORY_LABELS,
  PROGRAM_DELIVERY_MODE_LABELS,
  PROGRAM_LEVEL_LABELS,
} from './program.models';
import { ProgramsService } from './programs.service';

@Component({
  selector: 'app-program-detail-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './program-detail-page.component.html',
  styleUrls: ['./program-detail-page.component.css'],
})
export class ProgramDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly programsService = inject(ProgramsService);

  readonly program = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get('programId') || ''),
      switchMap((programId) => this.programsService.getProgramById(programId))
    ),
    { initialValue: undefined as Program | undefined }
  );

  readonly hasProgram = computed(() => !!this.program());

  readonly bookLink = computed(() => {
    const currentProgram = this.program();
    if (!currentProgram) {
      return ['/programs'];
    }
    return ['/programs', currentProgram.id, 'enroll'];
  });

  categoryLabel(category: ProgramCategory): string {
    return PROGRAM_CATEGORY_LABELS[category] ?? category;
  }

  levelLabel(program: Program): string {
    return PROGRAM_LEVEL_LABELS[program.level] ?? program.level;
  }

  modeLabel(program: Program): string {
    return PROGRAM_DELIVERY_MODE_LABELS[program.deliveryMode] ?? program.deliveryMode;
  }

  priceLabel(program: Program): string {
    const amount =
      typeof program.discountPrice === 'number' && program.discountPrice > 0
        ? program.discountPrice
        : program.price;

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: program.currency,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  seatsLabel(program: Program): string {
    if (program.seatsRemaining == null) {
      return 'Flexible cohort';
    }
    if (program.seatsRemaining <= 0) {
      return 'Waitlist only';
    }
    return `${program.seatsRemaining} seats remaining`;
  }
}
