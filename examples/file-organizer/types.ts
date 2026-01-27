/**
 * File Organizer Types
 */

export interface FileOrganizerState {
  agentId: string | null;
  organizationCount: number;
}

export interface FileOrganizerConfig {
  model: string;
}

export const DEFAULT_CONFIG: FileOrganizerConfig = {
  model: 'sonnet',
};
