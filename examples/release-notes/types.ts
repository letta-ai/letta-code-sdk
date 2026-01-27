/**
 * Release Notes Generator Types
 */

export interface ReleaseNotesState {
  agentId: string | null;
  releasesGenerated: number;
}

export interface ReleaseNotesConfig {
  model: string;
}

export const DEFAULT_CONFIG: ReleaseNotesConfig = {
  model: 'sonnet',
};
