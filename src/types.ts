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
// TOOL TYPES (matches pi-agent-core)
// ═══════════════════════════════════════════════════════════════

/**
 * Tool result content block
 */
export interface AgentToolResultContent {
  type: "text" | "image";
  text?: string;
  data?: string;      // base64 for images
  mimeType?: string;
}

/**
 * Tool result (matches pi-agent-core)
 */
export interface AgentToolResult<T> {
  content: AgentToolResultContent[];
  details?: T;
}

/**
 * Tool update callback (for streaming tool progress)
 */
export type AgentToolUpdateCallback<T> = (update: Partial<AgentToolResult<T>>) => void;

/**
 * Agent tool definition (matches pi-agent-core)
 */
export interface AgentTool<TParams, TResult> {
  /** Display label */
  label: string;
  
  /** Tool name (used in API calls) */
  name: string;
  
  /** Description shown to the model */
  description: string;
  
  /** JSON Schema for parameters (TypeBox or plain object) */
  parameters: TParams;
  
  /** Execution function */
  execute: (
    toolCallId: string,
    args: unknown,
    signal?: AbortSignal,
    onUpdate?: AgentToolUpdateCallback<TResult>,
  ) => Promise<AgentToolResult<TResult>>;
}

/**
 * Convenience type for tools with any params
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyAgentTool = AgentTool<any, unknown>;

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
 * Options for creating a session
 */
export interface SessionOptions {
  /** Model to use (e.g., "claude-sonnet-4-20250514") */
  model?: string;

  // ═══════════════════════════════════════════════════════════════
  // Internal flags - set by createSession/resumeSession, not user-facing
  // ═══════════════════════════════════════════════════════════════
  /** @internal */ conversationId?: string;
  /** @internal */ newConversation?: boolean;
  /** @internal */ defaultConversation?: boolean;
  /** @internal */ createOnly?: boolean;
  /** @internal */ promptMode?: boolean;

  /**
   * System prompt configuration.
   * - string: Use as the complete system prompt
   * - { type: 'preset', preset, append? }: Use a preset with optional appended text
   */
  systemPrompt?: SystemPromptConfig;

  /**
   * Memory block configuration. Each item can be:
   * - string: Preset block name ("project", "persona", "human")
   * - CreateBlock: Custom block definition
   * - { blockId: string }: Reference to existing shared block
   */
  memory?: MemoryItem[];

  /** Convenience: Set persona block value directly */
  persona?: string;

  /** Convenience: Set human block value directly */
  human?: string;

  /** Convenience: Set project block value directly */
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

  /**
   * Custom tools that execute locally in the SDK process.
   * These tools are registered with the CLI and executed when the LLM calls them.
   */
  tools?: AnyAgentTool[];
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

// ═══════════════════════════════════════════════════════════════
// EXTERNAL TOOL PROTOCOL TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Request to execute an external tool (CLI → SDK)
 */
export interface ExecuteExternalToolRequest {
  subtype: "execute_external_tool";
  tool_call_id: string;
  tool_name: string;
  input: Record<string, unknown>;
}
