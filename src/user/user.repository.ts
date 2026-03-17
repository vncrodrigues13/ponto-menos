import { Injectable } from '@nestjs/common';
import { User } from './user.model';

@Injectable()
export class UserRepository {
  private readonly store: User[] = [];

  create(user: User): User {
    this.store.push(user);
    return user;
  }

  findByEmail(email: string): User | undefined {
    return this.store.find((u) => u.emailAddress === email);
  }

  findAll(): User[] {
    return [...this.store];
  }
}
