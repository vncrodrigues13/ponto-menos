import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import * as jwt from 'jsonwebtoken';

describe('List Punchins Feature (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('create user, create punchins, and list them', async () => {
    const emailAddress = 'test@example.com';
    const token = jwt.sign({ emailAddress }, 'dev-secret');

    // 1. Create a User
    await request(app.getHttpServer())
      .post('/user/register')
      .send({
        fullName: 'Test User',
        birthdate: '1990-01-01',
        emailAddress: emailAddress,
        companyId: 'comp-1', // Not sure if this is required, but it should be based on CreateUserDto
      })
      .expect(201);

    // 2. Create Punchin
    await request(app.getHttpServer())
      .post('/punchin')
      .send({
        timestamp: new Date().toISOString(),
        platform: 'web',
        authToken: token,
      })
      .expect(201);

    // 3. List Punchins
    const res = await request(app.getHttpServer())
      .get('/punchin')
      .query({ emailAddress })
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].userEmail).toBe(emailAddress);
    expect(res.body[0].platform).toBe('web');
  });

  it('fails if emailAddress is missing', async () => {
    await request(app.getHttpServer()).get('/punchin').expect(400); // Bad Request for missing param
  });

  it('fails if user does not exist', async () => {
    await request(app.getHttpServer())
      .get('/punchin')
      .query({ emailAddress: 'notfound@example.com' })
      .expect(404); // Not Found exception from UserService
  });

  it('returns empty array if user exists but has no punchins', async () => {
    const emailAddress = 'empty@example.com';

    await request(app.getHttpServer())
      .post('/user/register')
      .send({
        fullName: 'Empty User',
        birthdate: '1990-01-01',
        emailAddress: emailAddress,
        companyId: 'comp-1',
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get('/punchin')
      .query({ emailAddress })
      .expect(200);

    expect(res.body).toEqual([]);
  });
});
