import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  findUserByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  async registerUser(data: Prisma.UserCreateInput): Promise<User> {
    const existing = await this.usersRepository.findByEmail(data.email);
    if (existing) throw new BadRequestException('Email already exists');

    return this.usersRepository.create(data);
  }

  findUserById(id: string): Promise<User | null> {
    return this.usersRepository.findById(id);
  }
}
