import { User } from '@prisma/client';

export type AuthenticatedUserResponse = Promise<{ user: Omit<User, 'password'>; token: string }>;
