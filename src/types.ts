/**
 * SDK Types
 *
 * These are the public-facing types for SDK consumers.
 * Protocol types are imported from @letta-ai/letta-code/protocol.
 */

// Re-export protocol types for internal use
export type {
  WireMessage,
  SystemInitMessage,
  MessageWire,
  ResultMessage,
  ErrorMessage,
  StreamEvent,
  ControlRequest,
  ControlResponse,
  CanUseToolControlRequest,
  CanUseToolResponse,
  CanUseToolResponseAllow,
  CanUseToolResponseDeny,
  // Configuration types
  SystemPromptPresetConfig,
  CreateBlock,
} from "@letta-ai/letta-code/protocol";

// Import types for use in this file
import type { CreateBlock, CanUseToolResponse } from "@letta-ai/letta-code/protocol";

// ═══════════════════════════════════════════════════════════════
// SYSTEM PROMPT TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Available system prompt presets.
 */
export type SystemPromptPreset =
  | "default" // Alias for letta-claude
  | "letta-claude" // Full Letta Code prompt (Claude-optimized)
  | "letta-codex" // Full Letta Code prompt (Codex-optimized)
  | "letta-gemini" // Full Letta Code prompt (Gemini-optimized)
  | "claude" // Basic Claude (no skills/memory instructions)
  | "codex" // Basic Codex
  | "gemini"; // Basic Gemini

/**
 * System prompt preset configuration.
 */
export interface SystemPromptPresetConfigSDK {
  type: "preset";
  preset: SystemPromptPreset;
  append?: string;
}

/**
 * System prompt configuration - either a raw string or preset config.
 */
export type SystemPromptConfig = string | SystemPromptPresetConfigSDK;

// ═══════════════════════════════════════════════════════════════
// MEMORY TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Reference to an existing shared block by ID.
 */
export interface BlockReference {
  blockId: string;
}

/**
 * Memory item - can be a preset name, custom block, or block reference.
 */
export type MemoryItem =
  | string // Preset name: "project", "persona", "human"
  | CreateBlock // Custom block: { label, value, description? }
  | BlockReference; // Shared block reference: { blockId }

/**
 * Default memory block preset names.
 */
export type MemoryPreset = "persona" | "human" | "project";

// ═══════════════════════════════════════════════════════════════
// AGENT OPTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Options for agent configuration.
 */
export interface AgentOptions {
  /** Model to use (e.g., "claude-sonnet-4-20250514") */
  model?: string;

  /** System prompt configuration (preset name or custom text) */
  systemPrompt?: SystemPromptConfig;

  /** Append additional instructions to system prompt */
  systemPromptAppend?: string;

  /** Memory blocks to initialize the agent with */
  memory?: MemoryItem[];

  /**
   * Which memory blocks to include in conversations by default.
   * If not specified, uses ["persona", "human", "project"].
   * Set to empty array [] to disable optional blocks.
   */
  initBlocks?: string[];

  /**
   * Set values for specific memory blocks (e.g., { persona: "You are...", project: "..." }).
   * Blocks must be included in initBlocks or memory.
   */
  blockValues?: Record<string, string>;

  /**
   * Base tools to load for the agent.
   * If not specified, loads default tool set.
   * Set to empty array [] to disable base tools.
   */
  baseTools?: string[];

  /** Enable sleeptime functionality (agent can control thinking pauses) */
  enableSleeptime?: boolean;

  /** Skills directory path (for loading custom skills) */
  skillsDirectory?: string;

  /** Working directory for the agent session */
  cwd?: string;
}

// ═══════════════════════════════════════════════════════════════
// SESSION OPTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Callback for custom permission handling.
 */
export type CanUseToolCallback = (
  toolName: string,
  toolInput: Record<string, unknown>,
) => Promise<CanUseToolResponse> | CanUseToolResponse;

/**
 * Options for creating or resuming a session.
 * Extends AgentOptions since sessions can create agents.
 */
export interface SessionOptions extends AgentOptions {
  /** Agent ID (for resuming existing agent) */
  agentId?: string;

  /** Conversation ID (for resuming specific conversation) */
  conversationId?: string;

  /** Create a new conversation */
  newConversation?: boolean;

  /** Connect to the default conversation (explicit) */
  defaultConversation?: boolean;

  /** Continue the last conversation (internal flag for resumeSession) */
  continueLastConversation?: boolean;

  /** Convenience: Set persona block value directly */
  persona?: string;

  /** Convenience: Set human block value directly */
  human?: string;

  /** Convenience: Set project block value directly */
  project?: string;

  /** List of allowed tool names (runtime filtering) */
  allowedTools?: string[];

  /** Permission mode */
  permissionMode?: PermissionMode;

  /** Maximum conversation turns */
  maxTurns?: number;

  /** Custom permission callback */
  canUseTool?: CanUseToolCallback;
}

export type PermissionMode = "default" | "acceptEdits" | "bypassPermissions";

// ═══════════════════════════════════════════════════════════════
// SDK MESSAGE TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * SDK message types - clean wrappers around wire types
 */
export interface SDKInitMessage {
  type: "init";
  agentId: string;
  sessionId: string;
  conversationId: string;
  model: string;
  tools: string[];
}

export interface SDKAssistantMessage {
  type: "assistant";
  content: string;
  uuid: string;
}

export interface SDKToolCallMessage {
  type: "tool_call";
  toolCallId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  uuid: string;
}

export interface SDKToolResultMessage {
  type: "tool_result";
  toolCallId: string;
  content: string;
  isError: boolean;
  uuid: string;
}

export interface SDKReasoningMessage {
  type: "reasoning";
  content: string;
  uuid: string;
}

export interface SDKResultMessage {
  type: "result";
  success: boolean;
  result?: string;
  error?: string;
  durationMs: number;
  totalCostUsd?: number;
  conversationId: string | null;
}

export interface SDKStreamEventMessage {
  type: "stream_event";
  event: {
    type: string;  // "content_block_start" | "content_block_delta" | "content_block_stop"
    index?: number;
    delta?: { type?: string; text?: string; reasoning?: string };
    content_block?: { type?: string; text?: string };
  };
  uuid: string;
}

/** Union of all SDK message types */
export type SDKMessage =
  | SDKInitMessage
  | SDKAssistantMessage
  | SDKToolCallMessage
  | SDKToolResultMessage
  | SDKReasoningMessage
  | SDKResultMessage
  | SDKStreamEventMessage;
