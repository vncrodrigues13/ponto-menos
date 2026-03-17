import { Injectable, ConflictException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { User } from './user.model';
import { UserRepository } from './user.repository';
import { CreateUserDto } from './dto/create-user.dto';
import pino from 'pino';
import { Counter, Histogram } from 'prom-client';

const logger = pino();

// Metrics
const userRegistrationCounter = new Counter({
  name: 'user_registration_total',
  help: 'Total number of users registered',
});

const userRegistrationConflictCounter = new Counter({
  name: 'user_registration_conflict_total',
  help: 'Total number of failed registrations due to existing email',
});

const userRegistrationErrorCounter = new Counter({
  name: 'user_registration_error_total',
  help: 'Total number of errors during user registration',
});

const userRegistrationDuration = new Histogram({
  name: 'user_registration_duration_seconds',
  help: 'Duration of user registration in seconds',
});

const userFindByEmailSuccessCounter = new Counter({
  name: 'user_find_by_email_success_total',
  help: 'Total number of successful user lookups by email',
});

const userFindByEmailNotFoundCounter = new Counter({
  name: 'user_find_by_email_not_found_total',
  help: 'Total number of user lookups by email that resulted in not found',
});

const userFindByEmailErrorCounter = new Counter({
  name: 'user_find_by_email_error_total',
  help: 'Total number of errors during user lookup by email',
});

const userFindByEmailDuration = new Histogram({
  name: 'user_find_by_email_duration_seconds',
  help: 'Duration of user lookup by email in seconds',
});

@Injectable()
export class UserService {
  constructor(private readonly repo: UserRepository) {}

  registerUser(dto: CreateUserDto): User {
    const endTimer = userRegistrationDuration.startTimer();
    logger.info({ email: dto.emailAddress }, 'Starting user registration');

    try {
      const existing = this.repo.findByEmail(dto.emailAddress);
      if (existing) {
        userRegistrationConflictCounter.inc();
        logger.warn({ email: dto.emailAddress }, 'Attempt to register user with existing email address');
        throw new ConflictException(`User with email ${dto.emailAddress} already exists`);
      }

      const newUser: User = {
        fullName: dto.fullName,
        birthdate: new Date(dto.birthdate),
        emailAddress: dto.emailAddress,
        companyId: dto.companyId,
      };

      const result = this.repo.create(newUser);
      userRegistrationCounter.inc();
      logger.info({ email: dto.emailAddress }, 'User registered successfully');
      return result;
    } catch (error) {
      if (!(error instanceof ConflictException)) {
        userRegistrationErrorCounter.inc();
        logger.error({ email: dto.emailAddress, error: error.message }, 'Error on user registration');
      }
      throw error;
    } finally {
      endTimer();
    }
  }

  findUserByEmailAddress(email: string): User {
    const endTimer = userFindByEmailDuration.startTimer();
    try {
      const user = this.repo.findByEmail(email);
      if (!user) {
        userFindByEmailNotFoundCounter.inc();
        logger.warn({ email }, 'User not found by email address');
        throw new NotFoundException(`User with email ${email} not found`);
      }
      userFindByEmailSuccessCounter.inc();
      logger.info({ email }, 'User found by email address');
      return user;
    } catch (error) {
      if (!(error instanceof NotFoundException)) {
        userFindByEmailErrorCounter.inc();
        logger.error({ email, error: error.message }, 'Error on user found by email address');
      }
      throw error;
    } finally {
      endTimer();
    }
  }
}
