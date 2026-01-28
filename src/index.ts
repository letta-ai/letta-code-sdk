/**
 * Letta Code SDK
 *
 * Programmatic control of Letta Code CLI with persistent agent memory.
 *
 * @example
 * ```typescript
 * import { createSession, prompt } from '@letta-ai/letta-code-sdk';
 *
 * // One-shot
 * const result = await prompt('What is 2+2?', { model: 'claude-sonnet-4-20250514' });
 *
 * // Multi-turn session
 * await using session = createSession({ model: 'claude-sonnet-4-20250514' });
 * await session.send('Hello!');
 * for await (const msg of session.stream()) {
 *   if (msg.type === 'assistant') console.log(msg.content);
 * }
 *
 * // Resume with persistent memory
 * await using resumed = resumeSession(agentId, { model: 'claude-sonnet-4-20250514' });
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
  // Tool types
  AgentTool,
  AgentToolResult,
  AgentToolResultContent,
  AgentToolUpdateCallback,
  AnyAgentTool,
} from "./types.js";

export { Session } from "./session.js";

// Tool helpers
export {
  jsonResult,
  readStringParam,
  readNumberParam,
  readBooleanParam,
  readStringArrayParam,
} from "./tool-helpers.js";

/**
 * Create a new session with a fresh Letta agent.
 *
 * The agent will have persistent memory that survives across sessions.
 * Use `resumeSession` to continue a conversation with an existing agent.
 *
 * @example
 * ```typescript
 * await using session = createSession({ model: 'claude-sonnet-4-20250514' });
 * await session.send('My name is Alice');
 * for await (const msg of session.stream()) {
 *   console.log(msg);
 * }
 * console.log(`Agent ID: ${session.agentId}`); // Save this to resume later
 * ```
 */
export function createSession(options: SessionOptions = {}): Session {
  return new Session(options);
}

/**
 * Resume an existing session with a Letta agent.
 *
 * Unlike Claude Agent SDK (ephemeral sessions), Letta agents have persistent
 * memory. You can resume a conversation days later and the agent will remember.
 *
 * @example
 * ```typescript
 * // Days later...
 * await using session = resumeSession(agentId, { model: 'claude-sonnet-4-20250514' });
 * await session.send('What is my name?');
 * for await (const msg of session.stream()) {
 *   // Agent remembers: "Your name is Alice"
 * }
 * ```
 */
export function resumeSession(
  agentId: string,
  options: SessionOptions = {}
): Session {
  return new Session({ ...options, agentId });
}

/**
 * Resume an existing conversation.
 *
 * Conversations are threads within an agent. The agent is derived automatically
 * from the conversation ID. Use this to continue a specific conversation thread.
 *
 * @example
 * ```typescript
 * // Resume a specific conversation
 * await using session = resumeConversation(conversationId);
 * await session.send('Continue our discussion...');
 * for await (const msg of session.stream()) {
 *   console.log(msg);
 * }
 * ```
 */
export function resumeConversation(
  conversationId: string,
  options: SessionOptions = {}
): Session {
  return new Session({ ...options, conversationId });
}

/**
 * One-shot prompt convenience function.
 *
 * Creates a session, sends the prompt, collects the response, and closes.
 * Returns the final result message.
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
  options: SessionOptions = {}
): Promise<SDKResultMessage> {
  const session = createSession(options);

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
