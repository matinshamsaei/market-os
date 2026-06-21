import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';

import { UserRole } from '@prisma/client';

import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let usersController: UsersController;
  let usersService: UsersService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: {
            findByEmail: jest.fn(),
            create: jest.fn(),
            findById: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('fake-jwt-token'),
          },
        },
      ],
    }).compile();

    usersController = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);
  });

  describe('register a new user', () => {
    it('should throw an error if the email is already taken', async () => {
      await usersService.register('test@test.com', 'test');

      await expect(
        usersController.register({
          email: 'test@test.com',
          password: 'test',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return a user and a token', async () => {
      const response = await usersController.register({
        email: 'test@test.com',
        password: 'test',
      });

      expect(response.token).toBeDefined();
      expect(response.user).toBeDefined();
      expect(response.user.email).toBe('test@test.com');
      expect(response.user.role).toBe(UserRole.CUSTOMER);
    });
  });

  describe('login a user', () => {
    it('should throw an error if the email is not found', async () => {
      await expect(
        usersController.login({
          email: 'test@test.com',
          password: 'test',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw an error if the password is incorrect', async () => {
      await usersService.register('test@test.com', 'test');

      await expect(
        usersController.login({
          email: 'test@test.com',
          password: 'incorrect',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return a user and a token', async () => {
      await usersService.register('test@test.com', 'test');

      const response = await usersController.login({
        email: 'test@test.com',
        password: 'test',
      });

      expect(response.token).toBeDefined();
      expect(response.user).toBeDefined();
      expect(response.user.email).toBe('test@test.com');
      expect(response.user.role).toBe(UserRole.CUSTOMER);
    });
  });
});
