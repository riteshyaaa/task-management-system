import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/database';
import { clearDatabase, seedTestRoles } from '../setup';
import { RoleName, TaskStatus, TaskPriority, EngagementStatus, RecurrenceFrequency } from '@prisma/client';
import { generateAccessToken } from '../../src/shared/utils/jwt.util';

describe('Professional Services Engagement Management System (11 Integration Tests)', () => {
  const app = createApp();

  let adminToken: string;
  let adminId: string;
  let managerToken: string;
  let managerId: string;
  let member1Token: string;
  let member1Id: string;
  let member2Token: string;
  let member2Id: string;

  let clientId: string;
  let serviceTypeId: string;
  let templateId: string;

  beforeAll(async () => {
    await clearDatabase();
    await seedTestRoles();

    // 1. Create Admin User
    const adminRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'admin@firm.com',
        password: 'Password123!',
        firstName: 'System',
        lastName: 'Admin'
      });
    adminId = adminRes.body.data.user.id;

    // Upgrade to ADMIN role
    const adminRole = await prisma.role.findUnique({ where: { name: RoleName.ADMIN } });
    if (adminRole) {
      await prisma.userRole.deleteMany({ where: { userId: adminId } });
      await prisma.userRole.create({ data: { userId: adminId, roleId: adminRole.id } });
    }
    adminToken = generateAccessToken({
      userId: adminId,
      email: 'admin@firm.com',
      roles: [RoleName.ADMIN],
      permissions: ['tasks:create', 'tasks:read', 'tasks:update', 'tasks:delete', 'clients:create', 'clients:read', 'clients:update', 'workflows:read', 'workflows:create', 'audit:read']
    });

    // 2. Create Manager User
    const managerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'manager@firm.com',
        password: 'Password123!',
        firstName: 'Engagement',
        lastName: 'Manager'
      });
    managerId = managerRes.body.data.user.id;

    // Upgrade to MANAGER role
    const managerRole = await prisma.role.findUnique({ where: { name: RoleName.MANAGER } });
    if (managerRole) {
      await prisma.userRole.deleteMany({ where: { userId: managerId } });
      await prisma.userRole.create({ data: { userId: managerId, roleId: managerRole.id } });
    }
    managerToken = generateAccessToken({
      userId: managerId,
      email: 'manager@firm.com',
      roles: [RoleName.MANAGER],
      permissions: ['tasks:create', 'tasks:read', 'tasks:update', 'tasks:delete', 'clients:read', 'clients:update', 'workflows:read', 'workflows:create']
    });

    // 3. Create Member 1 User
    const member1Res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'member1@firm.com',
        password: 'Password123!',
        firstName: 'Senior',
        lastName: 'Accountant'
      });
    member1Id = member1Res.body.data.user.id;

    // Assign TEAM_MEMBER role
    const teamMemberRole = await prisma.role.findUnique({ where: { name: RoleName.TEAM_MEMBER } });
    if (teamMemberRole) {
      await prisma.userRole.deleteMany({ where: { userId: member1Id } });
      await prisma.userRole.create({ data: { userId: member1Id, roleId: teamMemberRole.id } });
    }
    member1Token = generateAccessToken({
      userId: member1Id,
      email: 'member1@firm.com',
      roles: [RoleName.TEAM_MEMBER],
      permissions: ['tasks:create', 'tasks:read', 'tasks:update', 'clients:read']
    });

    // 4. Create Member 2 User
    const member2Res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'member2@firm.com',
        password: 'Password123!',
        firstName: 'Staff',
        lastName: 'Auditor'
      });
    member2Id = member2Res.body.data.user.id;

    if (teamMemberRole) {
      await prisma.userRole.deleteMany({ where: { userId: member2Id } });
      await prisma.userRole.create({ data: { userId: member2Id, roleId: teamMemberRole.id } });
    }
    member2Token = generateAccessToken({
      userId: member2Id,
      email: 'member2@firm.com',
      roles: [RoleName.TEAM_MEMBER],
      permissions: ['tasks:create', 'tasks:read', 'tasks:update', 'clients:read']
    });

    // 5. Create Client Workspace
    const clientRes = await request(app)
      .post('/api/v1/clients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Acme Global Corp',
        slug: 'acme-global',
        description: 'Multi-national manufacturing client'
      });
    clientId = clientRes.body.data.id;

    // Add manager and members to client workspace
    await request(app)
      .post(`/api/v1/clients/${clientId}/members`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: managerId, role: 'MAINTAINER' });

    await request(app)
      .post(`/api/v1/clients/${clientId}/members`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: member1Id, role: 'MEMBER' });

    await request(app)
      .post(`/api/v1/clients/${clientId}/members`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: member2Id, role: 'MEMBER' });
  });

  afterAll(async () => {
    await clearDatabase();
    await prisma.$disconnect();
  });

  // =========================================================================
  // TEST 1: Service Type CRUD Operations
  // =========================================================================
  describe('1. Service Type CRUD Operations', () => {
    it('should allow Admin/Manager to create a new Service Type', async () => {
      const res = await request(app)
        .post('/api/v1/service-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Monthly Bookkeeping & Financial Reporting',
          description: 'Monthly reconciliation of bank accounts and financial statements',
          defaultCadence: RecurrenceFrequency.MONTHLY,
          estimatedHours: 15.5
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Monthly Bookkeeping & Financial Reporting');
      expect(res.body.data.defaultCadence).toBe(RecurrenceFrequency.MONTHLY);
      expect(res.body.data.isActive).toBe(true);

      serviceTypeId = res.body.data.id;
    });

    it('should list all active Service Types', async () => {
      const res = await request(app)
        .get('/api/v1/service-types')
        .set('Authorization', `Bearer ${member1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should fetch single Service Type by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/service-types/${serviceTypeId}`)
        .set('Authorization', `Bearer ${member1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(serviceTypeId);
    });

    it('should allow Manager to update a Service Type', async () => {
      const res = await request(app)
        .patch(`/api/v1/service-types/${serviceTypeId}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          description: 'Updated comprehensive bookkeeping service'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.description).toBe('Updated comprehensive bookkeeping service');
    });
  });

  // =========================================================================
  // TEST 2 & 3: Template Setup & Atomic Engagement Instantiation
  // =========================================================================
  describe('2. Atomic Engagement Instantiation with Variable Replacement', () => {
    beforeAll(async () => {
      // Create a Task Template linked to the ServiceType with TemplateItems
      const template = await prisma.taskTemplate.create({
        data: {
          clientId,
          serviceTypeId,
          createdById: adminId,
          name: 'Bookkeeping Workflow Template',
          description: 'Standard checklist for monthly bookkeeping',
          defaultTitle: '{{service_name}} - {{client_name}} ({{period_start}})',
          defaultBody: 'Monthly execution tasks for {{client_name}}',
          defaultPriority: TaskPriority.HIGH,
          templateItems: {
            create: [
              {
                title: 'Collect Bank Statements for {{client_name}}',
                description: 'Download PDF statements for period {{period_start}} to {{period_end}}',
                position: 0,
                estimatedHours: 2.0
              },
              {
                title: 'Reconcile General Ledger - {{engagement_title}}',
                description: 'Verify reconciliations for {{service_name}}',
                position: 1,
                estimatedHours: 5.0
              },
              {
                title: 'Management Review for {{client_name}}',
                description: 'Final review of financial pack for {{period_end}}',
                position: 2,
                estimatedHours: 1.5
              }
            ]
          }
        }
      });
      templateId = template.id;
    });

    it('should atomically create an Engagement and instantiate tasks with interpolated variables', async () => {
      const res = await request(app)
        .post('/api/v1/engagements')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          clientId,
          serviceTypeId,
          templateId,
          title: 'October 2026 Bookkeeping',
          description: 'Bookkeeping engagement for Acme Corp',
          periodStart: '2026-10-01',
          periodEnd: '2026-10-31',
          dueDate: '2026-11-10T17:00:00.000Z',
          managerId,
          assigneeId: member1Id,
          autoGenerateTasks: true
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('October 2026 Bookkeeping');
      expect(res.body.data.taskCount).toBe(3);

      const engagementId = res.body.data.id;

      // Verify created tasks in database have interpolated variables
      const tasks = await prisma.task.findMany({
        where: { engagementId },
        orderBy: { position: 'asc' }
      });

      expect(tasks).toHaveLength(3);
      expect(tasks[0].title).toBe('Collect Bank Statements for Acme Global Corp');
      expect(tasks[0].description).toContain('period 2026-10-01 to 2026-10-31');
      expect(tasks[0].status).toBe(TaskStatus.NOT_STARTED);
      expect(tasks[0].assigneeId).toBe(member1Id);

      expect(tasks[1].title).toBe('Reconcile General Ledger - October 2026 Bookkeeping');
      expect(tasks[1].description).toContain('Verify reconciliations for Monthly Bookkeeping & Financial Reporting');

      expect(tasks[2].title).toBe('Management Review for Acme Global Corp');
    });
  });

  // =========================================================================
  // TEST 3: Duplicate Engagement Prevention (409 Conflict)
  // =========================================================================
  describe('3. Duplicate Engagement Prevention Constraint', () => {
    it('should return 409 Conflict with DUPLICATE_ENGAGEMENT error code on identical engagement', async () => {
      const res = await request(app)
        .post('/api/v1/engagements')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          clientId,
          serviceTypeId,
          title: 'Duplicate October 2026 Bookkeeping',
          periodStart: '2026-10-01',
          periodEnd: '2026-10-31',
          managerId,
          autoGenerateTasks: false
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DUPLICATE_ENGAGEMENT');
      expect(res.body.error.message).toContain('already exists');
    });
  });

  // =========================================================================
  // TEST 4: Self-Approval Prevention (403 Forbidden)
  // =========================================================================
  describe('4. Self-Approval Prevention Rule', () => {
    let reviewTaskId: string;

    beforeAll(async () => {
      // Create a task assigned to member1 and transition to READY_FOR_REVIEW
      const task = await prisma.task.create({
        data: {
          title: 'Tax Provision Calculation',
          status: TaskStatus.READY_FOR_REVIEW,
          priority: TaskPriority.HIGH,
          clientId,
          assigneeId: member1Id,
          reporterId: managerId,
          version: 1
        }
      });
      reviewTaskId = task.id;
    });

    it('should REJECT self-approval with 403 Forbidden when assignee attempts to approve via /approve endpoint', async () => {
      const res = await request(app)
        .post(`/api/v1/tasks/${reviewTaskId}/approve`)
        .set('Authorization', `Bearer ${member1Token}`)
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Assignees are not permitted to approve');
    });

    it('should REJECT self-completion with 403 Forbidden when assignee attempts to transition READY_FOR_REVIEW -> COMPLETED via PUT', async () => {
      const res = await request(app)
        .put(`/api/v1/tasks/${reviewTaskId}`)
        .set('Authorization', `Bearer ${member1Token}`)
        .send({
          status: TaskStatus.COMPLETED
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Assignees are not permitted to approve');
    });
  });

  // =========================================================================
  // TEST 5: Task Ownership Protection (403 Forbidden)
  // =========================================================================
  describe('5. Task Ownership Protection for Team Members', () => {
    let member1Task: string;

    beforeAll(async () => {
      const task = await prisma.task.create({
        data: {
          title: 'Member 1 Private Workpaper',
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.MEDIUM,
          clientId,
          assigneeId: member1Id,
          reporterId: managerId,
          version: 1
        }
      });
      member1Task = task.id;
    });

    it('should REJECT with 403 Forbidden when member2 attempts to modify member1 task', async () => {
      const res = await request(app)
        .put(`/api/v1/tasks/${member1Task}`)
        .set('Authorization', `Bearer ${member2Token}`)
        .send({
          title: 'Unauthorized Modification by Member 2'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Team members cannot modify tasks assigned to another');
    });
  });

  // =========================================================================
  // TEST 6: Manager/Admin Task Approval
  // =========================================================================
  describe('6. Manager/Admin Task Approval Action', () => {
    let reviewTask: string;

    beforeAll(async () => {
      const task = await prisma.task.create({
        data: {
          title: 'Quarterly VAT Filing',
          status: TaskStatus.READY_FOR_REVIEW,
          priority: TaskPriority.URGENT,
          clientId,
          assigneeId: member1Id,
          reporterId: managerId,
          version: 1
        }
      });
      reviewTask = task.id;
    });

    it('should allow Manager to successfully approve task and transition to COMPLETED', async () => {
      const res = await request(app)
        .post(`/api/v1/tasks/${reviewTask}/approve`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(TaskStatus.COMPLETED);
      expect(res.body.data.completedAt).not.toBeNull();

      // Verify comment was automatically added
      const comments = await prisma.taskComment.findMany({ where: { taskId: reviewTask } });
      expect(comments.some(c => c.content.includes('Task reviewed and approved'))).toBe(true);
    });
  });

  // =========================================================================
  // TEST 7: Manager/Admin Request Changes Action
  // =========================================================================
  describe('7. Manager/Admin Request Changes Action', () => {
    let reviewTask: string;

    beforeAll(async () => {
      const task = await prisma.task.create({
        data: {
          title: 'Fixed Asset Register Review',
          status: TaskStatus.READY_FOR_REVIEW,
          priority: TaskPriority.HIGH,
          clientId,
          assigneeId: member2Id,
          reporterId: managerId,
          version: 1
        }
      });
      reviewTask = task.id;
    });

    it('should allow Manager to request changes with structured feedback reason', async () => {
      const res = await request(app)
        .post(`/api/v1/tasks/${reviewTask}/request-changes`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          reason: 'Depreciation schedule is missing Q3 equipment purchases.'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(TaskStatus.CHANGES_REQUESTED);

      // Verify comment logged
      const comments = await prisma.taskComment.findMany({ where: { taskId: reviewTask } });
      expect(comments.some(c => c.content.includes('Changes Requested: Depreciation schedule is missing'))).toBe(true);
    });
  });

  // =========================================================================
  // TEST 8: Optimistic Concurrency Control (OCC)
  // =========================================================================
  describe('8. Optimistic Concurrency Control Guard', () => {
    let occTaskId: string;

    beforeAll(async () => {
      const task = await prisma.task.create({
        data: {
          title: 'OCC Concurrent Task',
          status: TaskStatus.TODO,
          priority: TaskPriority.LOW,
          clientId,
          assigneeId: member1Id,
          reporterId: adminId,
          version: 1
        }
      });
      occTaskId = task.id;
    });

    it('should increment version on successful update', async () => {
      const res = await request(app)
        .put(`/api/v1/tasks/${occTaskId}`)
        .set('Authorization', `Bearer ${member1Token}`)
        .send({
          title: 'OCC Task Updated',
          version: 1
        });

      expect(res.status).toBe(200);
      expect(res.body.data.version).toBe(2);
    });

    it('should return 409 Conflict when stale version 1 is submitted', async () => {
      const res = await request(app)
        .put(`/api/v1/tasks/${occTaskId}`)
        .set('Authorization', `Bearer ${member1Token}`)
        .send({
          title: 'Conflict Edit with Old Version',
          version: 1 // DB is currently version 2
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(['OCC_CONFLICT', 'CONCURRENT_MODIFICATION_CONFLICT']).toContain(res.body.error.code);
    });
  });

  // =========================================================================
  // TEST 9: Engagement Progress Calculation
  // =========================================================================
  describe('9. Engagement Retrieval with Task Progress Metrics', () => {
    let progressEngagementId: string;

    beforeAll(async () => {
      const eng = await prisma.engagement.create({
        data: {
          clientId,
          serviceTypeId,
          title: 'November 2026 Audit Prep',
          periodStart: new Date('2026-11-01'),
          periodEnd: new Date('2026-11-30'),
          status: EngagementStatus.ACTIVE,
          managerId,
          createdById: adminId
        }
      });
      progressEngagementId = eng.id;

      // Create 4 tasks: 2 COMPLETED, 1 IN_PROGRESS, 1 NOT_STARTED
      await prisma.task.createMany({
        data: [
          {
            title: 'Task 1',
            status: TaskStatus.COMPLETED,
            priority: TaskPriority.MEDIUM,
            clientId,
            engagementId: progressEngagementId,
            reporterId: adminId
          },
          {
            title: 'Task 2',
            status: TaskStatus.COMPLETED,
            priority: TaskPriority.MEDIUM,
            clientId,
            engagementId: progressEngagementId,
            reporterId: adminId
          },
          {
            title: 'Task 3',
            status: TaskStatus.IN_PROGRESS,
            priority: TaskPriority.HIGH,
            clientId,
            engagementId: progressEngagementId,
            reporterId: adminId
          },
          {
            title: 'Task 4',
            status: TaskStatus.NOT_STARTED,
            priority: TaskPriority.LOW,
            clientId,
            engagementId: progressEngagementId,
            reporterId: adminId
          }
        ]
      });
    });

    it('should return engagement with totalTasks=4, completedTasks=2, progressPercentage=50%', async () => {
      const res = await request(app)
        .get(`/api/v1/engagements/${progressEngagementId}`)
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalTasks).toBe(4);
      expect(res.body.data.completedTasks).toBe(2);
      expect(res.body.data.progressPercentage).toBe(50);
    });
  });

  // =========================================================================
  // TEST 10: Real Database Dashboard Metrics Calculation
  // =========================================================================
  describe('10. Dashboard Operational Metrics Calculation', () => {
    it('should calculate live operational metrics for tasks and engagements', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/overview')
        .query({ clientId })
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.overview).toBeDefined();
      expect(res.body.data.overview.metrics).toBeDefined();

      const { metrics, priorityDistribution } = res.body.data.overview;
      expect(typeof metrics.openTasks).toBe('number');
      expect(typeof metrics.overdueTasks).toBe('number');
      expect(typeof metrics.waitingForReview).toBe('number');
      expect(typeof metrics.engagementsInProgress).toBe('number');
      expect(typeof metrics.totalEngagements).toBe('number');

      expect(priorityDistribution).toHaveProperty('LOW');
      expect(priorityDistribution).toHaveProperty('MEDIUM');
      expect(priorityDistribution).toHaveProperty('HIGH');
      expect(priorityDistribution).toHaveProperty('URGENT');
    });
  });

  // =========================================================================
  // TEST 11: Engagement Filtering and Status Management
  // =========================================================================
  describe('11. Engagement Filtering and Lifecycle Updates', () => {
    it('should filter engagements by clientId and status', async () => {
      const res = await request(app)
        .get('/api/v1/engagements')
        .query({ clientId, status: EngagementStatus.ACTIVE })
        .set('Authorization', `Bearer ${managerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(res.body.data.items.every((e: any) => e.status === EngagementStatus.ACTIVE)).toBe(true);
    });

    it('should update engagement status to COMPLETED', async () => {
      const engagementsRes = await request(app)
        .get('/api/v1/engagements')
        .query({ clientId })
        .set('Authorization', `Bearer ${managerToken}`);

      const targetEngagement = engagementsRes.body.data.items[0];

      const updateRes = await request(app)
        .patch(`/api/v1/engagements/${targetEngagement.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          status: EngagementStatus.COMPLETED
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.status).toBe(EngagementStatus.COMPLETED);
    });
  });
});
