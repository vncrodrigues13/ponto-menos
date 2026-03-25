import { IsString, IsEmail, IsNotEmpty, IsDateString, IsNumber, Min } from 'class-validator';
import { MinAge } from '../validators/min-age.decorator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: 'Full name of the user identifying them' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ description: 'Birthdate in ISO date string format (user must be 18+)' })
  @IsDateString()
  @MinAge(18)
  birthdate: string; // Received as string, converted to Date in service

  @ApiProperty({ description: 'A valid email address for the user' })
  @IsEmail()
  emailAddress: string;

  @ApiProperty({ description: 'The identifier of the affiliated company', minimum: 1 })
  @IsNumber()
  @Min(1)
  companyId: number;
}
