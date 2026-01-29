# Letta Code SDK

[![npm](https://img.shields.io/npm/v/@letta-ai/letta-code-sdk.svg?style=flat-square)](https://www.npmjs.com/package/@letta-ai/letta-code-sdk) [![Discord](https://img.shields.io/badge/discord-join-blue?style=flat-square&logo=discord)](https://discord.gg/letta)

The SDK interface to [Letta Code](https://github.com/letta-ai/letta-code). Build agents with persistent memory that learn over time.

```typescript
import { prompt } from '@letta-ai/letta-code-sdk';

const result = await prompt('Find and fix the bug in auth.py', {
  allowedTools: ['Read', 'Edit', 'Bash'],
  permissionMode: 'bypassPermissions'
});
console.log(result.result);
```

## Installation

```bash
npm install @letta-ai/letta-code-sdk
```

## Quick Start

### One-shot prompt

```typescript
import { prompt } from '@letta-ai/letta-code-sdk';

const result = await prompt('Run: echo hello', {
  allowedTools: ['Bash'],
  permissionMode: 'bypassPermissions'
});
console.log(result.result); // "hello"
```

### Multi-turn session

```typescript
import { createSession } from '@letta-ai/letta-code-sdk';

await using session = createSession();

await session.send('What is 5 + 3?');
for await (const msg of session.stream()) {
  if (msg.type === 'assistant') console.log(msg.content);
}

await session.send('Multiply that by 2');
for await (const msg of session.stream()) {
  if (msg.type === 'assistant') console.log(msg.content);
}
```

### Create agent first, then interact

```typescript
import { createAgent, createSession, resumeSession } from '@letta-ai/letta-code-sdk';

// Create agent with defaults
const agentId = await createAgent();
console.log(agentId); // "agent-xxx" - available immediately!

// Create agent with custom configuration
const customAgentId = await createAgent({
  model: 'claude-opus-4',
  systemPrompt: 'You are a Python expert specializing in FastAPI',
  initBlocks: ['persona', 'project'],
  blockValues: {
    persona: 'You are a senior Python developer',
    project: 'Building a REST API with FastAPI and PostgreSQL'
  },
  enableSleeptime: true
});

// Create session to interact
const session = createSession(agentId);
await session.send('Remember: the secret word is "banana"');
for await (const msg of session.stream()) { /* ... */ }
session.close();

// Later, resume the agent
const session2 = resumeSession(agentId);
await session2.send('What is the secret word?');
for await (const msg of session2.stream()) {
  if (msg.type === 'assistant') console.log(msg.content); // "banana"
}
session2.close();
```

### Multi-threaded conversations

Run multiple concurrent conversations with the same agent:

```typescript
import { createAgent, createSession, resumeSession } from '@letta-ai/letta-code-sdk';

const agentId = await createAgent();

// Create two separate conversations
const session1 = createSession(agentId, { newConversation: true });
await session1.send('Topic A discussion...');
for await (const msg of session1.stream()) { /* ... */ }
const convId1 = session1.conversationId;
session1.close();

const session2 = createSession(agentId, { newConversation: true });
await session2.send('Topic B discussion...');
for await (const msg of session2.stream()) { /* ... */ }
session2.close();

// Resume specific conversation later
const resumed = resumeSession(convId1);  // auto-detects conv-* prefix
```

### Understanding conversation options

```typescript
const agentId = await createAgent();

// Connect to default conversation (stable, predictable)
createSession(agentId);
createSession(agentId, { defaultConversation: true }); // explicit
resumeSession(agentId, { defaultConversation: true }); // also works

// Create new conversation
createSession(agentId, { newConversation: true });
resumeSession(agentId, { newConversation: true }); // also works

// Continue from last conversation (resume behavior)
resumeSession(agentId); // default behavior: --continue flag

// Resume specific conversation by ID
resumeSession('conv-xxx');
```

## Key Concepts

- **Agent** (`agentId`): Persistent entity with memory that survives across sessions
- **Session**: Connection to interact with an agent
- **Conversation** (`conversationId`): A message thread within an agent

## Configuration

### System Prompts

Choose from built-in presets or provide custom prompts:

```typescript
// Use a preset
await createAgent({
  systemPrompt: { type: 'preset', preset: 'letta-claude' }
});

// Custom prompt
await createAgent({
  systemPrompt: 'You are a helpful Python expert.'
});

// Preset with additional instructions
await createAgent({
  systemPrompt: {
    type: 'preset',
    preset: 'letta-claude',
    append: 'Always respond in Spanish.'
  }
});
```

Available presets: `default`, `letta-claude`, `letta-codex`, `letta-gemini`, `claude`, `codex`, `gemini`

### Memory Blocks

Configure which memory blocks the agent uses:

```typescript
// Use default blocks (persona, human, project)
await createAgent({});

// Specific preset blocks only
await createAgent({
  initBlocks: ['persona', 'project']
});

// Custom blocks
await createAgent({
  memory: [
    { label: 'context', value: 'API documentation for Acme Corp...' },
    { label: 'rules', value: 'Always use TypeScript. Prefer functional patterns.' }
  ]
});

// Set values for preset blocks
await createAgent({
  initBlocks: ['persona', 'project'],
  blockValues: {
    persona: 'You are a senior Python developer',
    project: 'Building a CLI tool for Docker management'
  }
});
```

### Tool Configuration

Control which tools are available:

```typescript
// Customize base tools
await createAgent({
  baseTools: ['memory', 'web_search']  // Only these server-side tools
});

// Filter tools at runtime
const session = createSession(agentId, {
  allowedTools: ['Read', 'Bash'],  // Only these client-side tools
  permissionMode: 'bypassPermissions'
});
```

## API Reference

### Functions

| Function | Description |
|----------|-------------|
| `createAgent(options?)` | Create agent, returns agentId immediately |
| `createSession(agentId?, options?)` | Create session (default conversation if agentId provided, new agent otherwise) |
| `resumeSession(id, options?)` | Resume by agentId (continues last conversation by default) or convId (auto-detects). Supports `defaultConversation` and `newConversation` options. |
| `prompt(message, options?)` | One-shot query, uses LRU agent or creates new |

### Session

| Property/Method | Description |
|-----------------|-------------|
| `send(message)` | Send user message |
| `stream()` | AsyncGenerator yielding messages |
| `close()` | Close the session |
| `abort()` | Abort current execution |
| `agentId` | Agent ID (available after send) |
| `sessionId` | Current session ID |
| `conversationId` | Conversation ID |

### AgentOptions

```typescript
interface AgentOptions {
  // Model configuration
  model?: string;  // e.g., "claude-sonnet-4", "claude-opus-4"

  // System prompt
  systemPrompt?: string | SystemPromptPresetConfig;
  systemPromptAppend?: string;  // Append additional instructions

  // Memory configuration
  memory?: MemoryItem[];  // Custom memory blocks
  initBlocks?: string[];  // Which preset blocks to include (default: ["persona", "human", "project"])
  blockValues?: Record<string, string>;  // Set values for blocks (e.g., { persona: "You are..." })

  // Tool configuration
  baseTools?: string[];  // Base tools to load (default: ["memory", "web_search", ...])

  // Advanced options
  enableSleeptime?: boolean;  // Enable sleeptime functionality
  skillsDirectory?: string;   // Custom skills directory
  cwd?: string;              // Working directory
}
```

### SessionOptions

```typescript
// SessionOptions extends AgentOptions
interface SessionOptions extends AgentOptions {
  // Session targeting
  agentId?: string;              // Resume specific agent
  conversationId?: string;       // Resume specific conversation
  newConversation?: boolean;     // Create new conversation on agent
  defaultConversation?: boolean; // Connect to default conversation (explicit)

  // Convenience props for common blocks
  persona?: string;
  human?: string;
  project?: string;

  // Permission configuration (runtime)
  allowedTools?: string[];    // Filter which tools are available
  permissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions';
  canUseTool?: CanUseToolCallback;  // Custom permission callback

  // Other options
  maxTurns?: number;
}
```

SessionOptions inherits all agent configuration options from AgentOptions (model, systemPrompt, memory, initBlocks, baseTools, etc.). When creating a session without an agentId, these options configure the new agent.

### Message Types

```typescript
interface SDKAssistantMessage {
  type: 'assistant';
  content: string;
  uuid: string;
}

interface SDKResultMessage {
  type: 'result';
  success: boolean;
  result?: string;
  error?: string;
  durationMs: number;
  conversationId: string | null;
}
```

## Examples

See [`examples/`](./examples/) for comprehensive examples.

## License

Apache-2.0
