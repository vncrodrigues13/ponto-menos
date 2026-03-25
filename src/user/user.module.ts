import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { InMemoryUserRepository } from './inmemory.user.repository';
import { UserRepositoryPort } from './user.repository.port';

@Module({
  controllers: [UserController],
  providers: [
    UserService,
    {
      provide: UserRepositoryPort,
      useClass: InMemoryUserRepository,
    },
  ],
  exports: [UserService],
})
export class UserModule { }
