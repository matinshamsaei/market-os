import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;

  const mockUsersService = {
    register: jest.fn(),
    login: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);

    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should call usersService.register', async () => {
      mockUsersService.register.mockResolvedValue({
        token: 'jwt-token',
        user: {
          id: '1',
          email: 'test@test.com',
          role: UserRole.CUSTOMER,
        },
      });

      const response = await controller.register({
        email: 'test@test.com',
        password: 'password',
      });

      expect(mockUsersService.register).toHaveBeenCalledWith(
        'test@test.com',
        'password',
        undefined,
      );

      expect(response.token).toBe('jwt-token');
    });

    it('should pass role when provided', async () => {
      mockUsersService.register.mockResolvedValue({
        token: 'jwt-token',
        user: {
          id: '1',
          email: 'vendor@test.com',
          role: UserRole.VENDOR,
        },
      });

      await controller.register({
        email: 'vendor@test.com',
        password: 'password',
        role: UserRole.VENDOR,
      });

      expect(mockUsersService.register).toHaveBeenCalledWith(
        'vendor@test.com',
        'password',
        UserRole.VENDOR,
      );
    });
  });

  describe('login', () => {
    it('should call usersService.login', async () => {
      mockUsersService.login.mockResolvedValue({
        token: 'jwt-token',
        user: {
          id: '1',
          email: 'test@test.com',
          role: UserRole.CUSTOMER,
        },
      });

      const response = await controller.login({
        email: 'test@test.com',
        password: 'password',
      });

      expect(mockUsersService.login).toHaveBeenCalledWith('test@test.com', 'password');

      expect(response.token).toBe('jwt-token');
    });

    it('should return authenticated user response', async () => {
      mockUsersService.login.mockResolvedValue({
        token: 'jwt-token',
        user: {
          id: '1',
          email: 'test@test.com',
          role: UserRole.CUSTOMER,
        },
      });

      const response = await controller.login({
        email: 'test@test.com',
        password: 'password',
      });

      expect(response.user.email).toBe('test@test.com');
      expect(response.token).toBeDefined();
    });
  });
});
