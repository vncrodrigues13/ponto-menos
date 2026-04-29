import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';

export class LoginWithCodeDto {
  @ApiProperty({ description: 'Email address used for passwordless login' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : '',
  )
  @IsEmail()
  @IsNotEmpty()
  emailAddress: string;

  @ApiProperty({ description: 'One-time 6-digit login code' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/)
  code: string;
}
