/**
 * Letta Code SDK
 *
 * Programmatic control of Letta Code CLI with persistent agent memory.
 *
 * @example
 * ```typescript
 * import { createAgent, resumeAgent, prompt } from '@letta-ai/letta-code-sdk';
 *
 * // One-shot (uses LRU agent or creates new)
 * const result = await prompt('What is 2+2?', { model: 'claude-sonnet-4-20250514' });
 *
 * // Create new agent
 * await using agent = createAgent({ model: 'claude-sonnet-4-20250514' });
 * await agent.send('Hello!');
 * for await (const msg of agent.stream()) {
 *   if (msg.type === 'assistant') console.log(msg.content);
 * }
 *
 * // Resume agent (auto-detects agent-* vs conv-* prefix)
 * await using resumed = resumeAgent(agentId);  // or resumeAgent(conversationId)
 * ```
 */

import { Session } from "./session.js";
import { getLruAgentId, getLruConversationId, clearLru } from "./lru.js";
import type { AgentOptions, SDKMessage, SDKResultMessage } from "./types.js";

// Re-export LRU utilities
export { getLruAgentId, getLruConversationId, clearLru } from "./lru.js";

// ═══════════════════════════════════════════════════════════════
// RE-EXPORTS
// ═══════════════════════════════════════════════════════════════

export type {
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
export { Session as Agent } from "./session.js";

// ═══════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════

function validateCreateAgentOptions(options: AgentOptions): void {
  if (options.agentId) {
    throw new Error("createAgent() does not accept agentId. Use resumeAgent(agentId) instead.");
  }
  if (options.conversationId) {
    throw new Error("createAgent() does not accept conversationId. Use resumeAgent(conversationId) instead.");
  }
  if (options.lastConversation) {
    throw new Error("createAgent() does not accept lastConversation. New agents have no LRU conversation.");
  }
}

function validateResumeAgentOptions(id: string | undefined, options: AgentOptions): void {
  const isConversationId = id?.startsWith("conv-");
  
  if (isConversationId) {
    if (options.newConversation) {
      throw new Error("Cannot use newConversation with a conversation ID. The conversation is already specified.");
    }
    if (options.lastConversation) {
      throw new Error("Cannot use lastConversation with a conversation ID. The conversation is already specified.");
    }
  }
  
  if (options.newConversation && options.lastConversation) {
    throw new Error("Cannot use both newConversation and lastConversation. Choose one.");
  }
}

// ═══════════════════════════════════════════════════════════════
// CORE API
// ═══════════════════════════════════════════════════════════════

/**
 * Create a new agent with persistent memory.
 *
 * | Call | Agent | Conversation |
 * |------|-------|--------------|
 * | `createAgent()` | New | Default |
 * | `createAgent({ newConversation: true })` | New | New |
 *
 * @example
 * ```typescript
 * await using agent = createAgent({ model: 'claude-sonnet-4-20250514' });
 * await agent.send('My name is Alice');
 * for await (const msg of agent.stream()) {
 *   console.log(msg);
 * }
 * console.log(`Agent ID: ${agent.agentId}`); // Save this to resume later
 * ```
 */
export function createAgent(options: AgentOptions = {}): Session {
  validateCreateAgentOptions(options);
  return new Session(options);
}

/**
 * Resume an existing agent or conversation.
 *
 * Auto-detects whether the ID is an agent ID (agent-*) or conversation ID (conv-*).
 *
 * | Call | Agent | Conversation |
 * |------|-------|--------------|
 * | `resumeAgent()` | LRU | LRU or Default |
 * | `resumeAgent({ newConversation: true })` | LRU | New |
 * | `resumeAgent(agentId)` | Specified | Default |
 * | `resumeAgent(agentId, { newConversation: true })` | Specified | New |
 * | `resumeAgent(agentId, { lastConversation: true })` | Specified | LRU or Default |
 * | `resumeAgent(conversationId)` | Derived | Specified |
 *
 * @example
 * ```typescript
 * // Resume with LRU agent
 * await using agent = resumeAgent();
 *
 * // Resume specific agent
 * await using agent = resumeAgent('agent-xxx');
 *
 * // Resume specific conversation
 * await using agent = resumeAgent('conv-xxx');
 *
 * // Resume agent with new conversation
 * await using agent = resumeAgent('agent-xxx', { newConversation: true });
 * ```
 */
export function resumeAgent(
  id?: string,
  options: AgentOptions = {}
): Session {
  validateResumeAgentOptions(id, options);
  
  const isConversationId = id?.startsWith("conv-");
  const isAgentId = id?.startsWith("agent-");
  
  if (id && !isConversationId && !isAgentId) {
    throw new Error(`Invalid ID format: "${id}". Expected agent-* or conv-* prefix.`);
  }
  
  const sessionOptions: AgentOptions = { ...options };
  
  if (isConversationId) {
    sessionOptions.conversationId = id;
  } else if (isAgentId) {
    sessionOptions.agentId = id;
  } else if (!id) {
    // No ID - use LRU
    const lruAgent = getLruAgentId();
    const lruConv = getLruConversationId();
    if (lruAgent) {
      sessionOptions.agentId = lruAgent;
      if (lruConv && !options.newConversation) {
        sessionOptions.conversationId = lruConv;
      }
    } else {
      throw new Error("No LRU agent available. Use createAgent() to create one first.");
    }
  }
  
  // Handle lastConversation option
  if (options.lastConversation && sessionOptions.agentId) {
    const lruAgent = getLruAgentId();
    const lruConv = getLruConversationId();
    if (lruAgent === sessionOptions.agentId && lruConv) {
      sessionOptions.conversationId = lruConv;
    }
  }
  
  return new Session(sessionOptions);
}

/**
 * One-shot prompt convenience function.
 *
 * Uses LRU agent if available, otherwise creates a new agent.
 * Always creates a new conversation for isolation.
 *
 * | Call | Agent | Conversation |
 * |------|-------|--------------|
 * | `prompt(msg)` | LRU or New | New |
 * | `prompt(msg, { agentId: '...' })` | Specified | New |
 *
 * @example
 * ```typescript
 * const result = await prompt('What is the capital of France?', {
 *   model: 'claude-sonnet-4-20250514'
 * });
 * if (result.success) {
 *   console.log(result.result);
 * }
 * ```
 */
export async function prompt(
  message: string,
  options: AgentOptions = {}
): Promise<SDKResultMessage> {
  const agentId = options.agentId ?? getLruAgentId();
  
  let session: Session;
  if (agentId) {
    session = resumeAgent(agentId, { ...options, newConversation: true });
  } else {
    session = createAgent({ ...options, newConversation: true });
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
