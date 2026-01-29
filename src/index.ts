/**
 * Letta Code SDK
 *
 * Programmatic control of Letta Code CLI with persistent agent memory.
 *
 * @example
 * ```typescript
 * import { createAgent, createSession, resumeSession, prompt } from '@letta-ai/letta-code-sdk';
 *
 * // Create agent (returns ID immediately)
 * const agentId = await createAgent();
 *
 * // Create session to interact
 * const session = createSession({ agentId });
 * await session.send('Hello!');
 * for await (const msg of session.stream()) {
 *   if (msg.type === 'assistant') console.log(msg.content);
 * }
 *
 * // Resume later (continues last conversation)
 * const session2 = resumeSession(agentId);
 *
 * // One-shot
 * const result = await prompt('What is 2+2?', { agentId });
 * ```
 */

import { Session } from "./session.js";
import { SubprocessTransport } from "./transport.js";
import { getLruAgentId, updateLru } from "./lru.js";
import type { SessionOptions, AgentOptions, SDKMessage, SDKResultMessage } from "./types.js";

// Re-export LRU utilities
export { getLruAgentId, getLruConversationId, clearLru } from "./lru.js";

// Re-export types
export type {
  SessionOptions,
  AgentOptions,
  SDKMessage,
  SDKInitMessage,
  SDKAssistantMessage,
  SDKToolCallMessage,
  SDKToolResultMessage,
  SDKReasoningMessage,
  SDKResultMessage,
  SDKStreamEventMessage,
  PermissionMode,
  CanUseToolCallback,
  CanUseToolResponse,
  CanUseToolResponseAllow,
  CanUseToolResponseDeny,
} from "./types.js";

export { Session } from "./session.js";

// ═══════════════════════════════════════════════════════════════
// AGENT MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Create a new agent and return its ID immediately.
 *
 * Spawns the Letta CLI to create the agent with proper defaults
 * (memory blocks, skills, etc.). Returns agentId without sending a message.
 *
 * @example
 * ```typescript
 * const agentId = await createAgent();
 * console.log(agentId); // agent-xxx - available immediately
 *
 * // Now use it
 * const session = createSession({ agentId });
 * ```
 */
export async function createAgent(options: AgentOptions = {}): Promise<string> {
  // Create a session with --new-agent --create-only, read init message
  // CLI will exit cleanly after outputting init
  const transport = new SubprocessTransport(options, { createOnly: true });
  
  await transport.connect();
  
  // Read messages until we get the init message
  let agentId: string | null = null;
  let conversationId: string | null = null;
  
  for await (const msg of transport.messages()) {
    if (msg.type === "system" && msg.subtype === "init") {
      agentId = msg.agent_id;
      conversationId = msg.conversation_id;
      break;
    }
  }
  
  // Close the transport (don't send any messages)
  transport.close();
  
  if (!agentId) {
    throw new Error("Failed to create agent - no init message received");
  }
  
  // Update LRU
  updateLru(agentId, conversationId ?? "default");
  
  return agentId;
}

// ═══════════════════════════════════════════════════════════════
// SESSION MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Create a new session.
 *
 * If agentId is provided in options, connects to that agent's default conversation.
 * If no agentId, creates a new agent automatically (via CLI).
 *
 * @example
 * ```typescript
 * // Create new agent automatically
 * const session = createSession();
 *
 * // With options
 * const session = createSession({ model: 'opus' });
 *
 * // With existing agent (uses default conversation)
 * const session = createSession({ agentId });
 *
 * // Existing agent, new conversation
 * const session = createSession({ agentId, newConversation: true });
 * ```
 */
export function createSession(options: SessionOptions = {}): Session {
  return new Session(options);
}

/**
 * Resume an existing session by agent ID or conversation ID.
 *
 * Auto-detects whether the ID is an agent ID (agent-*) or conversation ID (conv-*).
 * When resuming by agent ID, continues the last active conversation (or default as fallback),
 * unless newConversation is explicitly set to true.
 *
 * @example
 * ```typescript
 * // Resume agent (continues last/default conversation)
 * const session = resumeSession('agent-xxx');
 *
 * // Resume specific conversation
 * const session = resumeSession('conv-xxx');
 *
 * // Resume agent but start NEW conversation
 * const session = resumeSession('agent-xxx', { newConversation: true });
 * ```
 */
export function resumeSession(id: string, options: SessionOptions = {}): Session {
  const isConversationId = id.startsWith("conv-");
  const isAgentId = id.startsWith("agent-");

  if (!isConversationId && !isAgentId) {
    throw new Error(`Invalid ID format: "${id}". Expected agent-* or conv-* prefix.`);
  }

  if (isConversationId) {
    if (options.newConversation) {
      throw new Error("Cannot use newConversation with a conversation ID.");
    }
    if (options.defaultConversation) {
      throw new Error("Cannot use defaultConversation with a conversation ID.");
    }
    return new Session({ ...options, conversationId: id });
  }

  // Resume agent - determine conversation behavior
  if (options.newConversation) {
    // User explicitly wants new conversation
    return new Session({ ...options, agentId: id });
  }

  if (options.defaultConversation) {
    // User explicitly wants default conversation
    return new Session({ ...options, agentId: id });
  }

  // Default: continue last conversation (via --continue flag)
  return new Session({ ...options, agentId: id, continueLastConversation: true });
}

// ═══════════════════════════════════════════════════════════════
// ONE-SHOT
// ═══════════════════════════════════════════════════════════════

/**
 * One-shot prompt convenience function.
 *
 * Uses the specified agent, or LRU agent if available, or creates a new agent.
 * Always creates a new conversation for isolation.
 *
 * @example
 * ```typescript
 * // With specific agent
 * const result = await prompt('What is 2+2?', { agentId: 'agent-xxx' });
 *
 * // With LRU agent (or creates new)
 * const result = await prompt('What is 2+2?');
 * ```
 */
export async function prompt(
  message: string,
  options: SessionOptions = {}
): Promise<SDKResultMessage> {
  const agentId = options.agentId ?? getLruAgentId();

  let session: Session;
  if (agentId) {
    // Use createSession to create new conversation (not resumeSession)
    session = createSession({ ...options, agentId, newConversation: true });
  } else {
    session = createSession({ ...options, newConversation: true });
  }

  try {
    await session.send(message);

    let result: SDKResultMessage | null = null;
    for await (const msg of session.stream()) {
      if (msg.type === "result") {
        result = msg;
        break;
      }
    }

    if (!result) {
      return {
        type: "result",
        success: false,
        error: "No result received",
        durationMs: 0,
        conversationId: session.conversationId,
      };
    }

    return result;
  } finally {
    session.close();
  }
}
