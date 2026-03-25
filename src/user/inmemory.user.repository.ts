import { Injectable } from '@nestjs/common';
import { User } from './user.model';
import { UserRepositoryPort } from './user.repository.port';

@Injectable()
export class InMemoryUserRepository implements UserRepositoryPort {
  private readonly store: User[] = [];

  async save(user: User): Promise<User> {
    this.store.push(user);
    return user;
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return this.store.find((u) => u.emailAddress === email);
  }

  async findAll(): Promise<User[]> {
    return [...this.store];
  }

  async update(user: User): Promise<User> {
    return user;
  }

  async delete(user: User): Promise<User> {
    return user;
  }

  async findById(id: string): Promise<User | null> {
    return null;
  }

  async findBy(query: Partial<User>): Promise<User[]> {
    return [];
  }

  async count(): Promise<number> {
    return this.store.length;
  }
}
