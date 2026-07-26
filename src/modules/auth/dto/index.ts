import type { User } from '@prisma/client';

export { LoginUserDto } from './login-user.dto';
export { PUBLIC_REGISTER_ROLES, RegisterUserDto } from './register-user.dto';

export type AuthenticatedUserResponse = Promise<{ user: Omit<User, 'password'>; token: string }>;
