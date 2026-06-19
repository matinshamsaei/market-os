import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { User, UserRole } from '@prisma/client';

import { UsersRepository } from './users.repository';
import type { AuthenticatedUserResponse } from './types';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
  ) {}

  async register(email: string, password: string, role?: UserRole): AuthenticatedUserResponse {
    const existingUser = await this.usersRepository.findByEmail(email);

    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.usersRepository.create({
      email,
      password: hashedPassword,
      role: role ?? UserRole.CUSTOMER,
    });

    const token = this.signToken(user.id, user.email, user.role);

    return {
      user: this.stripPassword(user),
      token,
    };
  }

  async login(email: string, password: string) {
    const user = await this.usersRepository.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.signToken(user.id, user.email, user.role);

    return {
      user: this.stripPassword(user),
      token,
    };
  }

  private signToken(userId: string, email: string, role: UserRole): string {
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
