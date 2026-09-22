import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/database';
import { clearDatabase, seedTestRoles } from '../setup';
import bcrypt from 'bcryptjs';

describe('Auth API (Integration Tests)', () => {
  const app = createApp();

  beforeAll(async () => {
    await clearDatabase();
    await seedTestRoles();
  });

  afterAll(async () => {
    await clearDatabase();
    await prisma.$disconnect();
  });

  const testUser = {
    email: 'test@example.com',
    password: 'Password123!',
    firstName: 'Test',
    lastName: 'User'
  };

  let tokens: { accessToken: string; refreshToken: string };

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe(testUser.email);
      expect(res.body.data.tokens).toBeDefined();
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();

      tokens = res.body.data.tokens;

      // Verify db
      const dbUser = await prisma.user.findUnique({ where: { email: testUser.email } });
      expect(dbUser).toBeDefined();
      expect(await bcrypt.compare(testUser.password, dbUser!.passwordHash)).toBe(true);
    });

    it('should fail with 409 if email already exists', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('EMAIL_EXISTS');
    });

    it('should fail with 422 if password is too weak', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...testUser, email: 'other@example.com', password: '123' });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully and return new tokens', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();

      // Update tokens for subsequent tests
      tokens = res.body.data.tokens;
    });

    it('should fail with 401 on incorrect password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword!'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return user profile when authenticated', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${tokens.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testUser.email);
    });

    it('should fail with 401 when unauthenticated', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let freshRefreshToken: string;

    it('should return new access and refresh tokens', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: tokens.refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();

      freshRefreshToken = res.body.data.tokens.refreshToken;
    });

    it('should revoke entire token family on refresh token reuse attempt (401)', async () => {
      // Trying to use the OLD token again (which was rotated in the previous test)
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: tokens.refreshToken });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Refresh token was already used');

      // Now verify that the freshRefreshToken is ALSO invalidated (family revoked)
      const freshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: freshRefreshToken });

      expect(freshRes.status).toBe(401);
      expect(freshRes.body.success).toBe(false);

      // We will need to re-login for the logout test
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });
      tokens = loginRes.body.data.tokens;
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout and invalidate current refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({ refreshToken: tokens.refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify refresh token is actually revoked
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: tokens.refreshToken });

      expect(refreshRes.status).toBe(401);
    });
  });
});
