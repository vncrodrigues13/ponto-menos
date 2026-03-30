import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { UserRepositoryPort } from './user.repository.port';
import { ConflictException, InternalServerErrorException, NotFoundException } from '@nestjs/common';

import pino from 'pino';
import { Counter, Histogram } from 'prom-client';

jest.mock('prom-client', () => {
  const inc = jest.fn();
  const startTimer = jest.fn().mockReturnValue(jest.fn());
  return {
    Counter: jest.fn().mockImplementation(() => ({ inc })),
    Histogram: jest.fn().mockImplementation(() => ({ startTimer })),
  };
});

jest.mock('pino', () => {
  const warn = jest.fn();
  const error = jest.fn();
  const info = jest.fn();
  const loggerMock = { warn, error, info };
  return jest.fn().mockReturnValue(loggerMock);
});

describe('UserService', () => {
  let service: UserService;
  let repo: jest.Mocked<UserRepositoryPort>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepositoryPort,
          useValue: {
            findByEmail: jest.fn(),
            save: jest.fn(),
            findAll: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repo = module.get(UserRepositoryPort);
    jest.clearAllMocks();
  });

  describe('T1 - When tries to register an user with existing email, should fail', () => {
    it('should throw an Conflict Exception with specific message', async () => {
      repo.findByEmail.mockResolvedValue({
        fullName: 'John Doe',
        birthdate: new Date(),
        emailAddress: 'johndoe@example.com',
        companyId: 1,
      });

      await expect(
        service.registerUser({
          fullName: 'John Doe',
          birthdate: '1990-01-01',
          emailAddress: 'johndoe@example.com',
          companyId: 1,
        }),
      ).rejects.toThrow(ConflictException);

      await expect(
        service.registerUser({
          fullName: 'John Doe',
          birthdate: '1990-01-01',
          emailAddress: 'johndoe@example.com',
          companyId: 1,
        }),
      ).rejects.toThrow('User with email johndoe@example.com already exists');
    });
  });

  describe('T2 - When tries to register an user with non-existing email, should succeed', () => {
    it('should successfully save the user if email does not exist', async () => {
      repo.findByEmail.mockResolvedValue(undefined);
      const savedUser = {
        fullName: 'Jane Doe',
        birthdate: new Date('1995-05-05'),
        emailAddress: 'janedoe@example.com',
        companyId: 1,
      };
      repo.save.mockResolvedValue(savedUser);

      const result = await service.registerUser({
        fullName: 'Jane Doe',
        birthdate: '1995-05-05',
        emailAddress: 'janedoe@example.com',
        companyId: 1,
      });

      expect(repo.findByEmail).toHaveBeenCalledWith('janedoe@example.com');
      expect(repo.save).toHaveBeenCalledTimes(1);
      expect(result).toEqual(savedUser);
    });
  });

  describe('T3 - When tries to save an error and the database connection fails, should fail', () => {
    it('should fail when db connection fails during save', async () => {
      repo.findByEmail.mockResolvedValue(undefined);
      const dbError = new InternalServerErrorException('DB error');
      repo.save.mockRejectedValue(dbError);

      await expect(
        service.registerUser({
          fullName: 'Error User',
          birthdate: '1990-01-01',
          emailAddress: 'error@example.com',
          companyId: 1,
        }),
      ).rejects.toThrow(InternalServerErrorException);

      expect(repo.save).toHaveBeenCalledTimes(1);
      const logger = pino();
      expect(logger.error).toHaveBeenCalled();
      const counterMock = new Counter({ name: 'test', help: 'test' });
      expect(counterMock.inc).toHaveBeenCalled();
    });
  });

  describe('T4 - When tries to find an user by email address with non-existing email, should fail', () => {
    it('should throw NotFoundException for non-existing email and log warning', async () => {
      repo.findByEmail.mockResolvedValue(undefined);

      await expect(service.findUserByEmailAddress('notfound@example.com')).rejects.toThrow(
        NotFoundException,
      );

      expect(repo.findByEmail).toHaveBeenCalledWith('notfound@example.com');
      const logger = pino();
      expect(logger.warn).toHaveBeenCalledWith({ email: 'notfound@example.com' }, 'User not found by email address');
      expect(logger.error).not.toHaveBeenCalledWith(expect.anything(), 'Error on user found by email address');
      const counterMock = new Counter({ name: 'test', help: 'test' });
      expect(counterMock.inc).toHaveBeenCalled();
    });
  });
});
