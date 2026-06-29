import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { UsersService } from '../users/users.service';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    findUserByEmail: jest.fn(),
    registerUser: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('fake-jwt-token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
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
      mockUsersService.findUserByEmail.mockResolvedValue(null);

      mockUsersService.registerUser.mockResolvedValue({
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

      expect(mockUsersService.registerUser).toHaveBeenCalled();
    });

    it('should throw if email already exists', async () => {
      mockUsersService.findUserByEmail.mockResolvedValue({
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

      mockUsersService.findUserByEmail.mockResolvedValue({
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

      mockUsersService.findUserByEmail.mockResolvedValue({
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
