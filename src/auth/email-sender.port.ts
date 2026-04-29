export abstract class EmailSenderPort {
  abstract sendLoginCode(
    emailAddress: string,
    code: string,
    expiresAt: Date,
  ): Promise<void>;
}
