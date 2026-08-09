import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service';

import { WalletRepository } from '../wallet/wallet.repository';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly walletRepository: WalletRepository,
    private readonly prisma: PrismaService,
  ) {}

  findUserByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  registerUser(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.$transaction(async (transaction) => {
      const user = await this.usersRepository.create(data, transaction);
      await this.walletRepository.createForUser(user.id, transaction);
      return user;
    });
  }

  findUserById(id: string): Promise<User | null> {
    return this.usersRepository.findById(id);
  }

  async getProfile(userId: string): Promise<Omit<User, 'password'>> {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.usersRepository.stripPasswordFromUser(user);
  }
}
