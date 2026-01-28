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
// SESSION OPTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Callback for custom permission handling.
 * Return CanUseToolResponse from @letta-ai/letta-code/protocol.
 */
export type CanUseToolCallback = (
  toolName: string,
  toolInput: Record<string, unknown>,
) => Promise<CanUseToolResponse> | CanUseToolResponse;

/**
 * Options for creating a session
 */
export interface SessionOptions {
  /** Model to use (e.g., "claude-sonnet-4-20250514") */
  model?: string;

  /** Resume a specific conversation by ID (derives agent automatically) */
  conversationId?: string;

  /** Create a new conversation for concurrent sessions (requires agentId) */
  newConversation?: boolean;

  /** Resume the last session (agent + conversation from previous run) */
  continue?: boolean;

  /** Use agent's default conversation (requires agentId) */
  defaultConversation?: boolean;

  /**
   * System prompt configuration.
   * - string: Use as the complete system prompt
   * - { type: 'preset', preset, append? }: Use a preset with optional appended text
   *
   * Available presets: 'default', 'letta-claude', 'letta-codex', 'letta-gemini',
   *                    'claude', 'codex', 'gemini'
   */
  systemPrompt?: SystemPromptConfig;

  /**
   * Memory block configuration. Each item can be:
   * - string: Preset block name ("project", "persona", "human")
   * - CreateBlock: Custom block definition
   * - { blockId: string }: Reference to existing shared block
   *
   * If not specified, defaults to ["persona", "human", "project"].
   * Core blocks (skills, loaded_skills) are always included automatically.
   */
  memory?: MemoryItem[];

  /**
   * Convenience: Set persona block value directly.
   * Uses default block description/limit, just overrides the value.
   * Error if persona not included in memory config.
   */
  persona?: string;

  /**
   * Convenience: Set human block value directly.
   */
  human?: string;

  /**
   * Convenience: Set project block value directly.
   */
  project?: string;

  /** List of allowed tool names */
  allowedTools?: string[];

  /** Permission mode */
  permissionMode?: PermissionMode;

  /** Working directory */
  cwd?: string;

  /** Maximum conversation turns */
  maxTurns?: number;

  /** Custom permission callback - called when tool needs approval */
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
