/**
 * SDK Validation
 *
 * Validates SessionOptions before spawning the CLI.
 */

import type { SessionOptions, MemoryItem, CreateBlock } from "./types.js";

/**
 * Extract block labels from memory items.
 */
function getBlockLabels(memory: MemoryItem[]): string[] {
  return memory
    .map((item) => {
      if (typeof item === "string") return item; // preset name
      if ("label" in item) return (item as CreateBlock).label; // CreateBlock
      return null; // blockId - no label to check
    })
    .filter((label): label is string => label !== null);
}

/**
 * Validate SessionOptions before spawning CLI.
 * Throws an error if validation fails.
 */
export function validateSessionOptions(options: SessionOptions): void {
  // If memory is specified, validate that convenience props match included blocks
  if (options.memory !== undefined) {
    const blockLabels = getBlockLabels(options.memory);

    if (options.persona !== undefined && !blockLabels.includes("persona")) {
      throw new Error(
        "Cannot set 'persona' value - block not included in 'memory'. " +
          "Either add 'persona' to memory array or remove the persona option."
      );
    }

    if (options.human !== undefined && !blockLabels.includes("human")) {
      throw new Error(
        "Cannot set 'human' value - block not included in 'memory'. " +
          "Either add 'human' to memory array or remove the human option."
      );
    }

    if (options.project !== undefined && !blockLabels.includes("project")) {
      throw new Error(
        "Cannot set 'project' value - block not included in 'memory'. " +
          "Either add 'project' to memory array or remove the project option."
      );
    }
  }

  // Validate systemPrompt preset if provided
  if (
    options.systemPrompt !== undefined &&
    typeof options.systemPrompt === "object"
  ) {
    const validPresets = [
      "default",
      "letta-claude",
      "letta-codex",
      "letta-gemini",
      "claude",
      "codex",
      "gemini",
    ];
    if (!validPresets.includes(options.systemPrompt.preset)) {
      throw new Error(
        `Invalid system prompt preset '${options.systemPrompt.preset}'. ` +
          `Valid presets: ${validPresets.join(", ")}`
      );
    }
  }

  // Validate conversation options
  if (options.conversationId && options.newConversation) {
    throw new Error(
      "Cannot use both 'conversationId' and 'newConversation'. " +
        "Use conversationId to resume a specific conversation, or newConversation to create a new one."
    );
  }

  if (options.defaultConversation && options.conversationId) {
    throw new Error(
      "Cannot use both 'defaultConversation' and 'conversationId'. " +
        "Use defaultConversation with agentId, or conversationId alone."
    );
  }

  if (options.defaultConversation && options.newConversation) {
    throw new Error(
      "Cannot use both 'defaultConversation' and 'newConversation'."
    );
  }

  // Note: Validations that require agentId context happen in transport.ts buildArgs()
  // because agentId is passed separately to resumeSession(), not in SessionOptions
}
