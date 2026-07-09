import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';

import { UsersService } from '../users.service';
import { UsersRepository } from '../users.repository';

describe('UsersService', () => {
  let service: UsersService;

  const mockUsersRepository = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    stripPasswordFromUser: jest.fn(),
  };

  const user = {
    id: 'user-1',
    email: 'test@test.com',
    password: 'hashed-password',
    role: UserRole.CUSTOMER,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: mockUsersRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);

    jest.clearAllMocks();
  });

  describe('findUserByEmail', () => {
    it('should delegate to repository', async () => {
      mockUsersRepository.findByEmail.mockResolvedValue(user);

      const response = await service.findUserByEmail(user.email);

      expect(mockUsersRepository.findByEmail).toHaveBeenCalledWith(user.email);
      expect(response).toEqual(user);
    });
  });

  describe('registerUser', () => {
    it('should delegate to repository', async () => {
      const payload = {
        email: user.email,
        password: user.password,
        role: UserRole.CUSTOMER,
      };

      mockUsersRepository.create.mockResolvedValue(user);

      const response = await service.registerUser(payload);

      expect(mockUsersRepository.create).toHaveBeenCalledWith(payload);
      expect(response).toEqual(user);
    });
  });

  describe('findUserById', () => {
    it('should delegate to repository', async () => {
      mockUsersRepository.findById.mockResolvedValue(user);

      const response = await service.findUserById(user.id);

      expect(mockUsersRepository.findById).toHaveBeenCalledWith(user.id);
      expect(response).toEqual(user);
    });
  });

  describe('getProfile', () => {
    it('should return user profile without password', async () => {
      const profile = {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      mockUsersRepository.findById.mockResolvedValue(user);
      mockUsersRepository.stripPasswordFromUser.mockReturnValue(profile);

      const response = await service.getProfile(user.id);

      expect(mockUsersRepository.findById).toHaveBeenCalledWith(user.id);
      expect(mockUsersRepository.stripPasswordFromUser).toHaveBeenCalledWith(user);
      expect(response).toEqual(profile);
      expect(response).not.toHaveProperty('password');
    });

    it('should throw when user does not exist', async () => {
      mockUsersRepository.findById.mockResolvedValue(null);

      await expect(service.getProfile('missing-id')).rejects.toThrow(NotFoundException);
    });
  });
});
