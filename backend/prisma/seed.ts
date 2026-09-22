import {
  PrismaClient,
  RoleName,
  TaskStatus,
  TaskPriority,
  ClientRole,
  WorkflowStatus,
  RecurrenceFrequency,
  RecurrenceStatus,
  InstanceStatus,
  DayOfWeek,
  EngagementStatus,
  ActivityType,
  AuditOperation,
  MetricPeriod,
  NotificationType,
  RuleTriggerType,
  TransitionConditionType,
  HookEventType
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('[SEED] Starting comprehensive 2-Workspace Professional Services database seeding...');

  // 1. Clean existing records in reverse dependency order
  console.log('[SEED] Cleaning existing records...');
  await prisma.notification.deleteMany();
  await prisma.userLoginStreak.deleteMany();
  await prisma.dashboardWidget.deleteMany();
  await prisma.clientPerformanceMetric.deleteMany();
  await prisma.taskVelocityMetric.deleteMany();
  await prisma.userActivityLog.deleteMany();
  await prisma.auditRetentionPolicy.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.auditBulkOperation.deleteMany();
  await prisma.workflowTransitionHistory.deleteMany();
  await prisma.taskWorkflowAssignment.deleteMany();
  await prisma.transitionHook.deleteMany();
  await prisma.transitionCondition.deleteMany();
  await prisma.workflowTransition.deleteMany();
  await prisma.workflowState.deleteMany();
  await prisma.workflowDefinition.deleteMany();
  await prisma.recurringTaskInstance.deleteMany();
  await prisma.recurrenceException.deleteMany();
  await prisma.recurrenceMonthlyConfig.deleteMany();
  await prisma.recurrenceWeeklyDay.deleteMany();
  await prisma.recurrenceRule.deleteMany();
  await prisma.automationRule.deleteMany();
  await prisma.templateItem.deleteMany();
  await prisma.taskTemplate.deleteMany();
  await prisma.taskWatcher.deleteMany();
  await prisma.taskComment.deleteMany();
  await prisma.taskLabelMap.deleteMany();
  await prisma.label.deleteMany();
  await prisma.task.deleteMany();
  await prisma.engagement.deleteMany();
  await prisma.serviceType.deleteMany();
  await prisma.clientMember.deleteMany();
  await prisma.client.deleteMany();
  await prisma.passwordReset.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create System Roles
  console.log('[SEED] Creating system roles...');
  const adminRole = await prisma.role.create({
    data: { name: RoleName.ADMIN, description: 'Full system administrative access' }
  });
  const managerRole = await prisma.role.create({
    data: { name: RoleName.MANAGER, description: 'Client and engagement management privileges' }
  });
  const memberRole = await prisma.role.create({
    data: { name: RoleName.TEAM_MEMBER, description: 'Standard engagement contributor and task assignee' }
  });

  // 3. Define Granular Permissions
  console.log('[SEED] Creating granular system permissions...');
  const permissionsList = [
    // Users module
    { slug: 'users:read', name: 'View Users', module: 'users', description: 'View user profiles and lists' },
    { slug: 'users:write', name: 'Update Users', module: 'users', description: 'Update user profiles' },
    { slug: 'users:delete', name: 'Delete Users', module: 'users', description: 'Soft delete user accounts' },
    { slug: 'roles:manage', name: 'Manage Roles', module: 'roles', description: 'Assign roles and permissions' },

    // Clients module
    { slug: 'clients:create', name: 'Create Clients', module: 'clients', description: 'Create new client workspaces' },
    { slug: 'clients:read', name: 'View Clients', module: 'clients', description: 'View client details and members' },
    { slug: 'clients:update', name: 'Update Clients', module: 'clients', description: 'Update client settings' },
    { slug: 'clients:delete', name: 'Delete Clients', module: 'clients', description: 'Archive or delete clients' },
    { slug: 'clients:manage_members', name: 'Manage Client Members', module: 'clients', description: 'Add or remove members' },
    { slug: 'teams:create', name: 'Create Clients (Legacy)', module: 'clients', description: 'Create new client workspaces' },
    { slug: 'teams:read', name: 'View Clients (Legacy)', module: 'clients', description: 'View client details and members' },
    { slug: 'teams:update', name: 'Update Clients (Legacy)', module: 'clients', description: 'Update client settings' },
    { slug: 'teams:delete', name: 'Delete Clients (Legacy)', module: 'clients', description: 'Archive or delete clients' },
    { slug: 'teams:manage_members', name: 'Manage Client Members (Legacy)', module: 'clients', description: 'Add or remove members' },

    // Tasks module
    { slug: 'tasks:create', name: 'Create Tasks', module: 'tasks', description: 'Create new tasks and subtasks' },
    { slug: 'tasks:read', name: 'View Tasks', module: 'tasks', description: 'View tasks, comments, and attachments' },
    { slug: 'tasks:update', name: 'Update Tasks', module: 'tasks', description: 'Update task details, assignees, and status' },
    { slug: 'tasks:delete', name: 'Delete Tasks', module: 'tasks', description: 'Soft delete tasks' },
    { slug: 'tasks:bulk_manage', name: 'Bulk Manage Tasks', module: 'tasks', description: 'Perform bulk update on tasks' },

    // Comments module
    { slug: 'comments:read', name: 'View Comments', module: 'comments', description: 'Read task comments' },
    { slug: 'comments:create', name: 'Add Comments', module: 'comments', description: 'Post task comments' },
    { slug: 'comments:update', name: 'Update Comments', module: 'comments', description: 'Edit comments' },
    { slug: 'comments:delete', name: 'Delete Comments', module: 'comments', description: 'Remove comments' },

    // Workflows module
    { slug: 'workflows:read', name: 'View Workflows', module: 'workflows', description: 'View workflow state machines' },
    { slug: 'workflows:create', name: 'Create Workflows', module: 'workflows', description: 'Create workflow definitions' },
    { slug: 'workflows:update', name: 'Update Workflows', module: 'workflows', description: 'Modify workflow states' },
    { slug: 'workflows:delete', name: 'Delete Workflows', module: 'workflows', description: 'Archive workflow definitions' },
    { slug: 'workflows:transition', name: 'Execute Transitions', module: 'workflows', description: 'Transition task states' },

    // Templates module
    { slug: 'templates:read', name: 'View Templates', module: 'templates', description: 'View task templates' },
    { slug: 'templates:create', name: 'Create Templates', module: 'templates', description: 'Create task templates' },
    { slug: 'templates:update', name: 'Update Templates', module: 'templates', description: 'Modify task templates' },
    { slug: 'templates:delete', name: 'Delete Templates', module: 'templates', description: 'Delete task templates' },
    { slug: 'templates:manage', name: 'Manage Templates', module: 'templates', description: 'Create, update, delete task templates' },
    { slug: 'templates:instantiate', name: 'Use Templates', module: 'templates', description: 'Generate tasks from templates' },

    // Automation
    { slug: 'automation:manage', name: 'Manage Automation Rules', module: 'automation', description: 'Create automation rules' },

    // Recurring Tasks
    { slug: 'recurring:manage', name: 'Manage Recurring Tasks', module: 'recurring', description: 'Setup recurring rules' },
    { slug: 'recurring:read', name: 'View Recurring Tasks', module: 'recurring', description: 'View recurring configs' },

    // Audit & Analytics & System
    { slug: 'audit:read', name: 'View Audit Logs', module: 'audit', description: 'View append-only audit trail' },
    { slug: 'analytics:read', name: 'View Analytics', module: 'analytics', description: 'View performance & velocity' },
    { slug: 'dashboard:customize', name: 'Customize Dashboard', module: 'dashboard', description: 'Configure dashboard widgets' },
    { slug: 'system:settings', name: 'System Settings', module: 'system', description: 'Configure system settings & retention' }
  ];

  const createdPermissions = await Promise.all(
    permissionsList.map(p => prisma.permission.create({ data: p }))
  );
  const permMap = new Map(createdPermissions.map(p => [p.slug, p.id]));

  // Admin gets ALL permissions
  await Promise.all(
    createdPermissions.map(p =>
      prisma.rolePermission.create({
        data: { roleId: adminRole.id, permissionId: p.id }
      })
    )
  );

  // Manager gets operational management permissions
  const managerPerms = createdPermissions.filter(p => !['users:delete', 'roles:manage', 'clients:delete', 'teams:delete'].includes(p.slug));
  await Promise.all(
    managerPerms.map(p =>
      prisma.rolePermission.create({
        data: { roleId: managerRole.id, permissionId: p.id }
      })
    )
  );

  // Member gets standard operational permissions (NO tasks:create, NO tasks:delete, NO templates:instantiate)
  const memberPermSlugs = [
    'users:read', 'clients:read', 'teams:read', 'tasks:read', 'tasks:update',
    'comments:read', 'comments:create', 'comments:update',
    'workflows:read', 'workflows:transition', 'templates:read',
    'recurring:read', 'analytics:read', 'dashboard:customize'
  ];
  await Promise.all(
    memberPermSlugs.map(slug => {
      const permId = permMap.get(slug);
      if (!permId) return Promise.resolve();
      return prisma.rolePermission.create({
        data: { roleId: memberRole.id, permissionId: permId }
      });
    })
  );

  // 4. Create Initial Users
  console.log('[SEED] Creating demo accounts (Admin, Managers, Members)...');
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Password123!', salt);

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      passwordHash,
      firstName: 'System',
      lastName: 'Admin',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      userRoles: { create: { roleId: adminRole.id } },
      loginStreak: {
        create: { currentStreak: 12, longestStreak: 25, totalActiveDays: 45, lastActiveDate: new Date() }
      }
    }
  });

  const manager1 = await prisma.user.create({
    data: {
      email: 'manager@example.com',
      passwordHash,
      firstName: 'Sarah',
      lastName: 'Manager',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      userRoles: { create: { roleId: managerRole.id } },
      loginStreak: {
        create: { currentStreak: 5, longestStreak: 18, totalActiveDays: 30, lastActiveDate: new Date() }
      }
    }
  });

  const manager2 = await prisma.user.create({
    data: {
      email: 'manager2@example.com',
      passwordHash,
      firstName: 'Michael',
      lastName: 'Manager',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      userRoles: { create: { roleId: managerRole.id } },
      loginStreak: {
        create: { currentStreak: 7, longestStreak: 15, totalActiveDays: 22, lastActiveDate: new Date() }
      }
    }
  });

  const member1 = await prisma.user.create({
    data: {
      email: 'dev@example.com',
      passwordHash,
      firstName: 'Alice',
      lastName: 'Dev',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      userRoles: { create: { roleId: memberRole.id } },
      loginStreak: {
        create: { currentStreak: 8, longestStreak: 14, totalActiveDays: 28, lastActiveDate: new Date() }
      }
    }
  });

  const member2 = await prisma.user.create({
    data: {
      email: 'qa@example.com',
      passwordHash,
      firstName: 'Bob',
      lastName: 'QA',
      avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
      userRoles: { create: { roleId: memberRole.id } },
      loginStreak: {
        create: { currentStreak: 3, longestStreak: 9, totalActiveDays: 15, lastActiveDate: new Date() }
      }
    }
  });

  const member3 = await prisma.user.create({
    data: {
      email: 'charlie@example.com',
      passwordHash,
      firstName: 'Charlie',
      lastName: 'Analyst',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      userRoles: { create: { roleId: memberRole.id } },
      loginStreak: {
        create: { currentStreak: 4, longestStreak: 11, totalActiveDays: 19, lastActiveDate: new Date() }
      }
    }
  });

  const member4 = await prisma.user.create({
    data: {
      email: 'diana@example.com',
      passwordHash,
      firstName: 'Diana',
      lastName: 'Specialist',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
      userRoles: { create: { roleId: memberRole.id } },
      loginStreak: {
        create: { currentStreak: 6, longestStreak: 16, totalActiveDays: 24, lastActiveDate: new Date() }
      }
    }
  });

  // 5. Create EXACTLY 2 Clients (Workspaces)
  console.log('[SEED] Creating EXACTLY 2 Client Workspaces (Acme Corporation & TechStart Inc)...');
  const client1 = await prisma.client.create({
    data: {
      name: 'Acme Corporation',
      slug: 'acme-corporation',
      description: 'Global manufacturing and enterprise operations client workspace',
      members: {
        create: [
          { userId: adminUser.id, role: ClientRole.OWNER },
          { userId: manager1.id, role: ClientRole.MAINTAINER },
          { userId: member1.id, role: ClientRole.MEMBER },
          { userId: member2.id, role: ClientRole.MEMBER },
          { userId: member3.id, role: ClientRole.MEMBER }
        ]
      }
    }
  });

  const client2 = await prisma.client.create({
    data: {
      name: 'TechStart Inc',
      slug: 'techstart-inc',
      description: 'High-growth Cloud AI & SaaS software platform client workspace',
      members: {
        create: [
          { userId: adminUser.id, role: ClientRole.OWNER },
          { userId: manager2.id, role: ClientRole.MAINTAINER },
          { userId: manager1.id, role: ClientRole.MAINTAINER },
          { userId: member1.id, role: ClientRole.MEMBER },
          { userId: member3.id, role: ClientRole.MEMBER },
          { userId: member4.id, role: ClientRole.MEMBER }
        ]
      }
    }
  });

  // 6. Create Service Catalog Offerings (Global / Shared)
  console.log('[SEED] Creating 4 Professional Service Types...');
  const stBookkeeping = await prisma.serviceType.create({
    data: {
      name: 'Monthly Bookkeeping',
      description: 'Comprehensive monthly bookkeeping, general ledger reconciliations, and expense tracking.',
      defaultCadence: RecurrenceFrequency.MONTHLY,
      estimatedHours: 12.0
    }
  });

  const stPayroll = await prisma.serviceType.create({
    data: {
      name: 'Bi-Weekly Payroll Processing',
      description: 'Bi-weekly payroll calculations, timesheet approvals, tax withholdings, and direct deposit ACH preparation.',
      defaultCadence: RecurrenceFrequency.WEEKLY,
      estimatedHours: 6.0
    }
  });

  const stTaxCompliance = await prisma.serviceType.create({
    data: {
      name: 'Quarterly Tax Compliance',
      description: 'Quarterly state and federal estimated tax aggregation, documentation review, and compliance filing.',
      defaultCadence: RecurrenceFrequency.MONTHLY,
      estimatedHours: 15.0
    }
  });

  const stAuditAdvisory = await prisma.serviceType.create({
    data: {
      name: 'Financial Audit & SOC2 Advisory',
      description: 'Annual internal controls audit, financial risk assessment, and compliance readiness review.',
      defaultCadence: RecurrenceFrequency.YEARLY,
      estimatedHours: 40.0
    }
  });

  // 7. Create Task Templates with Template Items & Variables for Both Workspaces
  console.log('[SEED] Creating Task Templates with structured items & variables for both workspaces...');
  const templateAcmeBookkeeping = await prisma.taskTemplate.create({
    data: {
      name: 'Standard Monthly Bookkeeping Template',
      description: 'Standard checklist template for monthly bookkeeping engagements',
      defaultTitle: '{{client_name}} - Monthly Bookkeeping ({{period_start}})',
      defaultBody: 'Monthly bookkeeping deliverables for {{service_name}} covering {{period_start}} to {{period_end}}.',
      clientId: client1.id,
      serviceTypeId: stBookkeeping.id,
      estimatedHours: 12.0,
      defaultPriority: TaskPriority.HIGH,
      createdById: manager1.id,
      templateItems: {
        create: [
          {
            title: '{{client_name}} - Bank & Credit Card Reconciliations ({{period_start}})',
            description: 'Import and reconcile all operating account transactions for {{service_name}}.',
            position: 0,
            estimatedHours: 4.0
          },
          {
            title: '{{client_name}} - Accounts Payable & Receivable Review',
            description: 'Review aging reports, verify outstanding balances, and record accruals.',
            position: 1,
            estimatedHours: 4.0
          },
          {
            title: '{{client_name}} - Month-End Financial Statements Prep',
            description: 'Generate Profit & Loss, Balance Sheet, and Trial Balance statements for manager sign-off.',
            position: 2,
            estimatedHours: 4.0
          }
        ]
      }
    }
  });

  const templateAcmePayroll = await prisma.taskTemplate.create({
    data: {
      name: 'Bi-Weekly Payroll Processing Checklist',
      description: 'Standard operational steps for running bi-weekly employee payroll',
      defaultTitle: '{{client_name}} - Payroll Processing ({{period_start}})',
      defaultBody: 'Payroll operational batch for {{client_name}}.',
      clientId: client1.id,
      serviceTypeId: stPayroll.id,
      estimatedHours: 6.0,
      defaultPriority: TaskPriority.URGENT,
      createdById: manager1.id,
      templateItems: {
        create: [
          {
            title: '{{client_name}} - Timesheet Verification & Overtime Audit',
            description: 'Collect timesheet approvals and verify overtime / PTO hours for {{period_start}} to {{period_end}}.',
            position: 0,
            estimatedHours: 2.0
          },
          {
            title: '{{client_name}} - Tax Deductions & Direct Deposit Batch',
            description: 'Calculate federal/state withholdings and submit ACH batch file for execution.',
            position: 1,
            estimatedHours: 4.0
          }
        ]
      }
    }
  });

  const templateTechStartTax = await prisma.taskTemplate.create({
    data: {
      name: 'Quarterly Tax Compliance Review',
      description: 'Quarterly state and federal tax estimation review and advisory checklist',
      defaultTitle: '{{client_name}} - Tax Compliance ({{period_start}})',
      defaultBody: 'Quarterly tax compilation for {{client_name}}.',
      clientId: client2.id,
      serviceTypeId: stTaxCompliance.id,
      estimatedHours: 15.0,
      defaultPriority: TaskPriority.HIGH,
      createdById: manager2.id,
      templateItems: {
        create: [
          {
            title: '{{client_name}} - Quarterly Revenue & Deduction Aggregation',
            description: 'Aggregate all revenue accounts and deductible expenses for {{period_start}} through {{period_end}}.',
            position: 0,
            estimatedHours: 8.0
          },
          {
            title: '{{client_name}} - Tax Filing Submission & Client Advisory',
            description: 'Complete quarterly filing forms and deliver estimated payment vouchers.',
            position: 1,
            estimatedHours: 7.0
          }
        ]
      }
    }
  });

  const templateTechStartAudit = await prisma.taskTemplate.create({
    data: {
      name: 'Annual SOC2 & Controls Readiness',
      description: 'Comprehensive audit readiness checklist for SaaS cloud infrastructure',
      defaultTitle: '{{client_name}} - SOC2 Compliance Audit ({{period_start}})',
      defaultBody: 'Annual controls audit for {{client_name}}.',
      clientId: client2.id,
      serviceTypeId: stAuditAdvisory.id,
      estimatedHours: 40.0,
      defaultPriority: TaskPriority.HIGH,
      createdById: manager2.id,
      templateItems: {
        create: [
          {
            title: '{{client_name}} - Access Control & Multi-Factor Authentication Review',
            description: 'Inspect IAM policies, privileged access logs, and revocation procedures.',
            position: 0,
            estimatedHours: 15.0
          },
          {
            title: '{{client_name}} - Data Encryption & Backup Verification',
            description: 'Audit KMS encryption at rest and in transit across all production datastores.',
            position: 1,
            estimatedHours: 15.0
          },
          {
            title: '{{client_name}} - Final SOC2 Type II Attestation Sign-off',
            description: 'Package evidence items and present to third-party auditors.',
            position: 2,
            estimatedHours: 10.0
          }
        ]
      }
    }
  });

  // 8. Create Engagements in both Workspaces
  console.log('[SEED] Creating Engagements for both Workspaces...');
  const engagementAcme1 = await prisma.engagement.create({
    data: {
      clientId: client1.id,
      serviceTypeId: stBookkeeping.id,
      title: 'Acme Corp - September 2026 Monthly Bookkeeping',
      description: 'Monthly ledger closure and bookkeeping service for Acme Corporation',
      status: EngagementStatus.ACTIVE,
      periodStart: new Date('2026-09-01T00:00:00Z'),
      periodEnd: new Date('2026-09-30T23:59:59Z'),
      dueDate: new Date('2026-10-05T00:00:00Z'),
      managerId: manager1.id,
      createdById: manager1.id
    }
  });

  const engagementAcme2 = await prisma.engagement.create({
    data: {
      clientId: client1.id,
      serviceTypeId: stPayroll.id,
      title: 'Acme Corp - Sept Period 1 Payroll',
      description: 'First half payroll processing for September 2026',
      status: EngagementStatus.ACTIVE,
      periodStart: new Date('2026-09-01T00:00:00Z'),
      periodEnd: new Date('2026-09-15T23:59:59Z'),
      dueDate: new Date('2026-09-17T00:00:00Z'),
      managerId: manager1.id,
      createdById: manager1.id
    }
  });

  const engagementTechStart1 = await prisma.engagement.create({
    data: {
      clientId: client2.id,
      serviceTypeId: stTaxCompliance.id,
      title: 'TechStart Inc - Q3 2026 Tax Compliance',
      description: 'Quarter 3 sales and corporate estimated tax compliance',
      status: EngagementStatus.ACTIVE,
      periodStart: new Date('2026-07-01T00:00:00Z'),
      periodEnd: new Date('2026-09-30T23:59:59Z'),
      dueDate: new Date('2026-10-15T00:00:00Z'),
      managerId: manager2.id,
      createdById: manager2.id
    }
  });

  const engagementTechStart2 = await prisma.engagement.create({
    data: {
      clientId: client2.id,
      serviceTypeId: stAuditAdvisory.id,
      title: 'TechStart Inc - 2026 SOC2 Audit Readiness',
      description: 'Annual cloud compliance and security audit readiness review',
      status: EngagementStatus.ACTIVE,
      periodStart: new Date('2026-01-01T00:00:00Z'),
      periodEnd: new Date('2026-12-31T23:59:59Z'),
      dueDate: new Date('2026-11-30T00:00:00Z'),
      managerId: manager2.id,
      createdById: manager2.id
    }
  });

  // 9. Create Labels for both Workspaces
  console.log('[SEED] Creating Labels for both Workspaces...');
  const labelUrgent1 = await prisma.label.create({
    data: { clientId: client1.id, name: 'Urgent', color: '#EF4444', description: 'Immediate priority' }
  });
  const labelAccounting1 = await prisma.label.create({
    data: { clientId: client1.id, name: 'Accounting', color: '#10B981', description: 'Financial ledger tasks' }
  });
  const labelReview1 = await prisma.label.create({
    data: { clientId: client1.id, name: 'Review Needed', color: '#F59E0B', description: 'Awaiting manager sign-off' }
  });
  const labelPayroll1 = await prisma.label.create({
    data: { clientId: client1.id, name: 'Payroll', color: '#8B5CF6', description: 'Payroll processing operations' }
  });

  const labelUrgent2 = await prisma.label.create({
    data: { clientId: client2.id, name: 'Urgent', color: '#EF4444', description: 'Immediate priority' }
  });
  const labelTax2 = await prisma.label.create({
    data: { clientId: client2.id, name: 'Tax', color: '#06B6D4', description: 'Tax compliance & returns' }
  });
  const labelSecurity2 = await prisma.label.create({
    data: { clientId: client2.id, name: 'Security & Audit', color: '#EC4899', description: 'SOC2 & security controls' }
  });
  const labelReview2 = await prisma.label.create({
    data: { clientId: client2.id, name: 'Review Needed', color: '#F59E0B', description: 'Awaiting manager sign-off' }
  });

  // 10. Create Workflow Definitions, States, and Transitions for both Workspaces
  console.log('[SEED] Creating Workflow State Machines for both Workspaces...');

  // Workspace 1 Workflow: "Client Deliverable Workflow"
  const wfAcme = await prisma.workflowDefinition.create({
    data: {
      name: 'Client Deliverable Workflow',
      description: 'Standard 4-state review workflow: NOT_STARTED -> IN_PROGRESS -> READY_FOR_REVIEW -> COMPLETED',
      status: WorkflowStatus.ACTIVE,
      version: 1,
      clientId: client1.id,
      createdById: manager1.id
    }
  });

  const stateAcmeNotStarted = await prisma.workflowState.create({
    data: { workflowId: wfAcme.id, name: 'NOT_STARTED', slug: 'not_started', color: '#64748B', isInitial: true, position: 0 }
  });
  const stateAcmeInProgress = await prisma.workflowState.create({
    data: { workflowId: wfAcme.id, name: 'IN_PROGRESS', slug: 'in_progress', color: '#3B82F6', position: 1 }
  });
  const stateAcmeReview = await prisma.workflowState.create({
    data: { workflowId: wfAcme.id, name: 'READY_FOR_REVIEW', slug: 'ready_for_review', color: '#F59E0B', position: 2 }
  });
  const stateAcmeCompleted = await prisma.workflowState.create({
    data: { workflowId: wfAcme.id, name: 'COMPLETED', slug: 'completed', color: '#10B981', isTerminal: true, position: 3 }
  });

  await prisma.workflowDefinition.update({
    where: { id: wfAcme.id },
    data: { initialStateId: stateAcmeNotStarted.id }
  });

  // Transitions for Acme
  const trans1 = await prisma.workflowTransition.create({
    data: {
      workflowId: wfAcme.id,
      fromStateId: stateAcmeNotStarted.id,
      toStateId: stateAcmeInProgress.id,
      name: 'Start Work'
    }
  });
  const trans2 = await prisma.workflowTransition.create({
    data: {
      workflowId: wfAcme.id,
      fromStateId: stateAcmeInProgress.id,
      toStateId: stateAcmeReview.id,
      name: 'Submit for Review'
    }
  });
  const trans3 = await prisma.workflowTransition.create({
    data: {
      workflowId: wfAcme.id,
      fromStateId: stateAcmeReview.id,
      toStateId: stateAcmeCompleted.id,
      name: 'Approve Deliverable',
      conditions: {
        create: {
          conditionType: TransitionConditionType.ROLE_CHECK,
          config: { allowedRoles: ['ADMIN', 'MANAGER'] },
          errorMessage: 'Only Managers and Admins can approve deliverables.'
        }
      },
      hooks: {
        create: {
          hookType: HookEventType.NOTIFY_ASSIGNEE,
          config: { message: 'Deliverable has been approved!' },
          execOrder: 0
        }
      }
    }
  });
  const trans4 = await prisma.workflowTransition.create({
    data: {
      workflowId: wfAcme.id,
      fromStateId: stateAcmeReview.id,
      toStateId: stateAcmeInProgress.id,
      name: 'Request Changes'
    }
  });

  // Workspace 2 Workflow: "SaaS Deliverable Workflow"
  const wfTechStart = await prisma.workflowDefinition.create({
    data: {
      name: 'SaaS Deliverable Workflow',
      description: 'Standard 4-state review workflow: NOT_STARTED -> IN_PROGRESS -> READY_FOR_REVIEW -> COMPLETED',
      status: WorkflowStatus.ACTIVE,
      version: 1,
      clientId: client2.id,
      createdById: manager2.id
    }
  });

  const stateTechStartNotStarted = await prisma.workflowState.create({
    data: { workflowId: wfTechStart.id, name: 'NOT_STARTED', slug: 'not_started', color: '#64748B', isInitial: true, position: 0 }
  });
  const stateTechStartInProgress = await prisma.workflowState.create({
    data: { workflowId: wfTechStart.id, name: 'IN_PROGRESS', slug: 'in_progress', color: '#3B82F6', position: 1 }
  });
  const stateTechStartReview = await prisma.workflowState.create({
    data: { workflowId: wfTechStart.id, name: 'READY_FOR_REVIEW', slug: 'ready_for_review', color: '#F59E0B', position: 2 }
  });
  const stateTechStartCompleted = await prisma.workflowState.create({
    data: { workflowId: wfTechStart.id, name: 'COMPLETED', slug: 'completed', color: '#10B981', isTerminal: true, position: 3 }
  });

  await prisma.workflowDefinition.update({
    where: { id: wfTechStart.id },
    data: { initialStateId: stateTechStartNotStarted.id }
  });

  await prisma.workflowTransition.create({
    data: { workflowId: wfTechStart.id, fromStateId: stateTechStartNotStarted.id, toStateId: stateTechStartInProgress.id, name: 'Start Work' }
  });
  const transTech2 = await prisma.workflowTransition.create({
    data: { workflowId: wfTechStart.id, fromStateId: stateTechStartInProgress.id, toStateId: stateTechStartReview.id, name: 'Submit for Review' }
  });
  const transTech3 = await prisma.workflowTransition.create({
    data: {
      workflowId: wfTechStart.id,
      fromStateId: stateTechStartReview.id,
      toStateId: stateTechStartCompleted.id,
      name: 'Approve & Complete',
      conditions: {
        create: {
          conditionType: TransitionConditionType.ROLE_CHECK,
          config: { allowedRoles: ['ADMIN', 'MANAGER'] },
          errorMessage: 'Only Managers or Admins can sign off and file.'
        }
      }
    }
  });
  await prisma.workflowTransition.create({
    data: { workflowId: wfTechStart.id, fromStateId: stateTechStartReview.id, toStateId: stateTechStartInProgress.id, name: 'Request Changes' }
  });

  // 11. Create Rich Set of Tasks for Both Workspaces (covering all review statuses & edge cases)
  console.log('[SEED] Creating rich task fixtures across all review statuses...');
  const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
  const overdueDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  // --- ACME CORPORATION TASKS ---
  const taskAcme1 = await prisma.task.create({
    data: {
      title: 'Acme Corporation - Bank & Credit Card Reconciliations (2026-09-01)',
      description: 'Reconcile 4 bank operating accounts and 2 corporate Amex cards.',
      status: TaskStatus.READY_FOR_REVIEW,
      priority: TaskPriority.HIGH,
      clientId: client1.id,
      engagementId: engagementAcme1.id,
      reporterId: manager1.id,
      assigneeId: member1.id,
      estimatedHours: 4.0,
      actualHours: 3.8,
      dueDate: futureDate,
      position: 0,
      watchers: { create: { userId: manager1.id } },
      taskLabels: { create: [{ labelId: labelAccounting1.id }, { labelId: labelReview1.id }] },
      workflowAssignment: {
        create: { workflowId: wfAcme.id, currentStateId: stateAcmeReview.id }
      }
    }
  });

  const taskAcme2 = await prisma.task.create({
    data: {
      title: 'Acme Corporation - Accounts Payable & Receivable Review',
      description: 'Audit unapplied customer credits and vendor debit memos.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.MEDIUM,
      clientId: client1.id,
      engagementId: engagementAcme1.id,
      reporterId: manager1.id,
      assigneeId: member2.id,
      estimatedHours: 4.0,
      actualHours: 2.0,
      dueDate: futureDate,
      position: 1,
      watchers: { create: { userId: manager1.id } },
      taskLabels: { create: [{ labelId: labelAccounting1.id }] },
      workflowAssignment: {
        create: { workflowId: wfAcme.id, currentStateId: stateAcmeInProgress.id }
      }
    }
  });

  const taskAcme3 = await prisma.task.create({
    data: {
      title: 'Acme Corporation - Month-End Financial Statements Prep',
      description: 'Draft balance sheet and income statements for executive presentation.',
      status: TaskStatus.NOT_STARTED,
      priority: TaskPriority.HIGH,
      clientId: client1.id,
      engagementId: engagementAcme1.id,
      reporterId: manager1.id,
      assigneeId: member1.id,
      estimatedHours: 4.0,
      dueDate: futureDate,
      position: 2,
      taskLabels: { create: [{ labelId: labelAccounting1.id }] },
      workflowAssignment: {
        create: { workflowId: wfAcme.id, currentStateId: stateAcmeNotStarted.id }
      }
    }
  });

  const taskAcme4 = await prisma.task.create({
    data: {
      title: 'Acme Corporation - Fixed Asset Depreciation Schedule',
      description: 'Calculate monthly MACRS depreciation on newly acquired warehouse machinery.',
      status: TaskStatus.COMPLETED,
      priority: TaskPriority.MEDIUM,
      clientId: client1.id,
      engagementId: engagementAcme1.id,
      reporterId: manager1.id,
      assigneeId: member1.id,
      estimatedHours: 2.5,
      actualHours: 2.1,
      completedAt: new Date(),
      position: 3,
      taskLabels: { create: [{ labelId: labelAccounting1.id }] },
      workflowAssignment: {
        create: { workflowId: wfAcme.id, currentStateId: stateAcmeCompleted.id }
      }
    }
  });

  const taskAcme5 = await prisma.task.create({
    data: {
      title: 'Acme Corporation - Missing Expense Receipts Clarification',
      description: 'Awaiting client vendor receipts for $14,200 in international travel expenses.',
      status: TaskStatus.WAITING_FOR_CLIENT,
      priority: TaskPriority.HIGH,
      clientId: client1.id,
      engagementId: engagementAcme1.id,
      reporterId: manager1.id,
      assigneeId: member2.id,
      estimatedHours: 1.5,
      dueDate: futureDate,
      position: 4,
      taskLabels: { create: [{ labelId: labelAccounting1.id }] }
    }
  });

  const taskAcme6 = await prisma.task.create({
    data: {
      title: 'Acme Corporation - Journal Entry Adjustments for Inventory Shrinkage',
      description: 'Review physical inventory count variance and prepare adjusting journal entries.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      clientId: client1.id,
      engagementId: engagementAcme1.id,
      reporterId: manager1.id,
      assigneeId: member1.id,
      estimatedHours: 3.0,
      actualHours: 2.5,
      dueDate: futureDate,
      position: 5,
      taskLabels: { create: [{ labelId: labelAccounting1.id }, { labelId: labelReview1.id }] },
      workflowAssignment: {
        create: { workflowId: wfAcme.id, currentStateId: stateAcmeInProgress.id }
      }
    }
  });

  const taskAcme7 = await prisma.task.create({
    data: {
      title: 'Acme Corporation - Timesheet Verification & Overtime Audit',
      description: 'Cross-check clock punches against manager sign-offs for factory shifts.',
      status: TaskStatus.READY_FOR_REVIEW,
      priority: TaskPriority.URGENT,
      clientId: client1.id,
      engagementId: engagementAcme2.id,
      reporterId: manager1.id,
      assigneeId: member2.id,
      estimatedHours: 2.0,
      actualHours: 1.9,
      dueDate: futureDate,
      position: 6,
      taskLabels: { create: [{ labelId: labelPayroll1.id }, { labelId: labelUrgent1.id }] },
      workflowAssignment: {
        create: { workflowId: wfAcme.id, currentStateId: stateAcmeReview.id }
      }
    }
  });

  const taskAcme8Overdue = await prisma.task.create({
    data: {
      title: 'Acme Corporation - Prior Year Supplier Contract Liability Audit',
      description: 'Historical supplier contract liability audit overdue from last quarter.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      clientId: client1.id,
      engagementId: engagementAcme1.id,
      reporterId: manager1.id,
      assigneeId: member1.id,
      estimatedHours: 3.0,
      actualHours: 1.0,
      dueDate: overdueDate,
      position: 7,
      taskLabels: { create: [{ labelId: labelAccounting1.id }, { labelId: labelUrgent1.id }] },
      workflowAssignment: {
        create: { workflowId: wfAcme.id, currentStateId: stateAcmeInProgress.id }
      }
    }
  });

  // Subtask example
  await prisma.task.create({
    data: {
      title: 'Acme Corporation - Verify Amex Executive Card Signatures',
      description: 'Collect signed expense logs for CEO and CFO card transactions.',
      status: TaskStatus.COMPLETED,
      priority: TaskPriority.MEDIUM,
      clientId: client1.id,
      engagementId: engagementAcme1.id,
      parentTaskId: taskAcme1.id,
      reporterId: manager1.id,
      assigneeId: member1.id,
      estimatedHours: 1.0,
      actualHours: 0.9,
      completedAt: new Date(),
      position: 0
    }
  });

  // --- TECHSTART INC TASKS ---
  const taskTech1 = await prisma.task.create({
    data: {
      title: 'TechStart Inc - Quarterly Revenue & Deduction Aggregation',
      description: 'Pull Stripe transaction reports and reconcile international VAT liabilities.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      clientId: client2.id,
      engagementId: engagementTechStart1.id,
      reporterId: manager2.id,
      assigneeId: member3.id,
      estimatedHours: 8.0,
      actualHours: 4.5,
      dueDate: futureDate,
      position: 0,
      taskLabels: { create: [{ labelId: labelTax2.id }] },
      workflowAssignment: {
        create: { workflowId: wfTechStart.id, currentStateId: stateTechStartInProgress.id }
      }
    }
  });

  const taskTech2 = await prisma.task.create({
    data: {
      title: 'TechStart Inc - R&D Tax Credit Calculation Study',
      description: 'Review qualified research expenses (QREs) for cloud computing engineering teams.',
      status: TaskStatus.READY_FOR_REVIEW,
      priority: TaskPriority.HIGH,
      clientId: client2.id,
      engagementId: engagementTechStart1.id,
      reporterId: manager2.id,
      assigneeId: member4.id,
      estimatedHours: 6.0,
      actualHours: 5.8,
      dueDate: futureDate,
      position: 1,
      taskLabels: { create: [{ labelId: labelTax2.id }, { labelId: labelReview2.id }] },
      workflowAssignment: {
        create: { workflowId: wfTechStart.id, currentStateId: stateTechStartReview.id }
      }
    }
  });

  const taskTech3 = await prisma.task.create({
    data: {
      title: 'TechStart Inc - Tax Filing Submission & Client Advisory',
      description: 'Prepare Form 1120-W quarterly estimated tax vouchers and schedule sign-off meeting.',
      status: TaskStatus.NOT_STARTED,
      priority: TaskPriority.HIGH,
      clientId: client2.id,
      engagementId: engagementTechStart1.id,
      reporterId: manager2.id,
      assigneeId: member3.id,
      estimatedHours: 7.0,
      dueDate: futureDate,
      position: 2,
      taskLabels: { create: [{ labelId: labelTax2.id }] },
      workflowAssignment: {
        create: { workflowId: wfTechStart.id, currentStateId: stateTechStartNotStarted.id }
      }
    }
  });

  const taskTech4 = await prisma.task.create({
    data: {
      title: 'TechStart Inc - Access Control & MFA Policy Audit',
      description: 'Inspect AWS IAM and Okta SAML logs for SOC2 compliance controls.',
      status: TaskStatus.READY_FOR_REVIEW,
      priority: TaskPriority.URGENT,
      clientId: client2.id,
      engagementId: engagementTechStart2.id,
      reporterId: manager2.id,
      assigneeId: member1.id,
      estimatedHours: 10.0,
      actualHours: 9.5,
      dueDate: futureDate,
      position: 3,
      taskLabels: { create: [{ labelId: labelSecurity2.id }, { labelId: labelUrgent2.id }] },
      workflowAssignment: {
        create: { workflowId: wfTechStart.id, currentStateId: stateTechStartReview.id }
      }
    }
  });

  const taskTech5 = await prisma.task.create({
    data: {
      title: 'TechStart Inc - Data Encryption at Rest Verification',
      description: 'Audit KMS encryption key rotation policies across S3 buckets and Aurora DB clusters.',
      status: TaskStatus.COMPLETED,
      priority: TaskPriority.HIGH,
      clientId: client2.id,
      engagementId: engagementTechStart2.id,
      reporterId: manager2.id,
      assigneeId: member1.id,
      estimatedHours: 6.0,
      actualHours: 5.5,
      completedAt: new Date(),
      position: 4,
      taskLabels: { create: [{ labelId: labelSecurity2.id }] },
      workflowAssignment: {
        create: { workflowId: wfTechStart.id, currentStateId: stateTechStartCompleted.id }
      }
    }
  });

  const taskTech6Waiting = await prisma.task.create({
    data: {
      title: 'TechStart Inc - Awaiting Client Signed Engagement Letter',
      description: 'Pending legal signature from TechStart VP Finance for annual audit addendum.',
      status: TaskStatus.WAITING_FOR_CLIENT,
      priority: TaskPriority.HIGH,
      clientId: client2.id,
      engagementId: engagementTechStart2.id,
      reporterId: manager2.id,
      assigneeId: member4.id,
      estimatedHours: 2.0,
      dueDate: futureDate,
      position: 5,
      taskLabels: { create: [{ labelId: labelSecurity2.id }] }
    }
  });

  const taskTech7Overdue = await prisma.task.create({
    data: {
      title: 'TechStart Inc - Historical Nexus State Assessment Review',
      description: 'Evaluate sales tax liability thresholds overdue from previous quarter.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      clientId: client2.id,
      engagementId: engagementTechStart1.id,
      reporterId: manager2.id,
      assigneeId: member3.id,
      estimatedHours: 5.0,
      actualHours: 2.0,
      dueDate: overdueDate,
      position: 6,
      taskLabels: { create: [{ labelId: labelTax2.id }, { labelId: labelUrgent2.id }] },
      workflowAssignment: {
        create: { workflowId: wfTechStart.id, currentStateId: stateTechStartInProgress.id }
      }
    }
  });

  // Add Comments to Tasks
  console.log('[SEED] Adding Comments & Review feedback...');
  await prisma.taskComment.create({
    data: {
      taskId: taskAcme6.id,
      userId: manager1.id,
      content: 'Changes Requested: Please include the signed warehouse inventory count sheets.'
    }
  });

  await prisma.taskComment.create({
    data: {
      taskId: taskAcme6.id,
      userId: member1.id,
      content: 'Understood, scanning and attaching the physical count documents now.'
    }
  });

  await prisma.taskComment.create({
    data: {
      taskId: taskAcme4.id,
      userId: manager1.id,
      content: 'Reviewed and approved. MACRS depreciation schedule matches tax book values.'
    }
  });

  await prisma.taskComment.create({
    data: {
      taskId: taskTech5.id,
      userId: manager2.id,
      content: 'Great work! All 24 S3 buckets have default KMS encryption enabled.'
    }
  });

  // 12. Create Recurring Task Rules for Both Workspaces
  console.log('[SEED] Creating Recurring Task Rules for both Workspaces...');
  // Workspace 1 (Acme Corporation) Recurring Schedules
  const recurrenceRule1 = await prisma.recurrenceRule.create({
    data: {
      taskTemplateId: taskAcme1.id,
      frequency: RecurrenceFrequency.MONTHLY,
      interval: 1,
      startDate: new Date('2026-09-01T00:00:00Z'),
      nextOccurrence: new Date('2026-10-01T00:00:00Z'),
      status: RecurrenceStatus.ACTIVE,
      createdById: manager1.id,
      monthlyConfig: {
        create: { dayOfMonth: 1 }
      },
      instances: {
        create: [
          {
            scheduledFor: new Date('2026-09-01T00:00:00Z'),
            status: InstanceStatus.GENERATED,
            generatedTaskId: taskAcme1.id,
            generatedAt: new Date('2026-09-01T00:00:05Z')
          },
          {
            scheduledFor: new Date('2026-10-01T00:00:00Z'),
            status: InstanceStatus.PENDING
          }
        ]
      }
    }
  });

  const recurrenceRule2 = await prisma.recurrenceRule.create({
    data: {
      taskTemplateId: taskAcme7.id,
      frequency: RecurrenceFrequency.WEEKLY,
      interval: 2,
      startDate: new Date('2026-09-01T00:00:00Z'),
      nextOccurrence: new Date('2026-09-15T00:00:00Z'),
      status: RecurrenceStatus.ACTIVE,
      createdById: manager1.id,
      weeklyDays: {
        create: [{ dayOfWeek: DayOfWeek.MON }]
      },
      instances: {
        create: [
          {
            scheduledFor: new Date('2026-09-01T00:00:00Z'),
            status: InstanceStatus.GENERATED,
            generatedTaskId: taskAcme7.id,
            generatedAt: new Date('2026-09-01T00:00:05Z')
          },
          {
            scheduledFor: new Date('2026-09-15T00:00:00Z'),
            status: InstanceStatus.PENDING
          }
        ]
      }
    }
  });

  // Workspace 2 (TechStart Inc) Recurring Schedules
  const recurrenceRule3 = await prisma.recurrenceRule.create({
    data: {
      taskTemplateId: taskTech1.id,
      frequency: RecurrenceFrequency.MONTHLY,
      interval: 1,
      startDate: new Date('2026-09-01T00:00:00Z'),
      nextOccurrence: new Date('2026-10-01T00:00:00Z'),
      status: RecurrenceStatus.ACTIVE,
      createdById: manager2.id,
      monthlyConfig: {
        create: { dayOfMonth: 15 }
      },
      instances: {
        create: [
          {
            scheduledFor: new Date('2026-09-01T00:00:00Z'),
            status: InstanceStatus.GENERATED,
            generatedTaskId: taskTech1.id,
            generatedAt: new Date('2026-09-01T00:00:05Z')
          },
          {
            scheduledFor: new Date('2026-10-01T00:00:00Z'),
            status: InstanceStatus.PENDING
          }
        ]
      }
    }
  });

  const recurrenceRule4 = await prisma.recurrenceRule.create({
    data: {
      taskTemplateId: taskTech4.id,
      frequency: RecurrenceFrequency.WEEKLY,
      interval: 1,
      startDate: new Date('2026-09-01T00:00:00Z'),
      nextOccurrence: new Date('2026-09-08T00:00:00Z'),
      status: RecurrenceStatus.ACTIVE,
      createdById: manager2.id,
      weeklyDays: {
        create: [{ dayOfWeek: DayOfWeek.FRI }]
      },
      instances: {
        create: [
          {
            scheduledFor: new Date('2026-09-01T00:00:00Z'),
            status: InstanceStatus.GENERATED,
            generatedTaskId: taskTech4.id,
            generatedAt: new Date('2026-09-01T00:00:05Z')
          },
          {
            scheduledFor: new Date('2026-09-08T00:00:00Z'),
            status: InstanceStatus.PENDING
          }
        ]
      }
    }
  });

  // 13. Create Workflow Transition Histories for Both Workspaces
  console.log('[SEED] Creating Workflow Transition Histories...');
  await prisma.workflowTransitionHistory.create({
    data: {
      taskId: taskAcme1.id,
      transitionId: trans2.id,
      fromStateId: stateAcmeInProgress.id,
      toStateId: stateAcmeReview.id,
      fromStateName: 'IN_PROGRESS',
      toStateName: 'READY_FOR_REVIEW',
      triggeredById: member1.id,
      comment: 'Completed bank reconciliations for all 4 operating accounts.'
    }
  });

  await prisma.workflowTransitionHistory.create({
    data: {
      taskId: taskAcme4.id,
      transitionId: trans3.id,
      fromStateId: stateAcmeReview.id,
      toStateId: stateAcmeCompleted.id,
      fromStateName: 'READY_FOR_REVIEW',
      toStateName: 'COMPLETED',
      triggeredById: manager1.id,
      comment: 'Depreciation calculations verified and signed off.'
    }
  });

  await prisma.workflowTransitionHistory.create({
    data: {
      taskId: taskTech2.id,
      transitionId: transTech2.id,
      fromStateId: stateTechStartInProgress.id,
      toStateId: stateTechStartReview.id,
      fromStateName: 'IN_PROGRESS',
      toStateName: 'READY_FOR_REVIEW',
      triggeredById: member4.id,
      comment: 'Completed R&D tax study documentation for engineering expenses.'
    }
  });

  await prisma.workflowTransitionHistory.create({
    data: {
      taskId: taskTech5.id,
      transitionId: transTech3.id,
      fromStateId: stateTechStartReview.id,
      toStateId: stateTechStartCompleted.id,
      fromStateName: 'READY_FOR_REVIEW',
      toStateName: 'COMPLETED',
      triggeredById: manager2.id,
      comment: 'All KMS key rotation policies verified and approved.'
    }
  });

  // 14. Create Automation Rules
  console.log('[SEED] Creating Automation Rules...');
  await prisma.automationRule.create({
    data: {
      clientId: client1.id,
      name: 'Auto-tag Review Needed on Submission',
      description: 'When task status transitions to READY_FOR_REVIEW, attach the Review Needed label.',
      triggerType: RuleTriggerType.TASK_STATUS_CHANGED,
      triggerConfig: { targetStatus: 'READY_FOR_REVIEW' },
      actions: [{ type: 'ADD_LABEL', labelName: 'Review Needed' }],
      isActive: true,
      executionCount: 14,
      lastTriggeredAt: new Date(),
      createdById: manager1.id
    }
  });

  await prisma.automationRule.create({
    data: {
      clientId: client2.id,
      name: 'Notify Manager on Urgent Task Creation',
      description: 'Send instant notification to Engagement Manager when an URGENT task is created.',
      triggerType: RuleTriggerType.TASK_CREATED,
      triggerConfig: { priority: 'URGENT' },
      actions: [{ type: 'SEND_NOTIFICATION', recipientRole: 'MANAGER' }],
      isActive: true,
      executionCount: 8,
      lastTriggeredAt: new Date(),
      createdById: manager2.id
    }
  });

  // 15. Create Audit Trail & User Activity Logs
  console.log('[SEED] Creating Audit Trail & Activity Logs...');
  await prisma.auditLog.create({
    data: {
      entityType: 'Task',
      entityId: taskAcme1.id,
      operation: AuditOperation.TRANSITION,
      oldValues: { status: 'IN_PROGRESS' },
      newValues: { status: 'READY_FOR_REVIEW' },
      changedFields: ['status'],
      performedById: member1.id,
      ipAddress: '192.168.1.101',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      context: { clientName: 'Acme Corporation', engagementTitle: 'Acme Corp - September 2026 Monthly Bookkeeping' }
    }
  });

  await prisma.auditLog.create({
    data: {
      entityType: 'Task',
      entityId: taskAcme4.id,
      operation: AuditOperation.UPDATE,
      oldValues: { status: 'READY_FOR_REVIEW' },
      newValues: { status: 'COMPLETED' },
      changedFields: ['status', 'completedAt'],
      performedById: manager1.id,
      ipAddress: '192.168.1.50',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      context: { note: 'Four-eyes manager sign-off approved' }
    }
  });

  await prisma.auditLog.create({
    data: {
      entityType: 'Engagement',
      entityId: engagementAcme1.id,
      operation: AuditOperation.CREATE,
      newValues: { title: 'Acme Corp - September 2026 Monthly Bookkeeping', status: 'ACTIVE' },
      changedFields: ['title', 'status', 'clientId'],
      performedById: manager1.id,
      ipAddress: '192.168.1.50',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
    }
  });

  await prisma.auditLog.create({
    data: {
      entityType: 'TaskTemplate',
      entityId: templateTechStartTax.id,
      operation: AuditOperation.CREATE,
      newValues: { name: 'Quarterly Tax Compliance Review' },
      changedFields: ['name', 'clientId'],
      performedById: manager2.id,
      ipAddress: '192.168.1.75'
    }
  });

  // User Activity Logs
  const users = [adminUser, manager1, manager2, member1, member2, member3, member4];
  for (const u of users) {
    await prisma.userActivityLog.create({
      data: {
        userId: u.id,
        activityType: ActivityType.LOGIN,
        ipAddress: '192.168.1.100',
        metadata: { client: 'Web App', browser: 'Chrome' }
      }
    });
  }

  // 16. Create Velocity & Performance Metrics for Analytics Charts
  console.log('[SEED] Creating Analytics Metrics for Velocity & Performance charts...');
  const periodStart = new Date('2026-09-01T00:00:00Z');

  // Acme Velocity Metric
  await prisma.taskVelocityMetric.create({
    data: {
      clientId: client1.id,
      periodType: MetricPeriod.MONTHLY,
      periodStart,
      tasksCreated: 18,
      tasksCompleted: 12,
      tasksOverdue: 1,
      avgCycleTimeHrs: 24.5,
      p50CycleTimeHrs: 18.0,
      p90CycleTimeHrs: 42.0,
      throughputRate: 0.6667
    }
  });

  // TechStart Velocity Metric
  await prisma.taskVelocityMetric.create({
    data: {
      clientId: client2.id,
      periodType: MetricPeriod.MONTHLY,
      periodStart,
      tasksCreated: 14,
      tasksCompleted: 9,
      tasksOverdue: 1,
      avgCycleTimeHrs: 28.0,
      p50CycleTimeHrs: 22.5,
      p90CycleTimeHrs: 48.0,
      throughputRate: 0.6428
    }
  });

  // Member Performance Metrics
  await prisma.clientPerformanceMetric.create({
    data: {
      userId: member1.id,
      clientId: client1.id,
      periodType: MetricPeriod.MONTHLY,
      periodStart,
      tasksAssigned: 8,
      tasksCompleted: 6,
      tasksOverdue: 1,
      avgCompletionHrs: 14.2,
      onTimePercentage: 87.5,
      commentsPosted: 12,
      statusTransitions: 15
    }
  });

  await prisma.clientPerformanceMetric.create({
    data: {
      userId: member2.id,
      clientId: client1.id,
      periodType: MetricPeriod.MONTHLY,
      periodStart,
      tasksAssigned: 6,
      tasksCompleted: 4,
      tasksOverdue: 0,
      avgCompletionHrs: 11.5,
      onTimePercentage: 100.0,
      commentsPosted: 8,
      statusTransitions: 10
    }
  });

  await prisma.clientPerformanceMetric.create({
    data: {
      userId: member3.id,
      clientId: client2.id,
      periodType: MetricPeriod.MONTHLY,
      periodStart,
      tasksAssigned: 7,
      tasksCompleted: 5,
      tasksOverdue: 1,
      avgCompletionHrs: 16.0,
      onTimePercentage: 85.7,
      commentsPosted: 9,
      statusTransitions: 11
    }
  });

  // 17. Create Notifications for Users
  console.log('[SEED] Creating Notifications for demo users...');
  await prisma.notification.create({
    data: {
      userId: manager1.id,
      type: NotificationType.TASK_UPDATED,
      title: 'Task Ready for Review',
      message: 'Alice Dev submitted "Acme Corporation - Bank & Credit Card Reconciliations" for manager approval.'
    }
  });

  await prisma.notification.create({
    data: {
      userId: member1.id,
      type: NotificationType.TASK_ASSIGNED,
      title: 'New Task Assigned',
      message: 'You have been assigned to "Acme Corporation - Month-End Financial Statements Prep".'
    }
  });

  await prisma.notification.create({
    data: {
      userId: manager2.id,
      type: NotificationType.TASK_UPDATED,
      title: 'Deliverable Ready for Review',
      message: 'Diana Specialist submitted "TechStart Inc - R&D Tax Credit Calculation Study" for audit review.'
    }
  });

  // 18. Create Dashboard Widgets for Admin and Manager
  console.log('[SEED] Configuring Default Dashboard Widgets...');
  const defaultWidgets = [
    { userId: adminUser.id, widgetType: 'TASK_METRICS', title: 'Task Overview', gridX: 0, gridY: 0, gridW: 6, gridH: 3 },
    { userId: adminUser.id, widgetType: 'PRIORITY_DISTRIBUTION', title: 'Priority Breakdown', gridX: 6, gridY: 0, gridW: 6, gridH: 3 },
    { userId: adminUser.id, widgetType: 'RECENT_ACTIVITY', title: 'Live Audit Feed', gridX: 0, gridY: 3, gridW: 12, gridH: 4 },
    { userId: manager1.id, widgetType: 'TASK_METRICS', title: 'My Team Tasks', gridX: 0, gridY: 0, gridW: 6, gridH: 3 },
    { userId: manager1.id, widgetType: 'PRIORITY_DISTRIBUTION', title: 'Priority Matrix', gridX: 6, gridY: 0, gridW: 6, gridH: 3 }
  ];

  for (const w of defaultWidgets) {
    await prisma.dashboardWidget.create({ data: w });
  }

  console.log('[SEED] Comprehensive 2-Workspace Seeding completed successfully!');
  console.log('Workspaces:');
  console.log(' 1. Acme Corporation (slug: acme-corporation)');
  console.log(' 2. TechStart Inc (slug: techstart-inc)');
  console.log('Demo Logins:');
  console.log(' - Admin: admin@example.com / Password123!');
  console.log(' - Manager 1: manager@example.com / Password123!');
  console.log(' - Manager 2: manager2@example.com / Password123!');
  console.log(' - Member 1 (Dev): dev@example.com / Password123!');
  console.log(' - Member 2 (QA): qa@example.com / Password123!');
  console.log(' - Member 3 (Analyst): charlie@example.com / Password123!');
  console.log(' - Member 4 (Specialist): diana@example.com / Password123!');
}

main()
  .catch((e) => {
    console.error('[SEED] Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
