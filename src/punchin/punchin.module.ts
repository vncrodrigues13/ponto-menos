import { Module } from '@nestjs/common';
import { PunchinController } from './punchin.controller';
import { PunchinService } from './punchin.service';
import { PunchinRepository } from './punchin.repository';

@Module({
  controllers: [PunchinController],
  providers: [PunchinService, PunchinRepository],
})
export class PunchinModule {}
