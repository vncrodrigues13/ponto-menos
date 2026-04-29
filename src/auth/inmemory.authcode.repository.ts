import { Injectable } from '@nestjs/common';
import { AuthCode } from './auth-code.model';
import { AuthCodeRepositoryPort } from './authcode.repository.port';

@Injectable()
export class InMemoryAuthCodeRepository implements AuthCodeRepositoryPort {
  private readonly store: AuthCode[] = [];

  save(authCode: AuthCode): Promise<AuthCode> {
    this.store.push(authCode);
    return Promise.resolve(authCode);
  }

  findActiveByEmail(emailAddress: string): Promise<AuthCode | null> {
    const now = Date.now();

    for (let index = this.store.length - 1; index >= 0; index -= 1) {
      const candidate = this.store[index];
      const isActive =
        candidate.emailAddress === emailAddress &&
        candidate.consumedAt === null &&
        candidate.invalidatedAt === null &&
        candidate.expiresAt.getTime() > now;

      if (isActive) {
        return Promise.resolve(candidate);
      }
    }

    return Promise.resolve(null);
  }

  consume(authCode: AuthCode): Promise<void> {
    authCode.consumedAt = new Date();
    return Promise.resolve();
  }

  incrementAttempts(authCode: AuthCode): Promise<void> {
    authCode.attempts += 1;
    return Promise.resolve();
  }

  async invalidateActiveByEmail(emailAddress: string): Promise<void> {
    const activeCode = await this.findActiveByEmail(emailAddress);
    if (!activeCode) {
      return;
    }

    activeCode.invalidatedAt = new Date();
  }
}
