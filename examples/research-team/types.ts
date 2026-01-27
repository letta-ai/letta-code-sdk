/**
 * Research Team Types
 * 
 * Shared type definitions for the multi-agent research system.
 */

// ═══════════════════════════════════════════════════════════════
// CORE TYPES
// ═══════════════════════════════════════════════════════════════

export type Depth = 'quick' | 'standard' | 'comprehensive';

export type AgentRole = 'coordinator' | 'researcher' | 'analyst' | 'writer';

export interface ResearchTask {
  id: string;
  query: string;
  depth: Depth;
  createdAt: Date;
  status: 'pending' | 'researching' | 'analyzing' | 'writing' | 'complete' | 'failed';
}

export interface ResearchReport {
  taskId: string;
  query: string;
  depth: Depth;
  content: string;
  sourcesUsed: number;
  durationMs: number;
  completedAt: Date;
}

// ═══════════════════════════════════════════════════════════════
// DEPTH CONFIGURATION
// ═══════════════════════════════════════════════════════════════

export interface DepthConfig {
  sourcesCount: number;
  analysisDepth: 'brief' | 'thorough' | 'extensive';
  reportSections: string[];
  maxIterations: number;
  estimatedMinutes: number;
}

export const DEPTH_CONFIGS: Record<Depth, DepthConfig> = {
  quick: {
    sourcesCount: 3,
    analysisDepth: 'brief',
    reportSections: ['summary', 'key_findings', 'sources'],
    maxIterations: 1,
    estimatedMinutes: 5,
  },
  standard: {
    sourcesCount: 6,
    analysisDepth: 'thorough',
    reportSections: ['summary', 'background', 'key_findings', 'analysis', 'sources'],
    maxIterations: 2,
    estimatedMinutes: 15,
  },
  comprehensive: {
    sourcesCount: 10,
    analysisDepth: 'extensive',
    reportSections: ['executive_summary', 'background', 'methodology', 'findings', 'analysis', 'implications', 'future_directions', 'sources'],
    maxIterations: 3,
    estimatedMinutes: 30,
  },
};

// ═══════════════════════════════════════════════════════════════
// SOURCE TYPES
// ═══════════════════════════════════════════════════════════════

export interface AcademicSource {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  venue: string;
  year: number;
  citations: number;
  domain: string;
  quality: number; // 1-10
  url?: string;
}

export interface SourceEvaluation {
  sourceId: string;
  relevanceScore: number; // 1-10
  qualityScore: number; // 1-10
  notes: string;
}

// ═══════════════════════════════════════════════════════════════
// FEEDBACK TYPES
// ═══════════════════════════════════════════════════════════════

export interface UserFeedback {
  taskId: string;
  rating: number; // 1-5 stars
  comment?: string;
  timestamp: Date;
}

export interface AgentReflection {
  taskId: string;
  agent: AgentRole;
  whatWorked: string;
  whatDidntWork: string;
  improvements: string;
  timestamp: Date;
}

// ═══════════════════════════════════════════════════════════════
// WORKFLOW TYPES
// ═══════════════════════════════════════════════════════════════

export interface WorkflowPhase {
  name: string;
  agent: AgentRole;
  status: 'pending' | 'running' | 'complete' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  output?: string;
}

export interface TeamState {
  agentIds: Record<AgentRole, string | null>;
  currentTask: ResearchTask | null;
  phases: WorkflowPhase[];
  sharedBlockIds: {
    sources: string | null;
    terminology: string | null;
    pitfalls: string | null;
  };
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function generateTaskId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes === 0) {
    return `${seconds}s`;
  }
  return `${minutes}m ${remainingSeconds}s`;
}
