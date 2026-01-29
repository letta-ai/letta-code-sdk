/**
 * LRU (Last Recently Used) tracking for agents and conversations.
 */

let lruAgentId: string | null = null;
let lruConversationId: string | null = null;

/** Get the last used agent ID */
export function getLruAgentId(): string | null {
  return lruAgentId;
}

/** Get the last used conversation ID */
export function getLruConversationId(): string | null {
  return lruConversationId;
}

/** Update LRU tracking */
export function updateLru(agentId: string, conversationId: string): void {
  lruAgentId = agentId;
  lruConversationId = conversationId;
}

/** Clear LRU tracking (for testing) */
export function clearLru(): void {
  lruAgentId = null;
  lruConversationId = null;
}
