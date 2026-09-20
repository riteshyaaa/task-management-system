import { BadRequestError } from '../../shared/errors/app-error';
import { CreateWorkflowStateInput, CreateWorkflowTransitionInput } from './workflow.schema';

export interface WorkflowValidationResult {
  isValid: boolean;
  errors: string[];
  initialStateSlug?: string;
  terminalStateSlugs?: string[];
}

export class WorkflowValidator {
  /**
   * Validates state machine structure:
   * - Exactly 1 initial state
   * - At least 1 terminal state
   * - No state is both initial and terminal (unless 1-state edge-case)
   * - All transitions reference valid states
   * - Graph connectivity (path exists from initial state to at least one terminal state)
   */
  public static validateGraph(
    states: CreateWorkflowStateInput[],
    transitions: CreateWorkflowTransitionInput[]
  ): WorkflowValidationResult {
    const errors: string[] = [];

    // 1. Initial State Check
    const initialStates = states.filter((s) => s.isInitial);
    if (initialStates.length === 0) {
      errors.push('Workflow must define exactly one initial state (isInitial: true)');
    } else if (initialStates.length > 1) {
      errors.push(
        `Workflow cannot have multiple initial states (found ${initialStates.length}: ${initialStates.map((s) => s.name).join(', ')})`
      );
    }

    // 2. Terminal State Check
    const terminalStates = states.filter((s) => s.isTerminal);
    if (terminalStates.length === 0) {
      errors.push('Workflow must define at least one terminal state (isTerminal: true)');
    }

    // 3. Unique Slugs Check
    const slugs = new Set<string>();
    for (const state of states) {
      if (slugs.has(state.slug)) {
        errors.push(`Duplicate state slug detected: '${state.slug}'`);
      }
      slugs.add(state.slug);

      if (state.isInitial && state.isTerminal && states.length > 1) {
        errors.push(`State '${state.slug}' cannot be both initial and terminal in a multi-state workflow`);
      }
    }

    // 4. Transitions Validity Check
    const transitionKeys = new Set<string>();
    const adjacencyList = new Map<string, string[]>();
    for (const slug of slugs) {
      adjacencyList.set(slug, []);
    }

    for (const t of transitions) {
      if (!slugs.has(t.fromStateSlug)) {
        errors.push(`Transition source state '${t.fromStateSlug}' does not exist in workflow states`);
      }
      if (!slugs.has(t.toStateSlug)) {
        errors.push(`Transition target state '${t.toStateSlug}' does not exist in workflow states`);
      }

      const key = `${t.fromStateSlug}->${t.toStateSlug}`;
      if (transitionKeys.has(key)) {
        errors.push(`Duplicate transition defined: '${key}'`);
      }
      transitionKeys.add(key);

      // Terminal states shouldn't have outbound transitions
      const fromState = states.find((s) => s.slug === t.fromStateSlug);
      if (fromState && fromState.isTerminal) {
        errors.push(`Terminal state '${fromState.slug}' cannot have outbound transitions`);
      }

      if (slugs.has(t.fromStateSlug) && slugs.has(t.toStateSlug)) {
        adjacencyList.get(t.fromStateSlug)?.push(t.toStateSlug);
      }
    }

    // 5. Reachability Check (BFS from initial state)
    if (initialStates.length === 1 && terminalStates.length > 0) {
      const initialSlug = initialStates[0].slug;
      const visited = new Set<string>();
      const queue: string[] = [initialSlug];
      visited.add(initialSlug);

      while (queue.length > 0) {
        const current = queue.shift()!;
        const neighbors = adjacencyList.get(current) || [];
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }

      // Check if at least one terminal state is reachable
      const reachableTerminals = terminalStates.filter((ts) => visited.has(ts.slug));
      if (reachableTerminals.length === 0) {
        errors.push('No terminal state is reachable from the initial state via the configured transitions');
      }

      // Warn/Error for unreachable states
      const unreachableStates = states.filter((s) => !visited.has(s.slug));
      if (unreachableStates.length > 0) {
        errors.push(
          `Unreachable states from initial state: ${unreachableStates.map((s) => s.slug).join(', ')}`
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      initialStateSlug: initialStates[0]?.slug,
      terminalStateSlugs: terminalStates.map((s) => s.slug)
    };
  }

  public static assertValidGraph(
    states: CreateWorkflowStateInput[],
    transitions: CreateWorkflowTransitionInput[]
  ): void {
    const result = this.validateGraph(states, transitions);
    if (!result.isValid) {
      throw new BadRequestError(`Invalid workflow definition:\n- ${result.errors.join('\n- ')}`);
    }
  }
}
