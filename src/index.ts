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
 * const agentId = await createAgent({ name: 'my-bot' });
 *
 * // Create session to interact
 * const session = createSession(agentId);
 * await session.send('Hello!');
 * for await (const msg of session.stream()) {
 *   if (msg.type === 'assistant') console.log(msg.content);
 * }
 *
 * // Resume later
 * const session2 = resumeSession(agentId);  // or resumeSession(conversationId)
 *
 * // One-shot
 * const result = await prompt('What is 2+2?', { agentId });
 * ```
 */

import { Session } from "./session.js";
import { SubprocessTransport } from "./transport.js";
import { getLruAgentId, updateLru } from "./lru.js";
import type { SessionOptions, CreateSessionOptions, SDKMessage, SDKResultMessage } from "./types.js";

// Re-export LRU utilities
export { getLruAgentId, getLruConversationId, clearLru } from "./lru.js";

// Re-export types
export type {
  SessionOptions,
  CreateSessionOptions,
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
 * const session = createSession(agentId);
 * ```
 */
export async function createAgent(options: CreateSessionOptions = {}): Promise<string> {
  // Create a session with --new-agent --create-only, read init message
  // CLI will exit cleanly after outputting init
  const transport = new SubprocessTransport({
    ...options,
    _createOnly: true,  // Tells CLI to exit after init
  } as any);
  
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
 * If agentId is provided, creates a session on that agent.
 * If no agentId, creates a new agent automatically (via CLI).
 *
 * @example
 * ```typescript
 * // With existing agent
 * const session = createSession(agentId);
 *
 * // Or create new agent automatically
 * const session = createSession();
 * // session.agentId available after send()
 * ```
 */
export function createSession(agentId?: string, options: SessionOptions = {}): Session {
  if (agentId) {
    return new Session({ ...options, agentId });
  }
  return new Session(options);
}

/**
 * Resume an existing session by agent ID or conversation ID.
 *
 * Auto-detects whether the ID is an agent ID (agent-*) or conversation ID (conv-*).
 *
 * @example
 * ```typescript
 * // Resume agent (uses default conversation)
 * const session = resumeSession('agent-xxx');
 *
 * // Resume specific conversation
 * const session = resumeSession('conv-xxx');
 *
 * // Resume with options
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
    return new Session({ ...options, conversationId: id });
  }
  
  return new Session({ ...options, agentId: id });
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
    session = resumeSession(agentId, { ...options, newConversation: true });
  } else {
    session = createSession(undefined, { ...options, newConversation: true });
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
