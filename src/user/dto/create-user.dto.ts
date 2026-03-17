import { IsString, IsEmail, IsNotEmpty, IsDateString, IsNumber, Min } from 'class-validator';
import { MinAge } from '../validators/min-age.decorator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsDateString()
  @MinAge(18)
  birthdate: string; // Received as string, converted to Date in service

  @IsEmail()
  emailAddress: string;

  @IsNumber()
  @Min(1)
  companyId: number;
}
