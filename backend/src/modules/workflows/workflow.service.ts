import { Prisma, WorkflowStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { NotFoundError, BadRequestError, ConflictError } from '../../shared/errors/app-error';
import {
  CreateWorkflowDefinitionInput,
  UpdateWorkflowDefinitionInput,
  TransitionTaskInput
} from './workflow.schema';
import { WorkflowValidator } from './workflow-validator';
import { workflowEngine } from './workflow-engine';
import { AuditContext } from '../../shared/types/express';

export class WorkflowService {
  /**
   * Creates a complete workflow definition with its states, transitions, conditions and hooks
   */
  async createWorkflow(userId: string, input: CreateWorkflowDefinitionInput) {
    // 1. Validate state machine graph
    WorkflowValidator.assertValidGraph(input.states, input.transitions);

    // 2. Check for duplicate name
    const existing = await prisma.workflowDefinition.findFirst({
      where: {
        clientId: input.clientId,
        name: input.name,
        status: { not: WorkflowStatus.ARCHIVED }
      }
    });

    if (existing) {
      throw new ConflictError(
        `An active workflow named '${input.name}' already exists in this client workspace`
      );
    }

    // 3. Persist workflow graph inside transaction
    const workflow = await prisma.$transaction(async (tx) => {
      // Create WorkflowDefinition
      const def = await tx.workflowDefinition.create({
        data: {
          clientId: input.clientId,
          name: input.name,
          description: input.description,
          status: WorkflowStatus.ACTIVE,
          createdById: userId
        }
      });

      // Create WorkflowStates
      const stateMap = new Map<string, string>(); // slug -> id
      let initialStateId: string | null = null;

      for (const s of input.states) {
        const state = await tx.workflowState.create({
          data: {
            workflowId: def.id,
            name: s.name,
            slug: s.slug.toLowerCase(),
            color: s.color,
            isInitial: s.isInitial,
            isTerminal: s.isTerminal,
            position: s.position
          }
        });
        stateMap.set(s.slug.toLowerCase(), state.id);
        if (s.isInitial) {
          initialStateId = state.id;
        }
      }

      // Update definition with initialStateId
      if (initialStateId) {
        await tx.workflowDefinition.update({
          where: { id: def.id },
          data: { initialStateId }
        });
      }

      // Create WorkflowTransitions with conditions & hooks
      for (const t of input.transitions) {
        const fromStateId = stateMap.get(t.fromStateSlug.toLowerCase())!;
        const toStateId = stateMap.get(t.toStateSlug.toLowerCase())!;

        const transition = await tx.workflowTransition.create({
          data: {
            workflowId: def.id,
            fromStateId,
            toStateId,
            name: t.name,
            isAutomatic: t.isAutomatic
          }
        });

        // Insert conditions
        if (t.conditions && t.conditions.length > 0) {
          for (let i = 0; i < t.conditions.length; i++) {
            const cond = t.conditions[i];
            await tx.transitionCondition.create({
              data: {
                transitionId: transition.id,
                conditionType: cond.conditionType,
                config: cond.config as any,
                errorMessage: cond.errorMessage,
                evalOrder: cond.evalOrder || i
              }
            });
          }
        }

        // Insert hooks
        if (t.hooks && t.hooks.length > 0) {
          for (let j = 0; j < t.hooks.length; j++) {
            const hook = t.hooks[j];
            await tx.transitionHook.create({
              data: {
                transitionId: transition.id,
                hookType: hook.hookType,
                config: hook.config as any,
                isAsync: hook.isAsync !== undefined ? hook.isAsync : true,
                execOrder: hook.execOrder || j,
                isActive: hook.isActive !== undefined ? hook.isActive : true
              }
            });
          }
        }
      }

      return def;
    });

    return this.getWorkflowById(workflow.id);
  }

  async listWorkflows(clientId: string) {
    const workflows = await prisma.workflowDefinition.findMany({
      where: {
        clientId,
        status: { not: WorkflowStatus.ARCHIVED }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        states: {
          orderBy: { position: 'asc' }
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        _count: {
          select: {
            assignments: true,
            transitions: true
          }
        }
      }
    });

    return workflows;
  }

  async getWorkflowById(workflowId: string) {
    const workflow = await prisma.workflowDefinition.findUnique({
      where: { id: workflowId },
      include: {
        states: {
          orderBy: { position: 'asc' }
        },
        transitions: {
          include: {
            fromState: true,
            toState: true,
            conditions: { orderBy: { evalOrder: 'asc' } },
            hooks: { orderBy: { execOrder: 'asc' } }
          }
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        _count: {
          select: { assignments: true }
        }
      }
    });

    if (!workflow) throw new NotFoundError('Workflow definition not found');
    return workflow;
  }

  async updateWorkflow(workflowId: string, input: UpdateWorkflowDefinitionInput) {
    const workflow = await prisma.workflowDefinition.findUnique({
      where: { id: workflowId }
    });

    if (!workflow) throw new NotFoundError('Workflow definition not found');

    const updated = await prisma.workflowDefinition.update({
      where: { id: workflowId },
      data: {
        name: input.name,
        description: input.description,
        status: input.status
      },
      include: {
        states: {
          orderBy: { position: 'asc' }
        }
      }
    });

    return updated;
  }

  /**
   * Assigns a workflow to a task and moves task to the workflow's initial state
   */
  async assignWorkflowToTask(taskId: string, workflowId: string, userId: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task || task.isDeleted) throw new NotFoundError('Task not found');

    const workflow = await prisma.workflowDefinition.findUnique({
      where: { id: workflowId },
      include: { states: true }
    });

    if (!workflow) throw new NotFoundError('Workflow definition not found');
    if (workflow.clientId !== task.clientId) {
      throw new BadRequestError('Workflow does not belong to the same client as the task');
    }

    const initialState = workflow.states.find((s) => s.isInitial);
    if (!initialState) {
      throw new BadRequestError('Workflow does not have an initial state configured');
    }

    const assignment = await prisma.$transaction(async (tx) => {
      const assigned = await tx.taskWorkflowAssignment.upsert({
        where: { taskId },
        create: {
          taskId,
          workflowId,
          currentStateId: initialState.id,
          enteredStateAt: new Date(),
          assignedAt: new Date()
        },
        update: {
          workflowId,
          currentStateId: initialState.id,
          enteredStateAt: new Date(),
          assignedAt: new Date()
        },
        include: {
          currentState: true,
          workflow: true
        }
      });

      // Sync task status if state matches standard enum
      const mappedStatus = workflowEngine.mapStateSlugToTaskStatus(initialState.slug);
      if (mappedStatus) {
        await tx.task.update({
          where: { id: taskId },
          data: { status: mappedStatus }
        });
      }

      return assigned;
    });

    return assignment;
  }

  /**
   * Get current workflow state and available outgoing transitions for a task
   */
  async getTaskWorkflowState(taskId: string) {
    const assignment = await prisma.taskWorkflowAssignment.findUnique({
      where: { taskId },
      include: {
        currentState: true,
        workflow: {
          include: {
            states: { orderBy: { position: 'asc' } },
            transitions: {
              include: {
                fromState: true,
                toState: true,
                conditions: true
              }
            }
          }
        }
      }
    });

    if (!assignment) {
      return null;
    }

    const availableTransitions = assignment.workflow.transitions
      .filter((t) => t.fromStateId === assignment.currentStateId)
      .map((t) => ({
        transitionId: t.id,
        name: t.name || `Move to ${t.toState.name}`,
        targetState: t.toState,
        conditionsCount: t.conditions.length
      }));

    const history = await prisma.workflowTransitionHistory.findMany({
      where: { taskId },
      orderBy: { transitionedAt: 'desc' },
      include: {
        triggeredBy: {
          select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true }
        }
      }
    });

    return {
      assignment,
      currentState: assignment.currentState,
      availableTransitions,
      history: history.map((h) => ({
        ...h,
        durationInStateMs: h.durationInStateMs ? h.durationInStateMs.toString() : null
      }))
    };
  }

  /**
   * Transition a task to a new state
   */
  async transitionTask(
    taskId: string,
    input: TransitionTaskInput,
    userId: string,
    auditContext?: AuditContext
  ) {
    return workflowEngine.transitionTask(
      taskId,
      { stateId: input.toStateId, stateSlug: input.toStateSlug },
      userId,
      input.comment,
      auditContext
    );
  }
}

export const workflowService = new WorkflowService();
