import { Injectable, inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  Firestore,
  collection,
  getDocs,
  limit,
  query,
  where,
} from '@angular/fire/firestore';
import { CreateProgramPayload } from './program.models';
import { DEFAULT_PROGRAMS_SEED } from './programs.seed';
import { ProgramsService } from './programs.service';

@Injectable({ providedIn: 'root' })
export class ProgramsSeedService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(Auth);
  private readonly programsService = inject(ProgramsService);

  getDefaultProgramsSeed(): ReadonlyArray<CreateProgramPayload> {
    return DEFAULT_PROGRAMS_SEED;
  }

  async seedDefaultPrograms(orgId: string | null = null): Promise<string[]> {
    const currentUser = this.auth.currentUser;
    if (!currentUser?.uid) {
      throw new Error('Sign in with an admin account before seeding programs.');
    }

    const createdIds: string[] = [];

    for (const seedProgram of DEFAULT_PROGRAMS_SEED) {
      const existingProgramQuery = query(
        collection(this.firestore, 'programs'),
        where('slug', '==', seedProgram.slug),
        limit(1)
      );
      const existing = await getDocs(existingProgramQuery);
      if (!existing.empty) {
        createdIds.push(existing.docs[0].id);
        continue;
      }

      const createdId = await this.programsService.createProgram({
        ...seedProgram,
        ownerId: currentUser.uid,
        orgId,
      });
      createdIds.push(createdId);
    }

    return createdIds;
  }
}
