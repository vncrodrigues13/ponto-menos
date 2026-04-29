import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthCode } from '../src/auth/auth-code.model';
import { AuthCodeRepositoryPort } from '../src/auth/authcode.repository.port';
import { EmailSenderPort } from '../src/auth/email-sender.port';

type SendLoginCodeMock = jest.Mock<Promise<void>, [string, string, Date]>;
interface LoginResponseBody {
  accessToken: string;
}

describe('Passwordless auth (e2e)', () => {
  let app: INestApplication;
  let authCodeRepository: AuthCodeRepositoryPort;
  let emailSender: { sendLoginCode: SendLoginCodeMock };

  beforeEach(async () => {
    emailSender = {
      sendLoginCode: jest.fn<
        ReturnType<EmailSenderPort['sendLoginCode']>,
        Parameters<EmailSenderPort['sendLoginCode']>
      >(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmailSenderPort)
      .useValue(emailSender)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    authCodeRepository = moduleFixture.get<AuthCodeRepositoryPort>(
      AuthCodeRepositoryPort,
    );
  });

  afterEach(async () => {
    await app.close();
    delete process.env.JWT_EXPIRES_IN;
  });

  it('returns 202 and stores/sends a code for registered users', async () => {
    await registerDefaultUser(app);

    const response = await request(app.getHttpServer())
      .post('/auth/request-code')
      .send({ emailAddress: ' USER@EXAMPLE.COM ' })
      .expect(202);

    expect(response.body).toEqual({
      message: 'If the email is registered, a login code will be sent.',
    });

    const storedCode =
      await authCodeRepository.findActiveByEmail('user@example.com');
    expect(storedCode).not.toBeNull();
    const activeCode = storedCode as AuthCode;
    expect(activeCode.code).toMatch(/^\d{6}$/);
    expect(activeCode.attempts).toBe(0);
    expect(activeCode.expiresAt.getTime()).toBe(
      activeCode.createdAt.getTime() + 10 * 60 * 1000,
    );

    expect(emailSender.sendLoginCode).toHaveBeenCalledWith(
      'user@example.com',
      expect.stringMatching(/^\d{6}$/),
      expect.any(Date),
    );
  });

  it('returns generic 202 for unknown users without storing or sending code', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/request-code')
      .send({ emailAddress: 'missing@example.com' })
      .expect(202);

    expect(response.body).toEqual({
      message: 'If the email is registered, a login code will be sent.',
    });
    expect(
      await authCodeRepository.findActiveByEmail('missing@example.com'),
    ).toBeNull();
    expect(emailSender.sendLoginCode).not.toHaveBeenCalled();
  });

  it('logs in with a valid code and returns JWT claims', async () => {
    await registerDefaultUser(app);
    await request(app.getHttpServer())
      .post('/auth/request-code')
      .send({ emailAddress: 'user@example.com' })
      .expect(202);

    const code = getLastSentCode(emailSender);
    const activeCode =
      await authCodeRepository.findActiveByEmail('user@example.com');

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ emailAddress: ' USER@EXAMPLE.COM ', code })
      .expect(200);

    const body = response.body as LoginResponseBody;
    expect(body.accessToken).toBeDefined();
    const payload = jwt.verify(
      body.accessToken,
      'dev-secret',
    ) as jwt.JwtPayload;
    expect(payload.emailAddress).toBe('user@example.com');
    expect(payload.companyId).toBe(123);
    expect(payload.exp && payload.iat ? payload.exp - payload.iat : null).toBe(
      3600,
    );
    expect(activeCode?.consumedAt).toBeInstanceOf(Date);
  });

  it('uses configured JWT_EXPIRES_IN value', async () => {
    process.env.JWT_EXPIRES_IN = '15m';
    await registerDefaultUser(app);
    await request(app.getHttpServer())
      .post('/auth/request-code')
      .send({ emailAddress: 'user@example.com' })
      .expect(202);

    const code = getLastSentCode(emailSender);
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ emailAddress: 'user@example.com', code })
      .expect(200);

    const body = response.body as LoginResponseBody;
    const payload = jwt.verify(
      body.accessToken,
      'dev-secret',
    ) as jwt.JwtPayload;
    expect(payload.exp && payload.iat ? payload.exp - payload.iat : null).toBe(
      900,
    );
  });

  it('rejects invalid auth payloads with 400', async () => {
    await registerDefaultUser(app);
    await request(app.getHttpServer())
      .post('/auth/request-code')
      .send({})
      .expect(400);
    await request(app.getHttpServer())
      .post('/auth/request-code')
      .send({ emailAddress: 'not-an-email' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ emailAddress: 'user@example.com' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ code: '123456' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ emailAddress: 'not-an-email', code: '123456' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ emailAddress: 'user@example.com', code: 'abc123' })
      .expect(400);
  });

  it('rejects wrong, missing, reused, and blocked codes', async () => {
    await registerDefaultUser(app);
    await request(app.getHttpServer())
      .post('/auth/request-code')
      .send({ emailAddress: 'user@example.com' })
      .expect(202);

    const code = getLastSentCode(emailSender);
    const activeCode = (await authCodeRepository.findActiveByEmail(
      'user@example.com',
    )) as AuthCode;

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ emailAddress: 'user@example.com', code: '000000' })
      .expect(401);
    expect(activeCode.attempts).toBe(1);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ emailAddress: 'user@example.com', code })
      .expect(200);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ emailAddress: 'user@example.com', code })
      .expect(401);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ emailAddress: 'other@example.com', code: '123456' })
      .expect(401);
  });

  it('returns 429 when attempt limit is reached', async () => {
    await registerDefaultUser(app);
    await request(app.getHttpServer())
      .post('/auth/request-code')
      .send({ emailAddress: 'user@example.com' })
      .expect(202);

    const activeCode = (await authCodeRepository.findActiveByEmail(
      'user@example.com',
    )) as AuthCode;
    for (let index = 0; index < 5; index += 1) {
      await authCodeRepository.incrementAttempts(activeCode);
    }

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ emailAddress: 'user@example.com', code: activeCode.code })
      .expect(429);
  });

  it('invalidates previous active code when requesting a new code', async () => {
    await registerDefaultUser(app);
    await request(app.getHttpServer())
      .post('/auth/request-code')
      .send({ emailAddress: 'user@example.com' })
      .expect(202);
    const firstCode =
      await authCodeRepository.findActiveByEmail('user@example.com');

    await request(app.getHttpServer())
      .post('/auth/request-code')
      .send({ emailAddress: 'user@example.com' })
      .expect(202);
    const secondCode =
      await authCodeRepository.findActiveByEmail('user@example.com');

    expect(firstCode).not.toBeNull();
    expect(secondCode).not.toBeNull();
    expect(firstCode?.invalidatedAt).toBeInstanceOf(Date);
    expect(secondCode?.invalidatedAt).toBeNull();
    expect(secondCode?.code).not.toBe(firstCode?.code);
  });
});

async function registerDefaultUser(app: INestApplication): Promise<void> {
  await request(app.getHttpServer())
    .post('/user/register')
    .send({
      fullName: 'Auth User',
      birthdate: '1990-01-01',
      emailAddress: 'user@example.com',
      companyId: 123,
    })
    .expect(201);
}

function getLastSentCode(emailSender: {
  sendLoginCode: SendLoginCodeMock;
}): string {
  const calls = emailSender.sendLoginCode.mock.calls;
  const lastCall = calls[calls.length - 1];
  if (!lastCall) {
    throw new Error('No login code was sent');
  }
  return lastCall[1];
}
