import { Module, OnModuleInit } from '@nestjs/common';
import { UserModule } from '../user/user.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailSenderPort } from './email-sender.port';
import { AuthCodeRepositoryPort } from './authcode.repository.port';
import { InMemoryAuthCodeRepository } from './inmemory.authcode.repository';
import { LoggingEmailSender } from './logging-email-sender';

@Module({
  imports: [UserModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: AuthCodeRepositoryPort,
      useClass: InMemoryAuthCodeRepository,
    },
    {
      provide: EmailSenderPort,
      useClass: LoggingEmailSender,
    },
  ],
})
export class AuthModule implements OnModuleInit {
  onModuleInit(): void {
    if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is required in production');
    }
  }
}
