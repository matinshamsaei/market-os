import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { User, UserRole } from '@prisma/client';

import { UsersService } from '../users/users.service';

import type { AuthenticatedUserResponse, LoginUserDto, RegisterUserDto } from './dto';

type SignTokenPayload = {
  userId: string;
  email: string;
  role: UserRole;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register({ email, password, role }: RegisterUserDto): AuthenticatedUserResponse {
    const existing = await this.usersService.findUserByEmail(email);
    if (existing) throw new BadRequestException('Email already exists');

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.usersService.registerUser({
      email,
      password: hashedPassword,
      role: role ?? UserRole.CUSTOMER,
    });

    const token = this.signToken({ userId: user.id, email: user.email, role: user.role });

    return {
      user: this.stripPassword(user),
      token,
    };
  }

  async login({ email, password }: LoginUserDto): AuthenticatedUserResponse {
    const user = await this.usersService.findUserByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.signToken({ userId: user.id, email: user.email, role: user.role });

    return {
      user: this.stripPassword(user),
      token,
    };
  }

  private signToken({ userId, email, role }: SignTokenPayload): string {
    return this.jwtService.sign({
      sub: userId,
      email,
      role,
    });
  }

  private stripPassword(user: User): Omit<User, 'password'> {
    const { password: _, ...rest } = user;
    return rest;
  }
}
