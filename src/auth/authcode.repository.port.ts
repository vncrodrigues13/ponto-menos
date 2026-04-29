import { AuthCode } from './auth-code.model';

export abstract class AuthCodeRepositoryPort {
  abstract save(authCode: AuthCode): Promise<AuthCode>;
  abstract findActiveByEmail(emailAddress: string): Promise<AuthCode | null>;
  abstract consume(authCode: AuthCode): Promise<void>;
  abstract incrementAttempts(authCode: AuthCode): Promise<void>;
  abstract invalidateActiveByEmail(emailAddress: string): Promise<void>;
}
