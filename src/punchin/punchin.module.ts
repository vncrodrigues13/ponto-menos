import { Module } from '@nestjs/common';
import { PunchinController } from './punchin.controller';
import { PunchinService } from './punchin.service';
import { InMemoryPunchinRepository } from './inmemorypunchin.repository';
import { PunchinRepositoryPort } from './punchin.repository.port';
import { UserModule } from '../user/user.module';

@Module({
  controllers: [PunchinController],
  providers: [
    PunchinService,
    {
      provide: PunchinRepositoryPort,
      useClass: InMemoryPunchinRepository,
    },
  ],
  imports: [UserModule],
})
export class PunchinModule { }
