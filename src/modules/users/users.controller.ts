import { Body, Controller, Post } from '@nestjs/common';

import { UserRole } from '@prisma/client';

import { UsersService } from './users.service';
import type { AuthenticatedUserResponse } from './types';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  async register(
    @Body()
    body: {
      email: string;
      password: string;
      role?: UserRole;
    },
  ): AuthenticatedUserResponse {
    return this.usersService.register(body.email, body.password, body.role);
  }

  @Post('login')
  async login(
    @Body()
    body: {
      email: string;
      password: string;
    },
  ): AuthenticatedUserResponse {
    return this.usersService.login(body.email, body.password);
  }
}
