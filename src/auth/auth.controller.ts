import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LoginWithCodeDto } from './dto/login-with-code.dto';
import { RequestLoginCodeDto } from './dto/request-login-code.dto';
import { AuthService } from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Request a one-time login code by email' })
  @ApiResponse({
    status: 202,
    description:
      'Request accepted. Response is generic to avoid account enumeration.',
  })
  @ApiResponse({ status: 400, description: 'Invalid request payload.' })
  @HttpCode(202)
  @Post('request-code')
  async requestCode(
    @Body() dto: RequestLoginCodeDto,
  ): Promise<{ message: string }> {
    return await this.authService.requestCode(dto);
  }

  @ApiOperation({ summary: 'Login with email and one-time code' })
  @ApiResponse({
    status: 200,
    description: 'Login successful and access token issued.',
  })
  @ApiResponse({ status: 400, description: 'Invalid request payload.' })
  @ApiResponse({
    status: 401,
    description: 'Code is missing, expired, consumed, or invalid.',
  })
  @ApiResponse({
    status: 429,
    description: 'Code is blocked due to too many failed attempts.',
  })
  @HttpCode(200)
  @Post('login')
  async login(@Body() dto: LoginWithCodeDto): Promise<{ accessToken: string }> {
    return await this.authService.login(dto);
  }
}
