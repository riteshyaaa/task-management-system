import { prisma } from '../src/config/database';
import { RoleName } from '@prisma/client';

export async function clearDatabase(): Promise<void> {
  try {
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
  } catch (error) {
    // If tables don't exist yet or connection fails
    console.warn('clearDatabase warning:', error);
  }
}

export async function seedTestRoles(): Promise<void> {
  try {
    // Create base roles if they don't exist
    const adminRole = await prisma.role.upsert({
      where: { name: RoleName.ADMIN },
      update: {},
      create: { name: RoleName.ADMIN, description: 'Full system administrative access' }
    });

    const memberRole = await prisma.role.upsert({
      where: { name: RoleName.MEMBER },
      update: {},
      create: { name: RoleName.MEMBER, description: 'Standard client contributor access' }
    });

    const teamMemberRole = await prisma.role.upsert({
      where: { name: RoleName.TEAM_MEMBER },
      update: {},
      create: { name: RoleName.TEAM_MEMBER, description: 'Standard team contributor access' }
    });

    const managerRole = await prisma.role.upsert({
      where: { name: RoleName.MANAGER },
      update: {},
      create: { name: RoleName.MANAGER, description: 'client and project management privileges' }
    });

    // Create essential permissions
    const permissions = [
      { slug: 'tasks:create', name: 'Create Tasks', module: 'tasks' },
      { slug: 'tasks:read', name: 'Read Tasks', module: 'tasks' },
      { slug: 'tasks:update', name: 'Update Tasks', module: 'tasks' },
      { slug: 'tasks:delete', name: 'Delete Tasks', module: 'tasks' },
      { slug: 'clients:create', name: 'Create clients', module: 'clients' },
      { slug: 'clients:read', name: 'Read clients', module: 'clients' },
      { slug: 'clients:update', name: 'Update clients', module: 'clients' },
      { slug: 'workflows:read', name: 'Read Workflows', module: 'workflows' },
      { slug: 'workflows:create', name: 'Create Workflows', module: 'workflows' },
      { slug: 'audit:read', name: 'Read Audit Logs', module: 'audit' }
    ];

    for (const perm of permissions) {
      const p = await prisma.permission.upsert({
        where: { slug: perm.slug },
        update: {},
        create: {
          slug: perm.slug,
          name: perm.name,
          module: perm.module,
          description: perm.name
        }
      });

      // Link permission to member, team_member, manager, and admin roles
      for (const role of [memberRole, teamMemberRole, managerRole, adminRole]) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: p.id
            }
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: p.id
          }
        });
      }
    }
  } catch (error) {
    console.warn('seedTestRoles warning:', error);
  }
}
