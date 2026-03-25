import { Repository } from '../common/interfaces/repository.interface';
import { PunchinEntry } from './punchin.model';

export abstract class PunchinRepositoryPort implements Repository<PunchinEntry> {
  abstract save(entity: PunchinEntry): Promise<PunchinEntry>;
  abstract update(entity: PunchinEntry): Promise<PunchinEntry>;
  abstract delete(entity: PunchinEntry): Promise<PunchinEntry>;
  abstract findById(id: string): Promise<PunchinEntry | null>;
  abstract findAll(): Promise<PunchinEntry[]>;
  abstract findBy(query: Partial<PunchinEntry>): Promise<PunchinEntry[]>;
  abstract count(): Promise<number>;
}
