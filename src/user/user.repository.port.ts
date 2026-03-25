import { Repository } from '../common/interfaces/repository.interface';
import { User } from './user.model';

export abstract class UserRepositoryPort implements Repository<User> {
  abstract save(entity: User): Promise<User>;
  abstract update(entity: User): Promise<User>;
  abstract delete(entity: User): Promise<User>;
  abstract findById(id: string): Promise<User | null>;
  abstract findAll(): Promise<User[]>;
  abstract findBy(query: Partial<User>): Promise<User[]>;
  abstract count(): Promise<number>;
  
  // Domain-specific methods not covered by generic repository
  abstract findByEmail(email: string): Promise<User | undefined>;
}
