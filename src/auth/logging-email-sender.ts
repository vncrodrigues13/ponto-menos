import { Injectable } from '@nestjs/common';
import pino from 'pino';
import { EmailSenderPort } from './email-sender.port';

const logger = pino();

@Injectable()
export class LoggingEmailSender implements EmailSenderPort {
  sendLoginCode(
    emailAddress: string,
    code: string,
    expiresAt: Date,
  ): Promise<void> {
    logger.info(
      {
        emailAddress,
        code,
        expiresAt: expiresAt.toISOString(),
      },
      'Login code generated for local delivery',
    );
    return Promise.resolve();
  }
}
