import { TaskStatus, TransitionConditionType, ClientRole } from '@prisma/client';
import { WorkflowEngine, TransitionContext } from '../../src/modules/workflows/workflow-engine';
import { prisma } from '../../src/config/database';

jest.mock('../../src/config/database', () => ({
  prisma: {
    task: {
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn()
    },
    taskWorkflowAssignment: {
      findUnique: jest.fn(),
      update: jest.fn()
    },
    workflowTransitionHistory: {
      create: jest.fn()
    },
    userActivityLog: {
      create: jest.fn()
    },
    notification: {
      create: jest.fn()
    },
    user: {
      findUnique: jest.fn()
    },
    clientMember: {
      findUnique: jest.fn()
    },
    $transaction: jest.fn((cb) => cb(prisma))
  }
}));

jest.mock('../../src/config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('WorkflowEngine (Unit Tests)', () => {
  let engine: WorkflowEngine;

  beforeEach(() => {
    jest.clearAllMocks();
    engine = new WorkflowEngine();
  });

  describe('mapStateSlugToTaskStatus', () => {
    it('should map backlog and todo aliases to TaskStatus.TODO', () => {
      expect(engine.mapStateSlugToTaskStatus('backlog')).toBe(TaskStatus.TODO);
      expect(engine.mapStateSlugToTaskStatus('todo')).toBe(TaskStatus.TODO);
      expect(engine.mapStateSlugToTaskStatus('open')).toBe(TaskStatus.TODO);
    });

    it('should map in-progress aliases to TaskStatus.IN_PROGRESS', () => {
      expect(engine.mapStateSlugToTaskStatus('in_progress')).toBe(TaskStatus.IN_PROGRESS);
      expect(engine.mapStateSlugToTaskStatus('development')).toBe(TaskStatus.IN_PROGRESS);
      expect(engine.mapStateSlugToTaskStatus('doing')).toBe(TaskStatus.IN_PROGRESS);
    });

    it('should map review and QA aliases to TaskStatus.REVIEW', () => {
      expect(engine.mapStateSlugToTaskStatus('review')).toBe(TaskStatus.REVIEW);
      expect(engine.mapStateSlugToTaskStatus('in_review')).toBe(TaskStatus.REVIEW);
      expect(engine.mapStateSlugToTaskStatus('qa')).toBe(TaskStatus.REVIEW);
      expect(engine.mapStateSlugToTaskStatus('testing')).toBe(TaskStatus.REVIEW);
    });

    it('should map done and resolved aliases to TaskStatus.DONE', () => {
      expect(engine.mapStateSlugToTaskStatus('done')).toBe(TaskStatus.DONE);
      expect(engine.mapStateSlugToTaskStatus('completed')).toBe(TaskStatus.DONE);
      expect(engine.mapStateSlugToTaskStatus('closed')).toBe(TaskStatus.DONE);
    });

    it('should return null for custom unmapped state slugs', () => {
      expect(engine.mapStateSlugToTaskStatus('waiting_vendor')).toBeNull();
      expect(engine.mapStateSlugToTaskStatus('archived_future')).toBeNull();
    });
  });

  describe('evaluateConditions - ROLE_CHECK', () => {
    const mockTask = { id: 'task-1', assigneeId: 'user-1' };
    const mockFromState = { id: 's1', name: 'Review' };
    const mockToState = { id: 's2', name: 'Approved' };

    it('should PASS if user has required role in clientMember', async () => {
      const condition = {
        conditionType: TransitionConditionType.ROLE_CHECK,
        config: { allowedRoles: ['MAINTAINER', 'OWNER'] }
      };

      const context: TransitionContext = {
        task: mockTask,
        user: { id: 'u1', userRoles: [] },
        clientMember: { role: ClientRole.MAINTAINER },
        fromState: mockFromState,
        toState: mockToState,
        transition: { id: 't1' }
      };

      const result = await engine.evaluateConditions([condition], context);
      expect(result.passed).toBe(true);
    });

    it('should PASS if user is a system ADMIN', async () => {
      const condition = {
        conditionType: TransitionConditionType.ROLE_CHECK,
        config: { allowedRoles: ['QA_LEAD'] }
      };

      const context: TransitionContext = {
        task: mockTask,
        user: { id: 'u1', userRoles: [{ role: { name: 'ADMIN' } }] },
        clientMember: { role: ClientRole.MEMBER },
        fromState: mockFromState,
        toState: mockToState,
        transition: { id: 't1' }
      };

      const result = await engine.evaluateConditions([condition], context);
      expect(result.passed).toBe(true);
    });

    it('should FAIL if user does NOT possess the required role', async () => {
      const condition = {
        conditionType: TransitionConditionType.ROLE_CHECK,
        config: { allowedRoles: ['MANAGER', 'ADMIN'] },
        errorMessage: 'Only Managers can approve this transition'
      };

      const context: TransitionContext = {
        task: mockTask,
        user: { id: 'u1', userRoles: [{ role: { name: 'MEMBER' } }] },
        clientMember: { role: ClientRole.MEMBER },
        fromState: mockFromState,
        toState: mockToState,
        transition: { id: 't1' }
      };

      const result = await engine.evaluateConditions([condition], context);
      expect(result.passed).toBe(false);
      expect(result.failedReason).toBe('Only Managers can approve this transition');
    });
  });

  describe('evaluateConditions - FIELD_VALUE', () => {
    const mockFromState = { id: 's1', name: 'In Progress' };
    const mockToState = { id: 's2', name: 'Review' };

    it('should FAIL HAS_ASSIGNEE check if task has no assignee', async () => {
      const condition = {
        conditionType: TransitionConditionType.FIELD_VALUE,
        config: { rule: 'HAS_ASSIGNEE' }
      };

      const context: TransitionContext = {
        task: { id: 'task-1', assigneeId: null },
        user: { id: 'u1' },
        fromState: mockFromState,
        toState: mockToState,
        transition: { id: 't1' }
      };

      const result = await engine.evaluateConditions([condition], context);
      expect(result.passed).toBe(false);
      expect(result.failedReason).toContain('Task must have an assignee');
    });

    it('should PASS HAS_ASSIGNEE check if task has assignee', async () => {
      const condition = {
        conditionType: TransitionConditionType.FIELD_VALUE,
        config: { rule: 'HAS_ASSIGNEE' }
      };

      const context: TransitionContext = {
        task: { id: 'task-1', assigneeId: 'user-assigned-123' },
        user: { id: 'u1' },
        fromState: mockFromState,
        toState: mockToState,
        transition: { id: 't1' }
      };

      const result = await engine.evaluateConditions([condition], context);
      expect(result.passed).toBe(true);
    });

    it('should FAIL ALL_SUBTASKS_COMPLETED when incomplete subtasks exist', async () => {
      (prisma.task.count as jest.Mock).mockResolvedValue(2);

      const condition = {
        conditionType: TransitionConditionType.FIELD_VALUE,
        config: { rule: 'ALL_SUBTASKS_COMPLETED' }
      };

      const context: TransitionContext = {
        task: { id: 'parent-task-1', assigneeId: 'u1' },
        user: { id: 'u1' },
        fromState: mockFromState,
        toState: mockToState,
        transition: { id: 't1' }
      };

      const result = await engine.evaluateConditions([condition], context);
      expect(result.passed).toBe(false);
      expect(result.failedReason).toContain('All subtasks must be completed');
    });

    it('should PASS ALL_SUBTASKS_COMPLETED when 0 incomplete subtasks exist', async () => {
      (prisma.task.count as jest.Mock).mockResolvedValue(0);

      const condition = {
        conditionType: TransitionConditionType.FIELD_VALUE,
        config: { rule: 'ALL_SUBTASKS_COMPLETED' }
      };

      const context: TransitionContext = {
        task: { id: 'parent-task-1', assigneeId: 'u1' },
        user: { id: 'u1' },
        fromState: mockFromState,
        toState: mockToState,
        transition: { id: 't1' }
      };

      const result = await engine.evaluateConditions([condition], context);
      expect(result.passed).toBe(true);
    });
  });
});
