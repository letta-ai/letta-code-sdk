/**
 * Letta Code SDK
 *
 * Programmatic control of Letta Code CLI with persistent agent memory.
 *
 * @example
 * ```typescript
 * import { createAgent, createSession, resumeSession, prompt } from '@letta-ai/letta-code-sdk';
 *
 * // Create agent (has default conversation)
 * const agentId = await createAgent();
 *
 * // Resume default conversation
 * const session = resumeSession(agentId);
 *
 * // Resume specific conversation
 * const session = resumeSession('conv-xxx');
 *
 * // Create NEW conversation
 * const session = createSession(agentId);
 * const session = createSession();  // also creates new agent
 *
 * // One-shot prompt
 * const result = await prompt('Hello', agentId);
 * const result = await prompt('Hello');  // creates new agent
 * ```
 */

import { Session } from "./session.js";
import type { SessionOptions, SDKMessage, SDKResultMessage } from "./types.js";

// Re-export types
export type {
  SessionOptions,
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

/**
 * Create a new agent with a default conversation.
 * Returns the agentId which can be used with resumeSession or createSession.
 *
 * @example
 * ```typescript
 * const agentId = await createAgent();
 *
 * // Then resume the default conversation:
 * const session = resumeSession(agentId);
 * ```
 */
export async function createAgent(): Promise<string> {
  const session = new Session({ createOnly: true });
  const initMsg = await session.initialize();
  session.close();
  return initMsg.agentId;
}

/**
 * Create a new conversation (session).
 *
 * - With agentId: creates new conversation on existing agent
 * - Without agentId: creates new agent with new conversation
 *
 * @example
 * ```typescript
 * // New conversation on existing agent
 * await using session = createSession(agentId);
 *
 * // New agent + new conversation
 * await using session = createSession();
 * ```
 */
export function createSession(agentId?: string, options: SessionOptions = {}): Session {
  if (agentId) {
    return new Session({ ...options, agentId, newConversation: true });
  } else {
    return new Session({ ...options, newConversation: true });
  }
}

/**
 * Resume an existing session.
 *
 * - Pass an agent ID (agent-xxx) to resume the default conversation
 * - Pass a conversation ID (conv-xxx) to resume a specific conversation
 *
 * The default conversation always exists after createAgent, so you can:
 * `createAgent()` → `resumeSession(agentId)` without needing createSession first.
 *
 * @example
 * ```typescript
 * // Resume default conversation
 * await using session = resumeSession(agentId);
 *
 * // Resume specific conversation
 * await using session = resumeSession('conv-xxx');
 * ```
 */
export function resumeSession(
  id: string,
  options: SessionOptions = {}
): Session {
  if (id.startsWith("conv-")) {
    return new Session({ ...options, conversationId: id });
  } else {
    return new Session({ ...options, agentId: id, defaultConversation: true });
  }
}

/**
 * One-shot prompt convenience function.
 *
 * - Without agentId: uses default agent (like `letta -p`), new conversation
 * - With agentId: uses specific agent, new conversation
 *
 * @example
 * ```typescript
 * const result = await prompt('What is 2+2?');  // default agent
 * const result = await prompt('What is the capital of France?', agentId);  // specific agent
 * ```
 */
export async function prompt(
  message: string,
  agentId?: string
): Promise<SDKResultMessage> {
  // Use default agent behavior (like letta -p) when no agentId specified
  const session = agentId
    ? createSession(agentId)
    : new Session({ promptMode: true });

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
