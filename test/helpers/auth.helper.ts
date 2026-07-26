import type { UserRole } from '@prisma/client';
import { UserRole as Role } from '@prisma/client';
import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import * as bcrypt from 'bcrypt';
import request from 'supertest';

import { PrismaService } from '../../src/database/prisma/prisma.service';

export type AuthResponse = {
  user: {
    id: string;
    email: string;
    role: UserRole;
    createdAt: string;
    updatedAt: string;
  };
  token: string;
};

export type ErrorResponse = {
  message: string;
};

export type ProfileResponse = AuthResponse['user'];

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

export function httpRequest(app: INestApplication) {
  return request(app.getHttpServer() as Server);
}

export async function registerUser(
  app: INestApplication,
  email: string,
  password = 'password123',
  role?: UserRole,
): Promise<AuthResponse> {
  if (role === Role.ADMIN) {
    const prisma = app.get(PrismaService);
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: Role.ADMIN,
        wallet: { create: { balance: 0 } },
      },
    });

    const response = await httpRequest(app)
      .post('/auth/login')
      .send({ email, password })
      .expect(201);

    return response.body as AuthResponse;
  }

  const payload: { email: string; password: string; role?: UserRole } = { email, password };

  if (role) {
    payload.role = role;
  }

  const response = await httpRequest(app).post('/auth/register').send(payload).expect(201);

  return response.body as AuthResponse;
}

export function authHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}
