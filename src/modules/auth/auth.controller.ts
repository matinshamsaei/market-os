import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Body, Controller, Post } from '@nestjs/common';

import { AuthService } from './auth.service';
import {
  AuthenticatedUserResponseDto,
  LoginUserDto,
  RegisterUserDto,
  type AuthenticatedUserResponse,
} from './dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly usersService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new customer or vendor' })
  @ApiCreatedResponse({ type: AuthenticatedUserResponseDto })
  async register(@Body() body: RegisterUserDto): AuthenticatedUserResponse {
    return this.usersService.register(body);
  }

  @Post('login')
  @ApiOperation({ summary: 'Log in with email and password' })
  @ApiCreatedResponse({ type: AuthenticatedUserResponseDto })
  async login(@Body() body: LoginUserDto): AuthenticatedUserResponse {
    return this.usersService.login(body);
  }
}
