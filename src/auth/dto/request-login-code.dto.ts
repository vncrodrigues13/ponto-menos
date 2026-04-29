import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class RequestLoginCodeDto {
  @ApiProperty({ description: 'Email address used for passwordless login' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : '',
  )
  @IsEmail()
  @IsNotEmpty()
  emailAddress: string;
}
