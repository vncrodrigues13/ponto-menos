import { Test, TestingModule } from '@nestjs/testing';
import { PunchinService } from './punchin.service';
import { PunchinRepositoryPort } from './punchin.repository.port';
import { UserService } from '../user/user.service';
import { NotFoundException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken');

describe('PunchinService', () => {
  let service: PunchinService;
  let userService: jest.Mocked<UserService>;
  let repo: jest.Mocked<PunchinRepositoryPort>;

  beforeEach(async () => {
    // Basic mock dependencies
    const mockUserService = {
      findUserByEmailAddress: jest.fn(),
    };
    const mockRepo = {
      save: jest.fn(),
      findAll: jest.fn(),
      findBy: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PunchinService,
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: PunchinRepositoryPort,
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<PunchinService>(PunchinService);
    // Explicit casts to assert mocked instances later
    userService = module.get(UserService) as any;
    repo = module.get(PunchinRepositoryPort) as any;
  });

  describe('record', () => {
    const dto = {
      timestamp: new Date().toISOString(),
      platform: 'ios',
      authToken: 'dummyToken',
    };

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should throw NotFoundException with "User not found" if user does not exist', async () => {
      // Mock the JWT decode so it successfully resolves to an email
      (jwt.verify as jest.Mock).mockReturnValue({ emailAddress: 'notfound@example.com' } as any);

      // Simulate UserService throwing a default NotFoundException...
      userService.findUserByEmailAddress.mockRejectedValue(
        new NotFoundException('User with email notfound@example.com not found')
      );

      // We assert that PunchinService.record correctly overwrites the message to 'User not found'
      await expect(service.record(dto)).rejects.toThrow(new NotFoundException('User not found'));

      // The punchin must definitively not be saved!
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('should successfully save the punchin if the user exists', async () => {
      (jwt.verify as jest.Mock).mockReturnValue({ emailAddress: 'exists@example.com' } as any);

      // Simulate UserService successfully returning a user object...
      userService.findUserByEmailAddress.mockResolvedValue({ fullName: 'John Doe' } as any);
      repo.save.mockResolvedValue({ timestamp: dto.timestamp } as any);

      await service.record(dto);

      expect(userService.findUserByEmailAddress).toHaveBeenCalledWith('exists@example.com');
      // The punchin must be saved!
      expect(repo.save).toHaveBeenCalled();
    });
  });
});
