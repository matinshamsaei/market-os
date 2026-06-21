import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);

    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should call authService.register', async () => {
      mockAuthService.register.mockResolvedValue({
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

      expect(mockAuthService.register).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: 'password',
        role: undefined,
      });

      expect(response.token).toBe('jwt-token');
    });

    it('should pass role when provided', async () => {
      mockAuthService.register.mockResolvedValue({
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

      expect(mockAuthService.register).toHaveBeenCalledWith({
        email: 'vendor@test.com',
        password: 'password',
        role: UserRole.VENDOR,
      });
    });
  });

  describe('login', () => {
    it('should call authService.login', async () => {
      mockAuthService.login.mockResolvedValue({
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

      expect(mockAuthService.login).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: 'password',
      });

      expect(response.token).toBe('jwt-token');
    });

    it('should return authenticated user response', async () => {
      mockAuthService.login.mockResolvedValue({
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
