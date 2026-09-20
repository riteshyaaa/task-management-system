import { PrismaClient, RoleName, TaskStatus, TaskPriority, TeamRole, WorkflowStatus, TransitionConditionType, HookEventType, RecurrenceFrequency, RecurrenceStatus, ActivityType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive database seeding...');

  // 1. Clean existing records in reverse dependency order
  console.log('🧹 Cleaning existing records...');
  await prisma.notification.deleteMany();
  await prisma.userLoginStreak.deleteMany();
  await prisma.dashboardWidget.deleteMany();
  await prisma.teamPerformanceMetric.deleteMany();
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
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
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
    data: { name: RoleName.MANAGER, description: 'Team and project management privileges' }
  });
  const memberRole = await prisma.role.create({
    data: { name: RoleName.MEMBER, description: 'Standard team contributor access' }
  });

  // 3. Define Granular Permissions
  console.log('🛡️ Creating granular system permissions...');
  const permissionsList = [
    // Users module
    { slug: 'users:read', name: 'View Users', module: 'users', description: 'View user profiles and lists' },
    { slug: 'users:write', name: 'Update Users', module: 'users', description: 'Update user profiles' },
    { slug: 'users:delete', name: 'Delete Users', module: 'users', description: 'Soft delete user accounts' },
    { slug: 'roles:manage', name: 'Manage Roles', module: 'roles', description: 'Assign roles and permissions' },

    // Teams module
    { slug: 'teams:create', name: 'Create Teams', module: 'teams', description: 'Create new workspace teams' },
    { slug: 'teams:read', name: 'View Teams', module: 'teams', description: 'View team details and members' },
    { slug: 'teams:update', name: 'Update Teams', module: 'teams', description: 'Update team settings' },
    { slug: 'teams:delete', name: 'Delete Teams', module: 'teams', description: 'Archive or delete teams' },
    { slug: 'teams:manage_members', name: 'Manage Team Members', module: 'teams', description: 'Add, remove, or change member roles' },

    // Tasks module
    { slug: 'tasks:create', name: 'Create Tasks', module: 'tasks', description: 'Create new tasks and subtasks' },
    { slug: 'tasks:read', name: 'View Tasks', module: 'tasks', description: 'View tasks, comments, and attachments' },
    { slug: 'tasks:update', name: 'Update Tasks', module: 'tasks', description: 'Update task details, assignees, and status' },
    { slug: 'tasks:delete', name: 'Delete Tasks', module: 'tasks', description: 'Soft delete tasks' },
    { slug: 'tasks:bulk_manage', name: 'Bulk Manage Tasks', module: 'tasks', description: 'Perform bulk update or delete on tasks' },

    // Workflows module
    { slug: 'workflows:read', name: 'View Workflows', module: 'workflows', description: 'View workflow state machines' },
    { slug: 'workflows:create', name: 'Create Workflows', module: 'workflows', description: 'Create and publish workflow definitions' },
    { slug: 'workflows:update', name: 'Update Workflows', module: 'workflows', description: 'Modify workflow states, transitions, guards' },
    { slug: 'workflows:delete', name: 'Delete Workflows', module: 'workflows', description: 'Archive workflow definitions' },
    { slug: 'workflows:transition', name: 'Execute Transitions', module: 'workflows', description: 'Transition task states in workflow' },

    // Templates & Automation
    { slug: 'templates:manage', name: 'Manage Templates', module: 'templates', description: 'Create, update, delete task templates' },
    { slug: 'templates:instantiate', name: 'Use Templates', module: 'templates', description: 'Generate tasks from templates' },
    { slug: 'automation:manage', name: 'Manage Automation Rules', module: 'automation', description: 'Create and edit auto-generation rules' },

    // Recurring Tasks
    { slug: 'recurring:manage', name: 'Manage Recurring Tasks', module: 'recurring', description: 'Setup, pause, resume recurring rules' },
    { slug: 'recurring:read', name: 'View Recurring Tasks', module: 'recurring', description: 'View recurring configs and instances' },

    // Audit & Analytics
    { slug: 'audit:read', name: 'View Audit Logs', module: 'audit', description: 'View append-only audit trail and diffs' },
    { slug: 'analytics:read', name: 'View Analytics', module: 'analytics', description: 'View team velocity, performance, streaks' },
    { slug: 'dashboard:customize', name: 'Customize Dashboard', module: 'dashboard', description: 'Rearrange and configure dashboard widgets' }
  ];

  const createdPermissions = await Promise.all(
    permissionsList.map(p => prisma.permission.create({ data: p }))
  );

  const permMap = new Map(createdPermissions.map(p => [p.slug, p.id]));

  // Assign permissions to roles
  // Admin gets ALL permissions
  await Promise.all(
    createdPermissions.map(p =>
      prisma.rolePermission.create({
        data: { roleId: adminRole.id, permissionId: p.id }
      })
    )
  );

  // Manager gets all except user deletion and role management
  const managerPerms = createdPermissions.filter(p => !['users:delete', 'roles:manage', 'teams:delete'].includes(p.slug));
  await Promise.all(
    managerPerms.map(p =>
      prisma.rolePermission.create({
        data: { roleId: managerRole.id, permissionId: p.id }
      })
    )
  );

  // Member gets basic create/read/update on tasks, templates use, dashboard
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

  // 4. Create Initial Users
  console.log('👤 Creating initial demo users...');
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Password123!', salt);

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      passwordHash,
      firstName: 'System',
      lastName: 'Administrator',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      userRoles: { create: { roleId: adminRole.id } },
      loginStreak: {
        create: {
          currentStreak: 12,
          longestStreak: 25,
          totalActiveDays: 45,
          lastActiveDate: new Date()
        }
      }
    }
  });

  const managerUser = await prisma.user.create({
    data: {
      email: 'manager@example.com',
      passwordHash,
      firstName: 'Sarah',
      lastName: 'Connor',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      userRoles: { create: { roleId: managerRole.id } },
      loginStreak: {
        create: {
          currentStreak: 5,
          longestStreak: 18,
          totalActiveDays: 30,
          lastActiveDate: new Date()
        }
      }
    }
  });

  const devUser = await prisma.user.create({
    data: {
      email: 'dev@example.com',
      passwordHash,
      firstName: 'Alex',
      lastName: 'Chen',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      userRoles: { create: { roleId: memberRole.id } },
      loginStreak: {
        create: {
          currentStreak: 8,
          longestStreak: 14,
          totalActiveDays: 28,
          lastActiveDate: new Date()
        }
      }
    }
  });

  const qaUser = await prisma.user.create({
    data: {
      email: 'qa@example.com',
      passwordHash,
      firstName: 'Elena',
      lastName: 'Rostova',
      avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
      userRoles: { create: { roleId: memberRole.id } },
      loginStreak: {
        create: {
          currentStreak: 3,
          longestStreak: 9,
          totalActiveDays: 15,
          lastActiveDate: new Date()
        }
      }
    }
  });

  // 5. Create Teams
  console.log('🏢 Creating teams and memberships...');
  const engineeringTeam = await prisma.team.create({
    data: {
      name: 'Engineering Workspace',
      slug: 'engineering-workspace',
      description: 'Core product engineering and infrastructure development',
      members: {
        create: [
          { userId: adminUser.id, role: TeamRole.OWNER },
          { userId: managerUser.id, role: TeamRole.MAINTAINER },
          { userId: devUser.id, role: TeamRole.MEMBER },
          { userId: qaUser.id, role: TeamRole.MEMBER }
        ]
      }
    }
  });

  const productTeam = await prisma.team.create({
    data: {
      name: 'Product & Design',
      slug: 'product-design',
      description: 'Product discovery, UI/UX design, and user research',
      members: {
        create: [
          { userId: adminUser.id, role: TeamRole.OWNER },
          { userId: managerUser.id, role: TeamRole.MAINTAINER }
        ]
      }
    }
  });

  // 6. Create Labels for Engineering Team
  console.log('🏷️ Creating team labels...');
  const bugLabel = await prisma.label.create({
    data: { teamId: engineeringTeam.id, name: 'Bug', color: '#EF4444', description: 'Defect or issue in production' }
  });
  const featureLabel = await prisma.label.create({
    data: { teamId: engineeringTeam.id, name: 'Feature', color: '#3B82F6', description: 'New product functionality' }
  });
  const backendLabel = await prisma.label.create({
    data: { teamId: engineeringTeam.id, name: 'Backend', color: '#10B981', description: 'Server-side API and database work' }
  });
  const frontendLabel = await prisma.label.create({
    data: { teamId: engineeringTeam.id, name: 'Frontend', color: '#8B5CF6', description: 'React and UI component work' }
  });
  const urgentLabel = await prisma.label.create({
    data: { teamId: engineeringTeam.id, name: 'High Priority', color: '#F59E0B', description: 'Requires immediate attention' }
  });

  // 7. Create Workflow State Machine for Engineering Team
  console.log('⚙️ Creating standard workflow state machine...');
  const standardWorkflow = await prisma.workflowDefinition.create({
    data: {
      teamId: engineeringTeam.id,
      name: 'Standard Software Workflow',
      description: 'Backlog -> Development -> Code Review -> QA Testing -> Done',
      status: WorkflowStatus.ACTIVE,
      createdById: managerUser.id
    }
  });

  // Create States
  const stateTodo = await prisma.workflowState.create({
    data: { workflowId: standardWorkflow.id, name: 'To Do', slug: 'TODO', color: '#94A3B8', isInitial: true, position: 0 }
  });
  const stateInProgress = await prisma.workflowState.create({
    data: { workflowId: standardWorkflow.id, name: 'In Progress', slug: 'IN_PROGRESS', color: '#3B82F6', position: 1 }
  });
  const stateCodeReview = await prisma.workflowState.create({
    data: { workflowId: standardWorkflow.id, name: 'Code Review', slug: 'REVIEW', color: '#F59E0B', position: 2 }
  });
  const stateDone = await prisma.workflowState.create({
    data: { workflowId: standardWorkflow.id, name: 'Done', slug: 'DONE', color: '#10B981', isTerminal: true, position: 3 }
  });

  // Set initial state on workflow definition
  await prisma.workflowDefinition.update({
    where: { id: standardWorkflow.id },
    data: { initialStateId: stateTodo.id }
  });

  // Create Transitions
  // 1. TODO -> IN_PROGRESS
  const transStart = await prisma.workflowTransition.create({
    data: {
      workflowId: standardWorkflow.id,
      fromStateId: stateTodo.id,
      toStateId: stateInProgress.id,
      name: 'Start Working'
    }
  });

  // 2. IN_PROGRESS -> REVIEW
  const transSubmitReview = await prisma.workflowTransition.create({
    data: {
      workflowId: standardWorkflow.id,
      fromStateId: stateInProgress.id,
      toStateId: stateCodeReview.id,
      name: 'Submit for Review'
    }
  });
  // Add hook to notify manager
  await prisma.transitionHook.create({
    data: {
      transitionId: transSubmitReview.id,
      hookType: HookEventType.NOTIFY_CHANNEL,
      config: { message: 'Task submitted for code review' }
    }
  });

  // 3. REVIEW -> IN_PROGRESS (Request Changes)
  await prisma.workflowTransition.create({
    data: {
      workflowId: standardWorkflow.id,
      fromStateId: stateCodeReview.id,
      toStateId: stateInProgress.id,
      name: 'Request Changes'
    }
  });

  // 4. REVIEW -> DONE (Approve & Merge)
  const transApprove = await prisma.workflowTransition.create({
    data: {
      workflowId: standardWorkflow.id,
      fromStateId: stateCodeReview.id,
      toStateId: stateDone.id,
      name: 'Approve & Complete'
    }
  });
  // Add condition: Only Manager or Admin can approve to DONE
  await prisma.transitionCondition.create({
    data: {
      transitionId: transApprove.id,
      conditionType: TransitionConditionType.ROLE_CHECK,
      config: { allowedRoles: ['ADMIN', 'MANAGER'] },
      errorMessage: 'Only Managers and Admins can approve tasks to Done.'
    }
  });

  // 8. Create Sample Tasks
  console.log('📋 Creating initial tasks and subtasks...');
  const task1 = await prisma.task.create({
    data: {
      title: 'Implement JWT Refresh Token Rotation',
      description: 'Add automatic token family tracking and reuse detection to protect against stolen tokens.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      teamId: engineeringTeam.id,
      reporterId: managerUser.id,
      assigneeId: devUser.id,
      estimatedHours: 6.5,
      actualHours: 3.0,
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      position: 0,
      taskLabels: {
        create: [
          { labelId: backendLabel.id },
          { labelId: urgentLabel.id }
        ]
      },
      workflowAssignment: {
        create: {
          workflowId: standardWorkflow.id,
          currentStateId: stateInProgress.id
        }
      },
      watchers: {
        create: [
          { userId: managerUser.id },
          { userId: adminUser.id }
        ]
      }
    }
  });

  // Subtasks for Task 1
  await prisma.task.create({
    data: {
      title: 'Write token family hashing utility',
      status: TaskStatus.DONE,
      priority: TaskPriority.MEDIUM,
      teamId: engineeringTeam.id,
      reporterId: devUser.id,
      assigneeId: devUser.id,
      parentTaskId: task1.id,
      completedAt: new Date()
    }
  });

  await prisma.task.create({
    data: {
      title: 'Implement token reuse detection middleware',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      teamId: engineeringTeam.id,
      reporterId: devUser.id,
      assigneeId: devUser.id,
      parentTaskId: task1.id
    }
  });

  const task2 = await prisma.task.create({
    data: {
      title: 'Design Kanban Drag-and-Drop Task Board',
      description: 'Implement optimistic UI updates with smooth animations when moving tasks between status columns.',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      teamId: engineeringTeam.id,
      reporterId: managerUser.id,
      assigneeId: devUser.id,
      estimatedHours: 8.0,
      dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      position: 0,
      taskLabels: {
        create: [
          { labelId: frontendLabel.id },
          { labelId: featureLabel.id }
        ]
      },
      workflowAssignment: {
        create: {
          workflowId: standardWorkflow.id,
          currentStateId: stateTodo.id
        }
      }
    }
  });

  const task3 = await prisma.task.create({
    data: {
      title: 'Fix SQL connection timeout on large bulk operations',
      description: 'Connection pool exhausted when running bulk status transitions with 50+ tasks.',
      status: TaskStatus.REVIEW,
      priority: TaskPriority.URGENT,
      teamId: engineeringTeam.id,
      reporterId: qaUser.id,
      assigneeId: devUser.id,
      estimatedHours: 4.0,
      actualHours: 4.5,
      dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      position: 0,
      taskLabels: {
        create: [
          { labelId: bugLabel.id },
          { labelId: backendLabel.id }
        ]
      },
      workflowAssignment: {
        create: {
          workflowId: standardWorkflow.id,
          currentStateId: stateCodeReview.id
        }
      }
    }
  });

  const task4 = await prisma.task.create({
    data: {
      title: 'Setup PostgreSQL Database Schema with Prisma',
      description: 'Define models for Users, Roles, Tasks, Workflows, Recurrence, and Audit.',
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      teamId: engineeringTeam.id,
      reporterId: adminUser.id,
      assigneeId: devUser.id,
      estimatedHours: 5.0,
      actualHours: 4.0,
      completedAt: new Date(),
      position: 0,
      taskLabels: {
        create: [
          { labelId: backendLabel.id }
        ]
      },
      workflowAssignment: {
        create: {
          workflowId: standardWorkflow.id,
          currentStateId: stateDone.id
        }
      }
    }
  });

  // Comments
  await prisma.taskComment.create({
    data: {
      taskId: task1.id,
      userId: devUser.id,
      content: 'Added the token revocation mechanism. Working on token rotation unit tests now.'
    }
  });

  await prisma.taskComment.create({
    data: {
      taskId: task1.id,
      userId: managerUser.id,
      content: 'Make sure to handle clock skew edge cases when checking expiresAt.'
    }
  });

  // 9. Create Task Template
  console.log('📑 Creating task templates...');
  const sprintTemplate = await prisma.taskTemplate.create({
    data: {
      teamId: engineeringTeam.id,
      name: 'Feature Release Template',
      description: 'Standard checklist for delivering a new customer-facing feature',
      defaultTitle: 'Feature: {{feature_name}}',
      defaultBody: 'Delivering feature for module {{module_name}}.\n\n### Acceptance Criteria\n- [ ] Unit tests written\n- [ ] QA sign-off\n- [ ] Documentation updated',
      defaultPriority: TaskPriority.HIGH,
      estimatedHours: 16.0,
      variables: [
        { name: 'feature_name', label: 'Feature Name', type: 'string', required: true },
        { name: 'module_name', label: 'Target Module', type: 'string', required: true }
      ],
      createdById: managerUser.id,
      templateItems: {
        create: [
          { title: 'Write technical design specification', position: 0, estimatedHours: 4.0 },
          { title: 'Implement database migrations & backend endpoints', position: 1, estimatedHours: 6.0 },
          { title: 'Build React UI components', position: 2, estimatedHours: 4.0 },
          { title: 'End-to-end integration testing', position: 3, estimatedHours: 2.0 }
        ]
      }
    }
  });

  // 10. Create Automation Rule
  console.log('🤖 Creating automation rules...');
  await prisma.automationRule.create({
    data: {
      teamId: engineeringTeam.id,
      name: 'Auto-Assign Urgent Bugs to QA & Dev Leads',
      description: 'When an URGENT task with label "Bug" is created, automatically notify watchers and set priority',
      triggerType: 'TASK_CREATED',
      conditions: [
        { field: 'priority', operator: 'EQUALS', value: 'URGENT' }
      ],
      actions: [
        { type: 'SEND_NOTIFICATION', config: { title: 'Urgent Bug Alert', message: 'A critical bug requires immediate triage.' } }
      ],
      isActive: true,
      createdById: managerUser.id
    }
  });

  // 11. Create Recurring Task Rule
  console.log('🔁 Creating recurring task rules...');
  const masterWeeklyTask = await prisma.task.create({
    data: {
      title: 'Weekly Team Sprint Review & Planning',
      description: 'Review completed items from previous sprint, calculate velocity, and plan upcoming tickets.',
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      teamId: engineeringTeam.id,
      reporterId: managerUser.id,
      assigneeId: managerUser.id
    }
  });

  await prisma.recurrenceRule.create({
    data: {
      taskTemplateId: masterWeeklyTask.id,
      frequency: RecurrenceFrequency.WEEKLY,
      interval: 1,
      timezone: 'UTC',
      startDate: new Date(),
      status: RecurrenceStatus.ACTIVE,
      nextOccurrence: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdById: managerUser.id,
      weeklyDays: {
        create: [
          { dayOfWeek: 'MON' }
        ]
      }
    }
  });

  // 12. Create Sample Velocity and Performance Metrics
  console.log('📊 Creating baseline velocity and performance metrics...');
  await prisma.taskVelocityMetric.create({
    data: {
      teamId: engineeringTeam.id,
      periodType: 'WEEKLY',
      periodStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      tasksCreated: 14,
      tasksCompleted: 11,
      tasksOverdue: 1,
      avgCycleTimeHrs: 18.5,
      p50CycleTimeHrs: 14.0,
      p90CycleTimeHrs: 32.0,
      throughputRate: 1.57
    }
  });

  await prisma.teamPerformanceMetric.create({
    data: {
      userId: devUser.id,
      teamId: engineeringTeam.id,
      periodType: 'WEEKLY',
      periodStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      tasksAssigned: 8,
      tasksCompleted: 7,
      tasksOverdue: 0,
      avgCompletionHrs: 12.5,
      onTimePercentage: 95.0,
      commentsPosted: 14,
      statusTransitions: 18
    }
  });

  // 13. Create Default Dashboard Widgets
  console.log('📊 Creating default dashboard layout...');
  const widgetConfigs = [
    { widgetType: 'STAT_SUMMARY', title: 'Task Overview', gridX: 0, gridY: 0, gridW: 12, gridH: 2 },
    { widgetType: 'VELOCITY_CHART', title: 'Sprint Velocity', gridX: 0, gridY: 2, gridW: 8, gridH: 4 },
    { widgetType: 'STREAK_COUNTER', title: 'Active Days Streak', gridX: 8, gridY: 2, gridW: 4, gridH: 2 },
    { widgetType: 'RECENT_TASKS', title: 'My Priority Tasks', gridX: 8, gridY: 4, gridW: 4, gridH: 4 }
  ];

  await Promise.all(
    widgetConfigs.map(w =>
      prisma.dashboardWidget.create({
        data: {
          userId: devUser.id,
          ...w
        }
      })
    )
  );

  console.log('✅ Database seeding finished successfully!');
  console.log('\nDefault credentials:');
  console.log('  Admin:   admin@example.com   / Password123!');
  console.log('  Manager: manager@example.com / Password123!');
  console.log('  Dev:     dev@example.com     / Password123!');
  console.log('  QA:      qa@example.com      / Password123!\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
