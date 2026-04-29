import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomInt } from 'crypto';
import * as jwt from 'jsonwebtoken';
import pino from 'pino';
import { Counter, Histogram } from 'prom-client';
import { UserService } from '../user/user.service';
import { AuthCode } from './auth-code.model';
import { AuthCodeRepositoryPort } from './authcode.repository.port';
import { LoginWithCodeDto } from './dto/login-with-code.dto';
import { RequestLoginCodeDto } from './dto/request-login-code.dto';
import { EmailSenderPort } from './email-sender.port';

const logger = pino();
const REQUEST_CODE_MESSAGE =
  'If the email is registered, a login code will be sent.';
const LOGIN_CODE_TTL_MS = Number(process.env.LOGIN_CODE_TTL_MS) || 10 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const DEFAULT_JWT_EXPIRES_IN = '1h';

const authRequestCodeCounter = new Counter({
  name: 'auth_request_code_total',
  help: 'Total login code requests (includes unknown-user requests)',
});

const authLoginSuccessCounter = new Counter({
  name: 'auth_login_success_total',
  help: 'Successful logins',
});

const authLoginFailCounter = new Counter({
  name: 'auth_login_fail_total',
  help: 'Failed logins (wrong code, expired, consumed, blocked, missing)',
});

const authLoginDurationHistogram = new Histogram({
  name: 'auth_login_duration_seconds',
  help: 'Duration of login attempts',
});

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly authCodeRepository: AuthCodeRepositoryPort,
    private readonly emailSender: EmailSenderPort,
  ) {}

  async requestCode(dto: RequestLoginCodeDto): Promise<{ message: string }> {
    authRequestCodeCounter.inc();
    const emailAddress = this.normalizeEmail(dto.emailAddress);

    try {
      await this.userService.findUserByEmailAddress(emailAddress);
    } catch (error) {
      if (error instanceof NotFoundException) {
        logger.info(
          { emailAddress },
          'Passwordless login requested for unknown email',
        );
        return { message: REQUEST_CODE_MESSAGE };
      }
      throw error;
    }

    await this.authCodeRepository.invalidateActiveByEmail(emailAddress);

    const createdAt = new Date();
    const authCode: AuthCode = {
      emailAddress,
      code: this.generateLoginCode(),
      expiresAt: new Date(createdAt.getTime() + LOGIN_CODE_TTL_MS),
      consumedAt: null,
      attempts: 0,
      invalidatedAt: null,
      createdAt,
    };

    await this.authCodeRepository.save(authCode);
    await this.emailSender.sendLoginCode(
      authCode.emailAddress,
      authCode.code,
      authCode.expiresAt,
    );

    return { message: REQUEST_CODE_MESSAGE };
  }

  async login(dto: LoginWithCodeDto): Promise<{ accessToken: string }> {
    const endTimer = authLoginDurationHistogram.startTimer();
    const emailAddress = this.normalizeEmail(dto.emailAddress);

    try {
      this.ensureCodeFormat(dto.code);

      const authCode =
        await this.authCodeRepository.findActiveByEmail(emailAddress);
      if (!authCode) {
        this.throwInvalidCodeException();
      }

      if (authCode.attempts >= MAX_LOGIN_ATTEMPTS) {
        this.throwBlockedCodeException();
      }

      if (authCode.code !== dto.code) {
        await this.authCodeRepository.incrementAttempts(authCode);
        this.throwInvalidCodeException();
      }

      const user = await this.userService.findUserByEmailAddress(emailAddress);
      await this.authCodeRepository.consume(authCode);

      const expiresIn = (process.env.JWT_EXPIRES_IN ||
        DEFAULT_JWT_EXPIRES_IN) as jwt.SignOptions['expiresIn'];
      const accessToken = jwt.sign(
        {
          emailAddress: user.emailAddress,
          companyId: user.companyId,
        },
        this.resolveJwtSecret(),
        {
          expiresIn,
        },
      );

      authLoginSuccessCounter.inc();
      return { accessToken };
    } catch (error) {
      if (error instanceof NotFoundException) {
        this.throwInvalidCodeException();
      }

      throw error;
    } finally {
      endTimer();
    }
  }

  private normalizeEmail(emailAddress: string): string {
    return emailAddress.trim().toLowerCase();
  }

  private ensureCodeFormat(code: string): void {
    if (!/^\d{6}$/.test(code)) {
      throw new BadRequestException('code must be exactly 6 numeric digits');
    }
  }

  private generateLoginCode(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, '0');
  }

  private resolveJwtSecret(): string {
    return process.env.JWT_SECRET || 'dev-secret';
  }

  private throwInvalidCodeException(): never {
    authLoginFailCounter.inc();
    throw new UnauthorizedException('Login code is expired or invalid');
  }

  private throwBlockedCodeException(): never {
    authLoginFailCounter.inc();
    throw new HttpException(
      'Too many failed login attempts',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
