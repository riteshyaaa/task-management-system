import {
  PrismaClient,
  RoleName,
  TaskStatus,
  TaskPriority,
  ClientRole,
  WorkflowStatus,
  RecurrenceFrequency,
  RecurrenceStatus,
  EngagementStatus,
  ActivityType
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive Professional Services database seeding...');

  // 1. Clean existing records in reverse dependency order
  console.log('🧹 Cleaning existing records...');
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
  console.log('👑 Creating system roles...');
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
  console.log('🛡️ Creating granular system permissions...');
  const permissionsList = [
    // Users module
    { slug: 'users:read', name: 'View Users', module: 'users', description: 'View user profiles and lists' },
    { slug: 'users:write', name: 'Update Users', module: 'users', description: 'Update user profiles' },
    { slug: 'users:delete', name: 'Delete Users', module: 'users', description: 'Soft delete user accounts' },
    { slug: 'roles:manage', name: 'Manage Roles', module: 'roles', description: 'Assign roles and permissions' },

    // Clients module
    { slug: 'teams:create', name: 'Create Clients', module: 'clients', description: 'Create new client workspaces' },
    { slug: 'teams:read', name: 'View Clients', module: 'clients', description: 'View client details and members' },
    { slug: 'teams:update', name: 'Update Clients', module: 'clients', description: 'Update client settings' },
    { slug: 'teams:delete', name: 'Delete Clients', module: 'clients', description: 'Archive or delete clients' },
    { slug: 'teams:manage_members', name: 'Manage Client Members', module: 'clients', description: 'Add or remove members' },

    // Tasks module
    { slug: 'tasks:create', name: 'Create Tasks', module: 'tasks', description: 'Create new tasks and subtasks' },
    { slug: 'tasks:read', name: 'View Tasks', module: 'tasks', description: 'View tasks, comments, and attachments' },
    { slug: 'tasks:update', name: 'Update Tasks', module: 'tasks', description: 'Update task details, assignees, and status' },
    { slug: 'tasks:delete', name: 'Delete Tasks', module: 'tasks', description: 'Soft delete tasks' },
    { slug: 'tasks:bulk_manage', name: 'Bulk Manage Tasks', module: 'tasks', description: 'Perform bulk update on tasks' },

    // Workflows module
    { slug: 'workflows:read', name: 'View Workflows', module: 'workflows', description: 'View workflow state machines' },
    { slug: 'workflows:create', name: 'Create Workflows', module: 'workflows', description: 'Create workflow definitions' },
    { slug: 'workflows:update', name: 'Update Workflows', module: 'workflows', description: 'Modify workflow states' },
    { slug: 'workflows:delete', name: 'Delete Workflows', module: 'workflows', description: 'Archive workflow definitions' },
    { slug: 'workflows:transition', name: 'Execute Transitions', module: 'workflows', description: 'Transition task states' },

    // Templates & Automation
    { slug: 'templates:manage', name: 'Manage Templates', module: 'templates', description: 'Create, update, delete task templates' },
    { slug: 'templates:instantiate', name: 'Use Templates', module: 'templates', description: 'Generate tasks from templates' },
    { slug: 'automation:manage', name: 'Manage Automation Rules', module: 'automation', description: 'Create automation rules' },

    // Recurring Tasks
    { slug: 'recurring:manage', name: 'Manage Recurring Tasks', module: 'recurring', description: 'Setup recurring rules' },
    { slug: 'recurring:read', name: 'View Recurring Tasks', module: 'recurring', description: 'View recurring configs' },

    // Audit & Analytics
    { slug: 'audit:read', name: 'View Audit Logs', module: 'audit', description: 'View append-only audit trail' },
    { slug: 'analytics:read', name: 'View Analytics', module: 'analytics', description: 'View performance & velocity' },
    { slug: 'dashboard:customize', name: 'Customize Dashboard', module: 'dashboard', description: 'Configure dashboard widgets' }
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

  // Manager gets most permissions
  const managerPerms = createdPermissions.filter(p => !['users:delete', 'roles:manage', 'teams:delete'].includes(p.slug));
  await Promise.all(
    managerPerms.map(p =>
      prisma.rolePermission.create({
        data: { roleId: managerRole.id, permissionId: p.id }
      })
    )
  );

  // Member gets standard operational permissions
  const memberPermSlugs = [
    'users:read', 'teams:read', 'tasks:create', 'tasks:read', 'tasks:update',
    'workflows:read', 'workflows:transition', 'templates:instantiate',
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

  // 4. Create Initial Users (1 Admin, 2 Managers, 4 Team Members)
  console.log('👤 Creating initial users (1 Admin, 2 Managers, 4 Members)...');
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

  // 5. Create 5 Clients
  console.log('🏢 Creating 5 Clients...');
  const client1 = await prisma.client.create({
    data: {
      name: 'Acme Corporation',
      slug: 'acme-corporation',
      description: 'Global manufacturing and hardware distribution client',
      members: {
        create: [
          { userId: adminUser.id, role: ClientRole.OWNER },
          { userId: manager1.id, role: ClientRole.MAINTAINER },
          { userId: member1.id, role: ClientRole.MEMBER },
          { userId: member2.id, role: ClientRole.MEMBER }
        ]
      }
    }
  });

  const client2 = await prisma.client.create({
    data: {
      name: 'TechStart Inc',
      slug: 'techstart-inc',
      description: 'High-growth SaaS and AI cloud platform client',
      members: {
        create: [
          { userId: adminUser.id, role: ClientRole.OWNER },
          { userId: manager1.id, role: ClientRole.MAINTAINER },
          { userId: member3.id, role: ClientRole.MEMBER },
          { userId: member4.id, role: ClientRole.MEMBER }
        ]
      }
    }
  });

  const client3 = await prisma.client.create({
    data: {
      name: 'Global Logistics Ltd',
      slug: 'global-logistics-ltd',
      description: 'International freight forwarding and supply chain network',
      members: {
        create: [
          { userId: adminUser.id, role: ClientRole.OWNER },
          { userId: manager2.id, role: ClientRole.MAINTAINER },
          { userId: member1.id, role: ClientRole.MEMBER },
          { userId: member3.id, role: ClientRole.MEMBER }
        ]
      }
    }
  });

  const client4 = await prisma.client.create({
    data: {
      name: 'Apex Retailers',
      slug: 'apex-retailers',
      description: 'Omnichannel retail and e-commerce consumer brand',
      members: {
        create: [
          { userId: adminUser.id, role: ClientRole.OWNER },
          { userId: manager2.id, role: ClientRole.MAINTAINER },
          { userId: member2.id, role: ClientRole.MEMBER }
        ]
      }
    }
  });

  const client5 = await prisma.client.create({
    data: {
      name: 'Summit Health Group',
      slug: 'summit-health-group',
      description: 'Integrated healthcare and clinical research network',
      members: {
        create: [
          { userId: adminUser.id, role: ClientRole.OWNER },
          { userId: manager1.id, role: ClientRole.MAINTAINER },
          { userId: member4.id, role: ClientRole.MEMBER }
        ]
      }
    }
  });

  // 6. Create Service Types
  console.log('📋 Creating 3 Professional Service Types...');
  const stBookkeeping = await prisma.serviceType.create({
    data: {
      name: 'Monthly Bookkeeping',
      description: 'Comprehensive monthly bookkeeping, general ledger reconciliations, and expense tracking.',
      defaultCadence: RecurrenceFrequency.MONTHLY
    }
  });

  const stPayroll = await prisma.serviceType.create({
    data: {
      name: 'Payroll Processing',
      description: 'Bi-weekly payroll calculations, tax withholdings, and direct deposit preparation.',
      defaultCadence: RecurrenceFrequency.WEEKLY
    }
  });

  const stTaxCompliance = await prisma.serviceType.create({
    data: {
      name: 'Quarterly Tax Compliance',
      description: 'Quarterly sales and corporate tax estimation, documentation review, and compliance filing.',
      defaultCadence: RecurrenceFrequency.MONTHLY
    }
  });

  // 7. Create Task Templates with Template Items
  console.log('📑 Creating Task Templates with structured items and interpolation variables...');
  const templateBookkeeping = await prisma.taskTemplate.create({
    data: {
      name: 'Standard Monthly Bookkeeping Template',
      description: 'Standard checklist template for monthly bookkeeping engagements',
      defaultTitle: '{{client_name}} - Monthly Bookkeeping ({{period_start}})',
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

  const templatePayroll = await prisma.taskTemplate.create({
    data: {
      name: 'Bi-Weekly Payroll Processing Checklist',
      description: 'Standard operational steps for running bi-weekly employee payroll',
      defaultTitle: '{{client_name}} - Payroll Processing ({{period_start}})',
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

  const templateTax = await prisma.taskTemplate.create({
    data: {
      name: 'Quarterly Tax Compliance Review',
      description: 'Quarterly state and federal tax estimation review',
      defaultTitle: '{{client_name}} - Tax Compliance ({{period_start}})',
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

  // 8. Create Engagements
  console.log('🤝 Creating Initial Engagements...');
  const engagement1 = await prisma.engagement.create({
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

  const engagement2 = await prisma.engagement.create({
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

  const engagement3 = await prisma.engagement.create({
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

  const engagement4 = await prisma.engagement.create({
    data: {
      clientId: client3.id,
      serviceTypeId: stBookkeeping.id,
      title: 'Global Logistics - September 2026 Bookkeeping',
      description: 'Multi-currency logistics account reconciliations',
      status: EngagementStatus.ACTIVE,
      periodStart: new Date('2026-09-01T00:00:00Z'),
      periodEnd: new Date('2026-09-30T23:59:59Z'),
      dueDate: new Date('2026-10-07T00:00:00Z'),
      managerId: manager2.id,
      createdById: manager2.id
    }
  });

  // 9. Create Labels
  console.log('🏷️ Creating Labels...');
  const labelUrgent = await prisma.label.create({
    data: { clientId: client1.id, name: 'Urgent', color: '#EF4444', description: 'Immediate priority' }
  });
  const labelAccounting = await prisma.label.create({
    data: { clientId: client1.id, name: 'Accounting', color: '#10B981', description: 'Financial ledger tasks' }
  });
  const labelReview = await prisma.label.create({
    data: { clientId: client1.id, name: 'Review Needed', color: '#F59E0B', description: 'Awaiting manager sign-off' }
  });
  const labelPayroll = await prisma.label.create({
    data: { clientId: client1.id, name: 'Payroll', color: '#8B5CF6', description: 'Payroll processing operations' }
  });

  // 10. Create 20+ Tasks with varied statuses, priorities, assignees, and engagement links
  console.log('📌 Creating 20+ Tasks with various statuses (READY_FOR_REVIEW, WAITING_FOR_CLIENT, etc.)...');
  const now = new Date();
  const pastDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

  const taskDefinitions = [
    // Engagement 1 Tasks (Acme Bookkeeping)
    {
      title: 'Acme Corporation - Bank & Credit Card Reconciliations (2026-09-01)',
      description: 'Reconcile 4 bank operating accounts and 2 corporate Amex cards.',
      status: TaskStatus.READY_FOR_REVIEW,
      priority: TaskPriority.HIGH,
      clientId: client1.id,
      engagementId: engagement1.id,
      reporterId: manager1.id,
      assigneeId: member1.id,
      estimatedHours: 4.0,
      actualHours: 3.8,
      dueDate: futureDate,
      position: 0,
      labelIds: [labelAccounting.id, labelReview.id]
    },
    {
      title: 'Acme Corporation - Accounts Payable & Receivable Review',
      description: 'Audit unapplied customer credits and vendor debit memos.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.MEDIUM,
      clientId: client1.id,
      engagementId: engagement1.id,
      reporterId: manager1.id,
      assigneeId: member2.id,
      estimatedHours: 4.0,
      actualHours: 2.0,
      dueDate: futureDate,
      position: 1,
      labelIds: [labelAccounting.id]
    },
    {
      title: 'Acme Corporation - Month-End Financial Statements Prep',
      description: 'Draft balance sheet and income statements for executive presentation.',
      status: TaskStatus.NOT_STARTED,
      priority: TaskPriority.HIGH,
      clientId: client1.id,
      engagementId: engagement1.id,
      reporterId: manager1.id,
      assigneeId: member1.id,
      estimatedHours: 4.0,
      dueDate: futureDate,
      position: 2,
      labelIds: [labelAccounting.id]
    },
    {
      title: 'Acme Corporation - Fixed Asset Depreciation Schedule',
      description: 'Calculate monthly MACRS depreciation on newly acquired warehouse machinery.',
      status: TaskStatus.COMPLETED,
      priority: TaskPriority.MEDIUM,
      clientId: client1.id,
      engagementId: engagement1.id,
      reporterId: manager1.id,
      assigneeId: member1.id,
      estimatedHours: 2.5,
      actualHours: 2.1,
      completedAt: new Date(),
      position: 3,
      labelIds: [labelAccounting.id]
    },
    {
      title: 'Acme Corporation - Missing Expense Receipts Clarification',
      description: 'Awaiting vendor receipts for $14,200 in international travel expenses.',
      status: TaskStatus.WAITING_FOR_CLIENT,
      priority: TaskPriority.HIGH,
      clientId: client1.id,
      engagementId: engagement1.id,
      reporterId: manager1.id,
      assigneeId: member2.id,
      estimatedHours: 1.5,
      dueDate: futureDate,
      position: 4,
      labelIds: [labelAccounting.id]
    },
    {
      title: 'Acme Corporation - Journal Entry Adjustments for Inventory Shrinkage',
      description: 'Review physical inventory count variance and prepare adjusting journal entries.',
      status: TaskStatus.CHANGES_REQUESTED,
      priority: TaskPriority.HIGH,
      clientId: client1.id,
      engagementId: engagement1.id,
      reporterId: manager1.id,
      assigneeId: member1.id,
      estimatedHours: 3.0,
      actualHours: 2.5,
      dueDate: futureDate,
      position: 5,
      labelIds: [labelAccounting.id]
    },

    // Engagement 2 Tasks (Acme Payroll)
    {
      title: 'Acme Corporation - Timesheet Verification & Overtime Audit',
      description: 'Cross-check clock punches against manager sign-offs for factory shifts.',
      status: TaskStatus.READY_FOR_REVIEW,
      priority: TaskPriority.URGENT,
      clientId: client1.id,
      engagementId: engagement2.id,
      reporterId: manager1.id,
      assigneeId: member2.id,
      estimatedHours: 2.0,
      actualHours: 1.9,
      dueDate: futureDate,
      position: 0,
      labelIds: [labelPayroll.id, labelUrgent.id]
    },
    {
      title: 'Acme Corporation - Tax Deductions & Direct Deposit Batch',
      description: 'Verify 401(k) matching and prepare NACHA ACH batch upload file.',
      status: TaskStatus.NOT_STARTED,
      priority: TaskPriority.URGENT,
      clientId: client1.id,
      engagementId: engagement2.id,
      reporterId: manager1.id,
      assigneeId: member2.id,
      estimatedHours: 4.0,
      dueDate: futureDate,
      position: 1,
      labelIds: [labelPayroll.id, labelUrgent.id]
    },
    {
      title: 'Acme Corporation - Bonus Compensation Tax Withholding Check',
      description: 'Confirm supplemental wage tax rates applied on executive quarterly bonuses.',
      status: TaskStatus.COMPLETED,
      priority: TaskPriority.MEDIUM,
      clientId: client1.id,
      engagementId: engagement2.id,
      reporterId: manager1.id,
      assigneeId: member2.id,
      estimatedHours: 1.0,
      actualHours: 0.8,
      completedAt: new Date(),
      position: 2,
      labelIds: [labelPayroll.id]
    },

    // Engagement 3 Tasks (TechStart Q3 Tax)
    {
      title: 'TechStart Inc - Quarterly Revenue & Deduction Aggregation',
      description: 'Pull Stripe transaction reports and reconcile international VAT liabilities.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      clientId: client2.id,
      engagementId: engagement3.id,
      reporterId: manager2.id,
      assigneeId: member3.id,
      estimatedHours: 8.0,
      actualHours: 4.5,
      dueDate: futureDate,
      position: 0
    },
    {
      title: 'TechStart Inc - R&D Tax Credit Calculation Study',
      description: 'Review qualified research expenses (QREs) for cloud computing engineering teams.',
      status: TaskStatus.READY_FOR_REVIEW,
      priority: TaskPriority.HIGH,
      clientId: client2.id,
      engagementId: engagement3.id,
      reporterId: manager2.id,
      assigneeId: member4.id,
      estimatedHours: 6.0,
      actualHours: 5.8,
      dueDate: futureDate,
      position: 1
    },
    {
      title: 'TechStart Inc - Tax Filing Submission & Client Advisory',
      description: 'Prepare Form 1120-W quarterly estimated tax vouchers and schedule sign-off meeting.',
      status: TaskStatus.NOT_STARTED,
      priority: TaskPriority.HIGH,
      clientId: client2.id,
      engagementId: engagement3.id,
      reporterId: manager2.id,
      assigneeId: member3.id,
      estimatedHours: 7.0,
      dueDate: futureDate,
      position: 2
    },
    {
      title: 'TechStart Inc - State Nexus and Sales Tax Review',
      description: 'Evaluate economic nexus thresholds across 12 newly launched US states.',
      status: TaskStatus.COMPLETED,
      priority: TaskPriority.MEDIUM,
      clientId: client2.id,
      engagementId: engagement3.id,
      reporterId: manager2.id,
      assigneeId: member3.id,
      estimatedHours: 4.0,
      actualHours: 3.5,
      completedAt: new Date(),
      position: 3
    },

    // Engagement 4 Tasks (Global Logistics)
    {
      title: 'Global Logistics - Multi-Currency Exchange Variance Reconciliations',
      description: 'Analyze realized and unrealized FX gains/losses across EUR, GBP, and JPY accounts.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      clientId: client3.id,
      engagementId: engagement4.id,
      reporterId: manager2.id,
      assigneeId: member1.id,
      estimatedHours: 5.0,
      actualHours: 2.0,
      dueDate: futureDate,
      position: 0
    },
    {
      title: 'Global Logistics - Port Authority Tariffs & Customs Escrow Audit',
      description: 'Reconcile customs bond escrow payments against shipping manifests.',
      status: TaskStatus.WAITING_FOR_CLIENT,
      priority: TaskPriority.MEDIUM,
      clientId: client3.id,
      engagementId: engagement4.id,
      reporterId: manager2.id,
      assigneeId: member3.id,
      estimatedHours: 3.5,
      dueDate: futureDate,
      position: 1
    },
    {
      title: 'Global Logistics - Vendor Invoice Duplicate Scan',
      description: 'Run automated duplicate detection on container freight bills.',
      status: TaskStatus.COMPLETED,
      priority: TaskPriority.LOW,
      clientId: client3.id,
      engagementId: engagement4.id,
      reporterId: manager2.id,
      assigneeId: member1.id,
      estimatedHours: 2.0,
      actualHours: 1.5,
      completedAt: new Date(),
      position: 2
    },

    // Standalone Tasks for Apex Retailers (Client 4) & Summit Health (Client 5)
    {
      title: 'Apex Retailers - POS Terminal Daily Cash Settlement Audit',
      description: 'Audit discrepancy logs across 45 physical retail POS registers.',
      status: TaskStatus.READY_FOR_REVIEW,
      priority: TaskPriority.HIGH,
      clientId: client4.id,
      reporterId: manager2.id,
      assigneeId: member2.id,
      estimatedHours: 3.0,
      actualHours: 2.8,
      dueDate: futureDate,
      position: 0
    },
    {
      title: 'Apex Retailers - Inventory Valuation LCM (Lower of Cost or Market)',
      description: 'Apply inventory reserve write-downs for seasonal merchandise.',
      status: TaskStatus.NOT_STARTED,
      priority: TaskPriority.MEDIUM,
      clientId: client4.id,
      reporterId: manager2.id,
      assigneeId: member2.id,
      estimatedHours: 4.5,
      dueDate: futureDate,
      position: 1
    },
    {
      title: 'Summit Health Group - HIPAA Compliance & Patient Billing Review',
      description: 'Sample 50 inpatient insurance claim filings for proper diagnostic billing codes.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.URGENT,
      clientId: client5.id,
      reporterId: manager1.id,
      assigneeId: member4.id,
      estimatedHours: 10.0,
      actualHours: 6.0,
      dueDate: futureDate,
      position: 0
    },
    {
      title: 'Summit Health Group - Medicare Reimbursement Rate Adjustment Analysis',
      description: 'Analyze revenue impact of recent CMS reimbursement schedule changes.',
      status: TaskStatus.CHANGES_REQUESTED,
      priority: TaskPriority.HIGH,
      clientId: client5.id,
      reporterId: manager1.id,
      assigneeId: member4.id,
      estimatedHours: 8.0,
      actualHours: 7.5,
      dueDate: futureDate,
      position: 1
    },
    {
      title: 'Summit Health Group - Annual Operating Budget Forecast Model',
      description: 'Deliver clinical department budget variance projections for fiscal year 2027.',
      status: TaskStatus.COMPLETED,
      priority: TaskPriority.HIGH,
      clientId: client5.id,
      reporterId: manager1.id,
      assigneeId: member4.id,
      estimatedHours: 16.0,
      actualHours: 15.0,
      completedAt: new Date(),
      position: 2
    },
    {
      title: 'Acme Corporation - Overdue Vendor Contract Review (Prior Year)',
      description: 'Historical supplier contract liability audit overdue from last quarter.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      clientId: client1.id,
      reporterId: manager1.id,
      assigneeId: member1.id,
      estimatedHours: 3.0,
      actualHours: 1.0,
      dueDate: pastDate, // Overdue task for dashboard query metrics
      position: 6,
      labelIds: [labelAccounting.id, labelUrgent.id]
    }
  ];

  for (const def of taskDefinitions) {
    const { labelIds, ...taskData } = def;
    const task = await prisma.task.create({
      data: {
        ...taskData,
        watchers: {
          create: { userId: taskData.reporterId }
        },
        taskLabels: labelIds && labelIds.length > 0
          ? {
              create: labelIds.map(labelId => ({ labelId }))
            }
          : undefined
      }
    });

    if (def.status === TaskStatus.CHANGES_REQUESTED) {
      await prisma.taskComment.create({
        data: {
          taskId: task.id,
          userId: def.reporterId,
          content: 'Changes Requested: Please include itemized transaction support documentation.'
        }
      });
    } else if (def.status === TaskStatus.COMPLETED) {
      await prisma.taskComment.create({
        data: {
          taskId: task.id,
          userId: def.reporterId,
          content: 'Task reviewed and approved.'
        }
      });
    }
  }

  // 11. Create Dashboard Widgets
  console.log('📊 Configuring Default Dashboard Widgets...');
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

  console.log('✅ Comprehensive Professional Services Seeding completed successfully!');
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
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
