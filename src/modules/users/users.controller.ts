import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import type { TokenPayload } from '@/shared/types';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

import { AdminMessageResponseDto, TokenPayloadDto, UserProfileResponseDto } from './dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('user-jwt')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Return the decoded JWT payload for the current user' })
  @ApiOkResponse({ type: TokenPayloadDto })
  getUserJwt(@CurrentUser() userJwt: TokenPayload) {
    return userJwt;
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get the authenticated user profile' })
  @ApiOkResponse({ type: UserProfileResponseDto })
  getProfile(@CurrentUser() user: TokenPayload) {
    return this.usersService.getProfile(user.userId);
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin-only probe endpoint' })
  @ApiOkResponse({ type: AdminMessageResponseDto })
  getAdminResource() {
    return { message: 'admin only' };
  }
}
