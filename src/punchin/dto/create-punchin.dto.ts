import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class CreatePunchinDto {
  @ApiProperty({ description: 'ISO date string representation of the punch-in time' })
  @IsDateString()
  timestamp: string; // ISO date string

  @ApiProperty({ description: 'Platform from which the record originated (e.g., ios, android, web)' })
  @IsString()
  @IsNotEmpty()
  platform: string;

  /** Raw authentication token; the service will resolve this to an email */
  @ApiProperty({ description: 'Authentication token used to resolve user identity' })
  @IsString()
  @IsNotEmpty()
  authToken: string;
}
