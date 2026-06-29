import { UserRole } from '@prisma/client';

export type TokenPayload = {
  userId: string;
  email: string;
  role: UserRole;
};
