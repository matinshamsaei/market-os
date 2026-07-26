import { INestApplication } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Test } from '@nestjs/testing';
import { App } from 'supertest/types';

import { PrismaService } from '../src/database/prisma/prisma.service';
import { AppModule } from '../src/app.module';

import { authHeader, httpRequest, registerUser, uniqueEmail } from './helpers/auth.helper';
import type { AuthResponse, ErrorResponse, ProfileResponse } from './helpers/auth.helper';
import { cleanupUsers } from './helpers/db.helper';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await cleanupUsers(prisma);
    await app.close();
  });

  beforeEach(async () => {
    await cleanupUsers(prisma);
  });

  describe('POST /auth/register', () => {
    it('registers a new user successfully', async () => {
      const email = uniqueEmail('register-success');

      const response = await httpRequest(app)
        .post('/auth/register')
        .send({ email, password: 'password123' })
        .expect(201);

      const body = response.body as AuthResponse;

      expect(typeof body.token).toBe('string');
      expect(body.user).toMatchObject({
        email,
        role: UserRole.CUSTOMER,
      });
      expect(body.user).not.toHaveProperty('password');
      expect(typeof body.user.id).toBe('string');

      const wallet = await prisma.wallet.findUnique({
        where: { userId: body.user.id },
      });

      expect(wallet).toMatchObject({
        userId: body.user.id,
        balance: 0,
      });
    });

    it('rejects duplicate email registration', async () => {
      const email = uniqueEmail('register-duplicate');
      const password = 'password123';

      await httpRequest(app).post('/auth/register').send({ email, password }).expect(201);

      const response = await httpRequest(app)
        .post('/auth/register')
        .send({ email, password })
        .expect(400);

      const body = response.body as ErrorResponse;

      expect(body.message).toBe('Email already exists');
    });
  });

  describe('POST /auth/login', () => {
    it('logs in with valid credentials', async () => {
      const email = uniqueEmail('login-success');
      const password = 'password123';

      await registerUser(app, email, password);

      const response = await httpRequest(app)
        .post('/auth/login')
        .send({ email, password })
        .expect(201);

      const body = response.body as AuthResponse;

      expect(typeof body.token).toBe('string');
      expect(body.user).toMatchObject({ email, role: UserRole.CUSTOMER });
      expect(body.user).not.toHaveProperty('password');
    });

    it('rejects login with invalid password', async () => {
      const email = uniqueEmail('login-invalid-password');

      await registerUser(app, email, 'correct-password');

      const response = await httpRequest(app)
        .post('/auth/login')
        .send({ email, password: 'wrong-password' })
        .expect(401);

      const body = response.body as ErrorResponse;

      expect(body.message).toBe('Invalid credentials');
    });
  });

  describe('GET /users/profile', () => {
    it('returns profile for authenticated user', async () => {
      const email = uniqueEmail('profile-authenticated');
      const { token, user } = await registerUser(app, email);

      const response = await httpRequest(app)
        .get('/users/profile')
        .set(authHeader(token))
        .expect(200);

      const body = response.body as ProfileResponse;

      expect(body).toMatchObject({
        id: user.id,
        email,
        role: UserRole.CUSTOMER,
      });
      expect(body).not.toHaveProperty('password');
    });

    it('rejects unauthenticated profile request', async () => {
      const response = await httpRequest(app).get('/users/profile').expect(401);

      const body = response.body as ErrorResponse;

      expect(body.message).toBe('Unauthorized');
    });
  });

  describe('Role guard', () => {
    it('allows admin access and denies non-admin users', async () => {
      const adminEmail = uniqueEmail('role-guard-admin');
      const customerEmail = uniqueEmail('role-guard-customer');

      const admin = await registerUser(app, adminEmail, 'password123', UserRole.ADMIN);
      const customer = await registerUser(app, customerEmail);

      await httpRequest(app)
        .get('/users/admin')
        .set(authHeader(admin.token))
        .expect(200)
        .expect({ message: 'admin only' });

      const response = await httpRequest(app)
        .get('/users/admin')
        .set(authHeader(customer.token))
        .expect(403);

      const body = response.body as ErrorResponse;

      expect(body.message).toBe('Insufficient permissions');
    });
  });
});
