import { Injectable } from '@nestjs/common';
import { PunchinEntry } from './punchin.model';

/**
 * Temporary in-memory repository.
 * Later this can be replaced by a TypeORM/Prisma/etc. implementation.
 */
@Injectable()
export class PunchinRepository {
  private readonly store: PunchinEntry[] = [];

  create(entry: PunchinEntry): PunchinEntry {
    this.store.push(entry);
    return entry;
  }

  findAll(): PunchinEntry[] {
    return [...this.store];
  }

  // more methods (findByToken, delete, etc.) could be added as needed
}
