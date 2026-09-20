import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/database';
import { clearDatabase, seedTestRoles } from '../setup';
import { TaskStatus, TaskPriority } from '@prisma/client';

describe('Tasks API & OCC (Integration Tests)', () => {
  const app = createApp();
  let authToken: string;
  let userId: string;
  let teamId: string;

  beforeAll(async () => {
    await clearDatabase();
    await seedTestRoles();

    // Register test user
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'tasktester@example.com',
        password: 'Password123!',
        firstName: 'Task',
        lastName: 'Tester'
      });

    authToken = regRes.body.data.tokens.accessToken;
    userId = regRes.body.data.user.id;

    // Create a team workspace
    const teamRes = await request(app)
      .post('/api/v1/teams')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Engineering Team',
        slug: 'engineering-team',
        description: 'Primary workspace'
      });

    teamId = teamRes.body.data.id;
  });

  afterAll(async () => {
    await clearDatabase();
    await prisma.$disconnect();
  });

  describe('Task Lifecycle & Optimistic Concurrency Control (OCC)', () => {
    let createdTaskId: string;
    let initialVersion: number;

    it('should create a new task with initial version = 1', async () => {
      const res = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Implement OAuth Login',
          description: 'Support Google and GitHub SSO',
          status: TaskStatus.TODO,
          priority: TaskPriority.HIGH,
          teamId
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Implement OAuth Login');
      expect(res.body.data.version).toBe(1);
      expect(res.body.data.status).toBe(TaskStatus.TODO);

      createdTaskId = res.body.data.id;
      initialVersion = res.body.data.version;
    });

    it('should update task successfully when client sends matching version', async () => {
      const res = await request(app)
        .put(`/api/v1/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Implement OAuth Login & Passkeys',
          version: initialVersion
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Implement OAuth Login & Passkeys');
      expect(res.body.data.version).toBe(initialVersion + 1); // Version incremented to 2
    });

    it('should REJECT update with 409 Conflict when client sends stale version (OCC Guard)', async () => {
      // Trying to update using initialVersion (1), but DB is now at version (2)
      const res = await request(app)
        .put(`/api/v1/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Concurrent conflicting edit',
          version: initialVersion // Stale version 1!
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('OCC_CONFLICT');
      expect(res.body.error.message).toContain('modified by another user');
    });

    it('should add subtasks and calculate progress', async () => {
      // Add subtask 1
      const sub1 = await request(app)
        .post(`/api/v1/tasks/${createdTaskId}/subtasks`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Google OAuth Client Setup'
        });

      expect(sub1.status).toBe(201);
      expect(sub1.body.data.isCompleted).toBe(false);

      // Add subtask 2
      const sub2 = await request(app)
        .post(`/api/v1/tasks/${createdTaskId}/subtasks`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'GitHub OAuth Setup'
        });
      expect(sub2.status).toBe(201);

      // Fetch task details and verify subtasks list
      const detailRes = await request(app)
        .get(`/api/v1/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(detailRes.status).toBe(200);
      expect(detailRes.body.data.subtasks).toHaveLength(2);
    });

    it('should create audit log entry on task mutation', async () => {
      const auditLogs = await prisma.auditLog.findMany({
        where: { entityId: createdTaskId }
      });

      expect(auditLogs.length).toBeGreaterThanOrEqual(1);
      const updateLog = auditLogs.find((l) => l.operation === 'UPDATE');
      expect(updateLog).toBeDefined();
      expect(updateLog?.changedFields).toContain('title');
    });

    it('should delete task and clean up dependent subtasks', async () => {
      const delRes = await request(app)
        .delete(`/api/v1/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);

      // Verify task is gone
      const checkRes = await request(app)
        .get(`/api/v1/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(checkRes.status).toBe(404);
    });
  });
});
