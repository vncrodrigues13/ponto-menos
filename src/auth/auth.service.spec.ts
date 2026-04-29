/* eslint-disable @typescript-eslint/unbound-method */
import {
  BadRequestException,
  HttpException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as jwt from 'jsonwebtoken';
import { UserService } from '../user/user.service';
import { AuthCode } from './auth-code.model';
import { AuthCodeRepositoryPort } from './authcode.repository.port';
import { AuthService } from './auth.service';
import { EmailSenderPort } from './email-sender.port';
import { InMemoryAuthCodeRepository } from './inmemory.authcode.repository';

jest.mock('prom-client', () => {
  const inc = jest.fn();
  const startTimer = jest.fn().mockReturnValue(jest.fn());
  return {
    Counter: jest.fn().mockImplementation(() => ({ inc })),
    Histogram: jest.fn().mockImplementation(() => ({ startTimer })),
  };
});

jest.mock('pino', () => {
  const info = jest.fn();
  return jest.fn().mockReturnValue({ info });
});

describe('AuthService', () => {
  let service: AuthService;
  let repository: InMemoryAuthCodeRepository;
  let userService: jest.Mocked<UserService>;
  let emailSender: jest.Mocked<EmailSenderPort>;
  let findUserByEmailAddressMock: jest.Mock;
  let sendLoginCodeMock: jest.Mock;

  beforeEach(async () => {
    delete process.env.JWT_SECRET;
    delete process.env.JWT_EXPIRES_IN;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        InMemoryAuthCodeRepository,
        {
          provide: AuthCodeRepositoryPort,
          useExisting: InMemoryAuthCodeRepository,
        },
        {
          provide: UserService,
          useValue: {
            findUserByEmailAddress: jest.fn(),
          },
        },
        {
          provide: EmailSenderPort,
          useValue: {
            sendLoginCode: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    repository = module.get<InMemoryAuthCodeRepository>(
      InMemoryAuthCodeRepository,
    );
    userService = module.get(UserService);
    emailSender = module.get(EmailSenderPort);
    findUserByEmailAddressMock =
      userService.findUserByEmailAddress as jest.Mock;
    sendLoginCodeMock = emailSender.sendLoginCode as jest.Mock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('stores and sends a login code for registered users', async () => {
    userService.findUserByEmailAddress.mockResolvedValue({
      fullName: 'User',
      birthdate: new Date('1990-01-01'),
      emailAddress: 'user@example.com',
      companyId: 123,
    });

    const response = await service.requestCode({
      emailAddress: ' USER@EXAMPLE.COM ',
    });

    expect(response).toEqual({
      message: 'If the email is registered, a login code will be sent.',
    });
    expect(findUserByEmailAddressMock).toHaveBeenCalledWith('user@example.com');
    expect(sendLoginCodeMock).toHaveBeenCalledWith(
      'user@example.com',
      expect.stringMatching(/^\d{6}$/),
      expect.any(Date),
    );

    const activeCode = await repository.findActiveByEmail('user@example.com');
    expect(activeCode).not.toBeNull();
    const storedCode = activeCode as AuthCode;
    expect(storedCode.code).toMatch(/^\d{6}$/);
    expect(storedCode.attempts).toBe(0);
    expect(storedCode.expiresAt.getTime()).toBe(
      storedCode.createdAt.getTime() + 10 * 60 * 1000,
    );
  });

  it('returns generic response for unknown users without storing code', async () => {
    userService.findUserByEmailAddress.mockRejectedValue(
      new NotFoundException('User with email missing@example.com not found'),
    );

    const response = await service.requestCode({
      emailAddress: 'missing@example.com',
    });

    expect(response).toEqual({
      message: 'If the email is registered, a login code will be sent.',
    });
    expect(sendLoginCodeMock).not.toHaveBeenCalled();
    expect(
      await repository.findActiveByEmail('missing@example.com'),
    ).toBeNull();
  });

  it('logs in with a valid code and returns a JWT with emailAddress and companyId', async () => {
    const code = await saveCode(repository, 'user@example.com', '123456');
    userService.findUserByEmailAddress.mockResolvedValue({
      fullName: 'User',
      birthdate: new Date('1990-01-01'),
      emailAddress: 'user@example.com',
      companyId: 123,
    });

    const response = await service.login({
      emailAddress: 'user@example.com',
      code: '123456',
    });
    const payload = jwt.verify(
      response.accessToken,
      'dev-secret',
    ) as jwt.JwtPayload;

    expect(payload.emailAddress).toBe('user@example.com');
    expect(payload.companyId).toBe(123);
    expect(payload.exp && payload.iat ? payload.exp - payload.iat : null).toBe(
      3600,
    );
    expect(code.consumedAt).toBeInstanceOf(Date);
  });

  it('uses configured JWT expiration', async () => {
    process.env.JWT_EXPIRES_IN = '15m';
    await saveCode(repository, 'user@example.com', '123456');
    userService.findUserByEmailAddress.mockResolvedValue({
      fullName: 'User',
      birthdate: new Date('1990-01-01'),
      emailAddress: 'user@example.com',
      companyId: 123,
    });

    const response = await service.login({
      emailAddress: 'user@example.com',
      code: '123456',
    });
    const payload = jwt.verify(
      response.accessToken,
      'dev-secret',
    ) as jwt.JwtPayload;

    expect(payload.exp && payload.iat ? payload.exp - payload.iat : null).toBe(
      900,
    );
  });

  it('normalizes email before login', async () => {
    await saveCode(repository, 'user@example.com', '123456');
    userService.findUserByEmailAddress.mockResolvedValue({
      fullName: 'User',
      birthdate: new Date('1990-01-01'),
      emailAddress: 'user@example.com',
      companyId: 123,
    });

    const response = await service.login({
      emailAddress: ' USER@EXAMPLE.COM ',
      code: '123456',
    });
    const payload = jwt.verify(
      response.accessToken,
      'dev-secret',
    ) as jwt.JwtPayload;

    expect(findUserByEmailAddressMock).toHaveBeenCalledWith('user@example.com');
    expect(payload.emailAddress).toBe('user@example.com');
  });

  it('rejects invalid code format with 400 and does not increment attempts', async () => {
    const code = await saveCode(repository, 'user@example.com', '123456');

    await expect(
      service.login({ emailAddress: 'user@example.com', code: 'abc123' }),
    ).rejects.toThrow(BadRequestException);

    expect(code.attempts).toBe(0);
  });

  it('rejects missing active code with 401', async () => {
    await expect(
      service.login({ emailAddress: 'user@example.com', code: '123456' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('increments attempts when code is wrong', async () => {
    const code = await saveCode(repository, 'user@example.com', '123456');

    await expect(
      service.login({ emailAddress: 'user@example.com', code: '000000' }),
    ).rejects.toThrow(UnauthorizedException);

    expect(code.attempts).toBe(1);
    expect(code.consumedAt).toBeNull();
  });

  it('rejects expired code at the boundary without incrementing attempts', async () => {
    const now = new Date();
    const code = await saveCode(repository, 'user@example.com', '123456', {
      createdAt: new Date(now.getTime() - 10 * 60 * 1000),
      expiresAt: now,
    });

    await expect(
      service.login({ emailAddress: 'user@example.com', code: '123456' }),
    ).rejects.toThrow(UnauthorizedException);

    expect(code.attempts).toBe(0);
  });

  it('rejects reused code', async () => {
    const code = await saveCode(repository, 'user@example.com', '123456', {
      consumedAt: new Date(),
    });

    await expect(
      service.login({ emailAddress: 'user@example.com', code: '123456' }),
    ).rejects.toThrow(UnauthorizedException);

    expect(code.attempts).toBe(0);
  });

  it('rejects blocked code with 429', async () => {
    const code = await saveCode(repository, 'user@example.com', '123456', {
      attempts: 5,
    });

    const activeCode = await repository.findActiveByEmail('user@example.com');
    expect(activeCode?.code).toBe('123456');

    try {
      await service.login({ emailAddress: 'user@example.com', code: '123456' });
      fail('expected a 429 error');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(429);
    }

    expect(code.attempts).toBe(5);
    expect(code.consumedAt).toBeNull();
  });

  it('invalidates previous active code when requesting a new one', async () => {
    jest
      .spyOn(service as any, 'generateLoginCode')
      .mockReturnValueOnce('123456')
      .mockReturnValueOnce('654321');
    userService.findUserByEmailAddress.mockResolvedValue({
      fullName: 'User',
      birthdate: new Date('1990-01-01'),
      emailAddress: 'user@example.com',
      companyId: 123,
    });

    await service.requestCode({ emailAddress: 'user@example.com' });
    const firstCode = await repository.findActiveByEmail('user@example.com');

    await service.requestCode({ emailAddress: 'user@example.com' });
    const secondCode = await repository.findActiveByEmail('user@example.com');

    expect(firstCode).not.toBeNull();
    expect(secondCode).not.toBeNull();
    expect(firstCode?.invalidatedAt).toBeInstanceOf(Date);
    expect(secondCode?.code).toBe('654321');
  });
});

async function saveCode(
  repository: InMemoryAuthCodeRepository,
  emailAddress: string,
  code: string,
  overrides: Partial<AuthCode> = {},
): Promise<AuthCode> {
  const now = new Date();
  const authCode: AuthCode = {
    emailAddress,
    code,
    createdAt: now,
    expiresAt: new Date(now.getTime() + 10 * 60 * 1000),
    consumedAt: null,
    attempts: 0,
    invalidatedAt: null,
    ...overrides,
  };

  await repository.save(authCode);
  return authCode;
}
