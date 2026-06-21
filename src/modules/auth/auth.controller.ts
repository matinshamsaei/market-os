import { Body, Controller, Post } from '@nestjs/common';

import { AuthService } from './auth.service';

import type { RegisterUserDto, AuthenticatedUserResponse, LoginUserDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly usersService: AuthService) {}

  @Post('register')
  async register(
    @Body()
    body: RegisterUserDto,
  ): AuthenticatedUserResponse {
    return this.usersService.register(body);
  }

  @Post('login')
  async login(
    @Body()
    body: LoginUserDto,
  ): AuthenticatedUserResponse {
    return this.usersService.login(body);
  }
}
