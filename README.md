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

// Create agent via CLI - get ID immediately
const agentId = await createAgent();
console.log(agentId); // "agent-xxx" - available immediately!

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
import { createAgent, resumeSession } from '@letta-ai/letta-code-sdk';

const agentId = await createAgent();

// Create two separate conversations
const session1 = resumeSession(agentId, { newConversation: true });
await session1.send('Topic A discussion...');
for await (const msg of session1.stream()) { /* ... */ }
const convId1 = session1.conversationId;
session1.close();

const session2 = resumeSession(agentId, { newConversation: true });
await session2.send('Topic B discussion...');
for await (const msg of session2.stream()) { /* ... */ }
session2.close();

// Resume specific conversation later
const resumed = resumeSession(convId1);  // auto-detects conv-* prefix
```

## Key Concepts

- **Agent** (`agentId`): Persistent entity with memory that survives across sessions
- **Session**: Connection to interact with an agent
- **Conversation** (`conversationId`): A message thread within an agent

## API Reference

### Functions

| Function | Description |
|----------|-------------|
| `createAgent(options?)` | Create agent via API, returns agentId immediately |
| `createSession(agentId?)` | Create session (new agent if no ID) |
| `resumeSession(id, options?)` | Resume by agentId or convId (auto-detects) |
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

### CreateAgentOptions

```typescript
interface CreateAgentOptions {
  name?: string;
  description?: string;
  model?: string;
  embedding?: string;
  systemPrompt?: string;
  memory?: MemoryItem[];
}
```

### SessionOptions

```typescript
interface SessionOptions {
  model?: string;
  newConversation?: boolean;
  systemPrompt?: string | SystemPromptPresetConfig;
  memory?: MemoryItem[];
  persona?: string;
  human?: string;
  project?: string;
  allowedTools?: string[];
  permissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions';
  cwd?: string;
  maxTurns?: number;
  canUseTool?: CanUseToolCallback;
}
```

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
