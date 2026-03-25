import { Body, Controller, Get, Post, Query, BadRequestException } from '@nestjs/common';
import { PunchinService } from './punchin.service';
import { CreatePunchinDto } from './dto/create-punchin.dto';
import { PunchinEntry } from './punchin.model';
import {Counter} from 'prom-client'
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

var counter = new Counter({
    name: "punchin_controller_counter",
    help: "total endpoint call",
})

@ApiTags('punchins')
@Controller('punchin')
export class PunchinController {
  constructor(private readonly service: PunchinService) {}

  @ApiOperation({ summary: 'Record a new punch-in event' })
  @ApiResponse({ status: 201, description: 'The punch-in event has been successfully recorded.' })
  @ApiResponse({ status: 400, description: 'Invalid payload provided for punch-in event.' })
  @Post()
  async record(@Body() dto: CreatePunchinDto): Promise<PunchinEntry> {
    counter.inc(1);
    return await this.service.record(dto);
  }

  @ApiOperation({ summary: 'Get all punch-ins from a given user' })
  @ApiQuery({ name: 'emailAddress', required: true, description: 'The email address of the user to search for' })
  @ApiResponse({ status: 200, description: 'Successfully recovered user punch-ins' })
  @ApiResponse({ status: 400, description: 'query parameter `emailAddress` wasn`t provided' })
  @ApiResponse({ status: 404, description: 'User does not exist with that email' })
  @Get()
  async getPunchinsFromUser(@Query('emailAddress') emailAddress?: string): Promise<PunchinEntry[]> {
    if (!emailAddress) {
      throw new BadRequestException('emailAddress query parameter is required');
    }
    return await this.service.getPunchinsFromUser(emailAddress);
  }
}
