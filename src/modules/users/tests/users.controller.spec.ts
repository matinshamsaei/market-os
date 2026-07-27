import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';

import type { TokenPayload } from '@/shared/types';

import { UsersController } from '../users.controller';
import { UsersService } from '../users.service';

describe('UsersController', () => {
  let controller: UsersController;

  const mockUsersService = {
    getProfile: jest.fn(),
  };

  const user: TokenPayload = {
    userId: 'user-1',
    email: 'test@test.com',
    role: UserRole.CUSTOMER,
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

  describe('getUserJwt', () => {
    it('should return the authenticated jwt payload', () => {
      const response = controller.getUserJwt(user);

      expect(response).toEqual(user);
    });
  });

  describe('getProfile', () => {
    it('should call usersService.getProfile with user id', async () => {
      const profile = {
        id: user.userId,
        email: user.email,
        role: user.role,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUsersService.getProfile.mockResolvedValue(profile);

      const response = await controller.getProfile(user);

      expect(mockUsersService.getProfile).toHaveBeenCalledWith(user.userId);
      expect(response).toEqual(profile);
    });
  });

  describe('getAdminResource', () => {
    it('should return admin only message', () => {
      const response = controller.getAdminResource();

      expect(response).toEqual({ message: 'admin only' });
    });
  });
});
