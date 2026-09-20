import { WorkflowValidator } from '../../src/modules/workflows/workflow-validator';
import { BadRequestError } from '../../src/shared/errors/app-error';

describe('WorkflowValidator (Unit Tests)', () => {
  const validStates = [
    { name: 'Backlog', slug: 'backlog', color: '#64748b', isInitial: true, isTerminal: false, position: 0 },
    { name: 'In Progress', slug: 'in_progress', color: '#0284c7', isInitial: false, isTerminal: false, position: 1 },
    { name: 'Review', slug: 'review', color: '#7c3aed', isInitial: false, isTerminal: false, position: 2 },
    { name: 'Done', slug: 'done', color: '#059669', isInitial: false, isTerminal: true, position: 3 }
  ];

  const validTransitions = [
    { name: 'Start Work', fromStateSlug: 'backlog', toStateSlug: 'in_progress', isAutomatic: false, conditions: [], hooks: [] },
    { name: 'Submit for Review', fromStateSlug: 'in_progress', toStateSlug: 'review', isAutomatic: false, conditions: [], hooks: [] },
    { name: 'Approve & Complete', fromStateSlug: 'review', toStateSlug: 'done', isAutomatic: false, conditions: [], hooks: [] }
  ];

  it('should validate a correct linear DAG workflow', () => {
    const result = WorkflowValidator.validateGraph(validStates, validTransitions);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.initialStateSlug).toBe('backlog');
    expect(result.terminalStateSlugs).toEqual(['done']);
  });

  it('should fail when no initial state is defined', () => {
    const states = validStates.map((s) => ({ ...s, isInitial: false }));
    const result = WorkflowValidator.validateGraph(states, validTransitions);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Workflow must define exactly one initial state (isInitial: true)');
  });

  it('should fail when multiple initial states are defined', () => {
    const states = validStates.map((s, idx) => ({ ...s, isInitial: idx < 2 }));
    const result = WorkflowValidator.validateGraph(states, validTransitions);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('multiple initial states'))).toBe(true);
  });

  it('should fail when no terminal state is defined', () => {
    const states = validStates.map((s) => ({ ...s, isTerminal: false }));
    const result = WorkflowValidator.validateGraph(states, validTransitions);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Workflow must define at least one terminal state (isTerminal: true)');
  });

  it('should fail when duplicate state slugs exist', () => {
    const states = [
      ...validStates,
      { name: 'Duplicate Backlog', slug: 'backlog', color: '#ff0000', isInitial: false, isTerminal: false, position: 4 }
    ];
    const result = WorkflowValidator.validateGraph(states, validTransitions);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("Duplicate state slug detected: 'backlog'"))).toBe(true);
  });

  it('should fail when a terminal state has outbound transitions', () => {
    const transitions = [
      ...validTransitions,
      { name: 'Reopen', fromStateSlug: 'done', toStateSlug: 'backlog', isAutomatic: false, conditions: [], hooks: [] }
    ];
    const result = WorkflowValidator.validateGraph(validStates, transitions);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("Terminal state 'done' cannot have outbound transitions"))).toBe(true);
  });

  it('should fail when an unreachable isolated state exists', () => {
    const states = [
      ...validStates,
      { name: 'Isolated State', slug: 'isolated', color: '#ffaa00', isInitial: false, isTerminal: false, position: 4 }
    ];
    const result = WorkflowValidator.validateGraph(states, validTransitions);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('Unreachable states from initial state: isolated'))).toBe(true);
  });

  it('should fail when no terminal state is reachable from initial state', () => {
    // Only backlog -> in_progress, but review and done are disconnected
    const brokenTransitions = [
      { name: 'Start Work', fromStateSlug: 'backlog', toStateSlug: 'in_progress', isAutomatic: false, conditions: [], hooks: [] }
    ];
    const result = WorkflowValidator.validateGraph(validStates, brokenTransitions);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('No terminal state is reachable'))).toBe(true);
  });

  it('assertValidGraph should throw BadRequestError on invalid graph', () => {
    const invalidStates = validStates.map((s) => ({ ...s, isInitial: false }));
    expect(() => {
      WorkflowValidator.assertValidGraph(invalidStates, validTransitions);
    }).toThrow(BadRequestError);
  });

  it('assertValidGraph should succeed without throwing on valid graph', () => {
    expect(() => {
      WorkflowValidator.assertValidGraph(validStates, validTransitions);
    }).not.toThrow();
  });
});
