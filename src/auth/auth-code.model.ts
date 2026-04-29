export interface AuthCode {
  emailAddress: string;
  code: string;
  expiresAt: Date;
  consumedAt: Date | null;
  attempts: number;
  invalidatedAt: Date | null;
  createdAt: Date;
}
