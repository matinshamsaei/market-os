import { Controller, Get, UseGuards } from '@nestjs/common';

import type { TokenPayload } from '@/shared/types';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('user-jwt')
  @UseGuards(JwtAuthGuard)
  getUserJwt(@CurrentUser() userJwt: TokenPayload) {
    return userJwt;
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: TokenPayload) {
    return this.usersService.getProfile(user.userId);
  }
}
