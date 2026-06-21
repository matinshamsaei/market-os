import type { User, UserRole } from '@prisma/client';

export type RegisterUserDto = {
  email: string;
  password: string;
  role?: UserRole;
};

export type LoginUserDto = {
  email: string;
  password: string;
};

export type AuthenticatedUserResponse = Promise<{ user: Omit<User, 'password'>; token: string }>;
