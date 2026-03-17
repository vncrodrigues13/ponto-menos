import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './user.model';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  register(@Body() dto: CreateUserDto): User {
    return this.userService.registerUser(dto);
  }

  @Get()
  findByEmail(@Query('email') email: string): User {
    return this.userService.findUserByEmailAddress(email);
  }
}
