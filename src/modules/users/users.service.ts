import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';

import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  findUserByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  registerUser(data: Prisma.UserCreateInput): Promise<User> {
    return this.usersRepository.create(data);
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
