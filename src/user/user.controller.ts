import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './user.model';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

@ApiTags('users')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'The user has been registered successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid user registration data.' })
  @Post('register')
  async register(@Body() dto: CreateUserDto): Promise<User> {
    return await this.userService.registerUser(dto);
  }

  @ApiOperation({ summary: 'Fetch user details by email' })
  @ApiQuery({ name: 'email', required: true, description: 'The email address of the target user' })
  @ApiResponse({ status: 200, description: 'Returns matching user details.' })
  @ApiResponse({ status: 404, description: 'User with provided email not found.' })
  @Get()
  async findByEmail(@Query('email') email: string): Promise<User> {
    return await this.userService.findUserByEmailAddress(email);
  }
}
