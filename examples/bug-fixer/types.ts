/**
 * Bug Fixer Types
 */

export interface BugFixerState {
  agentId: string | null;
  fixCount: number;
}

export interface BugFixerConfig {
  model: string;
}

export const DEFAULT_CONFIG: BugFixerConfig = {
  model: 'sonnet',
};
