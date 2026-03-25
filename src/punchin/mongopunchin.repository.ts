import { Injectable } from '@nestjs/common';
import { PunchinEntry } from './punchin.model';
import { PunchinRepositoryPort } from './punchin.repository.port';

/**
 * Temporary in-memory repository.
 * Later this can be replaced by a TypeORM/Prisma/etc. implementation.
 */
@Injectable()
export class InMemoryPunchinRepository implements PunchinRepositoryPort {
  private readonly store: PunchinEntry[] = [];

  async save(entry: PunchinEntry): Promise<PunchinEntry> {
    this.store.push(entry);
    return entry;
  }

  async update(entry: PunchinEntry): Promise<PunchinEntry> {
    return entry;
  }

  async delete(entry: PunchinEntry): Promise<PunchinEntry> {
    return entry;
  }

  async findById(id: string): Promise<PunchinEntry | null> {
    return null;
  }

  async findAll(): Promise<PunchinEntry[]> {
    return [...this.store];
  }

  async findBy(query: Partial<PunchinEntry>): Promise<PunchinEntry[]> {
    return this.store.filter(entry => {
      for (const key in query) {
        if (entry[key as keyof PunchinEntry] !== query[key as keyof PunchinEntry]) {
          return false;
        }
      }
      return true;
    });
  }

  async count(): Promise<number> {
    return this.store.length;
  }
}
