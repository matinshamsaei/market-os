import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { UserRole } from '@prisma/client';

import { UsersRepository } from '../users/users.repository';
import { AuthService } from './auth.service';

describe('UsersService', () => {
  let service: AuthService;

  const mockAuthRepository = {
    findByEmail: jest.fn(),
    create: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('fake-jwt-token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersRepository,
          useValue: mockAuthRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should create a new user and return token', async () => {
      mockAuthRepository.findByEmail.mockResolvedValue(null);

      mockAuthRepository.create.mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        password: 'hashed-password',
        role: UserRole.CUSTOMER,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await service.register({ email: 'test@test.com', password: 'password' });

      expect(response.token).toBe('fake-jwt-token');
      expect(response.user.email).toBe('test@test.com');

      expect(mockAuthRepository.create).toHaveBeenCalled();
    });

    it('should throw if email already exists', async () => {
      mockAuthRepository.findByEmail.mockResolvedValue({
        id: '1',
        email: 'test@test.com',
      });

      await expect(
        service.register({ email: 'test@test.com', password: 'password' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('login', () => {
    it('should return user and token', async () => {
      const hashedPassword = await bcrypt.hash('password', 10);

      mockAuthRepository.findByEmail.mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        password: hashedPassword,
        role: UserRole.CUSTOMER,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await service.login({ email: 'test@test.com', password: 'password' });

      expect(response.token).toBe('fake-jwt-token');
      expect(response.user.email).toBe('test@test.com');
    });

    it('should throw when password is incorrect', async () => {
      const hashedPassword = await bcrypt.hash('password', 10);

      mockAuthRepository.findByEmail.mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        password: hashedPassword,
        role: UserRole.CUSTOMER,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.login({ email: 'test@test.com', password: 'wrong-password' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
