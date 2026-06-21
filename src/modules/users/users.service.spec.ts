import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { UserRole } from '@prisma/client';

import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  const mockUsersRepository = {
    findByEmail: jest.fn(),
    create: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('fake-jwt-token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: mockUsersRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);

    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should create a new user and return token', async () => {
      mockUsersRepository.findByEmail.mockResolvedValue(null);

      mockUsersRepository.create.mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        password: 'hashed-password',
        role: UserRole.CUSTOMER,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await service.register('test@test.com', 'password');

      expect(response.token).toBe('fake-jwt-token');
      expect(response.user.email).toBe('test@test.com');

      expect(mockUsersRepository.create).toHaveBeenCalled();
    });

    it('should throw if email already exists', async () => {
      mockUsersRepository.findByEmail.mockResolvedValue({
        id: '1',
        email: 'test@test.com',
      });

      await expect(service.register('test@test.com', 'password')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('login', () => {
    it('should return user and token', async () => {
      const hashedPassword = await bcrypt.hash('password', 10);

      mockUsersRepository.findByEmail.mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        password: hashedPassword,
        role: UserRole.CUSTOMER,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await service.login('test@test.com', 'password');

      expect(response.token).toBe('fake-jwt-token');
      expect(response.user.email).toBe('test@test.com');
    });

    it('should throw when password is incorrect', async () => {
      const hashedPassword = await bcrypt.hash('password', 10);

      mockUsersRepository.findByEmail.mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        password: hashedPassword,
        role: UserRole.CUSTOMER,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(service.login('test@test.com', 'wrong-password')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
