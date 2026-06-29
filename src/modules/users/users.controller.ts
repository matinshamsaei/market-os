import { Controller, Get, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
export class UsersController {
  @Get('user-jwt')
  @UseGuards(JwtAuthGuard)
  getUserJwt(@CurrentUser() userJwt: JwtPayload) {
    return userJwt;
  }
}
