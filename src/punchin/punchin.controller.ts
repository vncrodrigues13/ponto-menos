import { Body, Controller, Get, Post } from '@nestjs/common';
import { PunchinService } from './punchin.service';
import { CreatePunchinDto } from './dto/create-punchin.dto';
import { PunchinEntry } from './punchin.model';
import {Counter} from 'prom-client'


var counter = new Counter({
    name: "punchin_controller_counter",
    help: "total endpoint call",
})


@Controller('punchin')
export class PunchinController {
  constructor(private readonly service: PunchinService) {}

  @Post()
  record(@Body() dto: CreatePunchinDto): PunchinEntry {
    counter.inc(1);
    return this.service.record(dto);
  }

  @Get()
  list(): PunchinEntry[] {
    return this.service.list();
  }
}
