# Letta Code SDK

[![npm](https://img.shields.io/npm/v/@letta-ai/letta-code-sdk.svg?style=flat-square)](https://www.npmjs.com/package/@letta-ai/letta-code-sdk) [![Discord](https://img.shields.io/badge/discord-join-blue?style=flat-square&logo=discord)](https://discord.gg/letta)

The SDK interface to [Letta Code](https://github.com/letta-ai/letta-code). Build agents with persistent memory that learn over time.

```typescript
import { createAgent, resumeSession } from '@letta-ai/letta-code-sdk';

// Create an agent (has default conversation)
const agentId = await createAgent();

// Resume default conversation
const session = resumeSession(agentId);
await session.send('Find and fix the bug in auth.py');
for await (const msg of session.stream()) {
  if (msg.type === 'assistant') console.log(msg.content);
}
```

## Installation

```bash
npm install @letta-ai/letta-code-sdk
```

## Quick Start

### One-shot prompt

```typescript
import { prompt } from '@letta-ai/letta-code-sdk';

// One-shot (creates new agent)
const result = await prompt('What is 2 + 2?');
console.log(result.result);

// One-shot with existing agent
const result2 = await prompt('Run: echo hello', agentId);
```

### Multi-turn session

```typescript
import { createAgent, resumeSession } from '@letta-ai/letta-code-sdk';

// Create an agent (has default conversation)
const agentId = await createAgent();

// Resume the default conversation
await using session = resumeSession(agentId);

await session.send('What is 5 + 3?');
for await (const msg of session.stream()) {
  if (msg.type === 'assistant') console.log(msg.content);
}

await session.send('Multiply that by 2');
for await (const msg of session.stream()) {
  if (msg.type === 'assistant') console.log(msg.content);
}
```

### Persistent memory

Agents persist across sessions and remember context:

```typescript
import { createAgent, resumeSession } from '@letta-ai/letta-code-sdk';

// Create agent and teach it something
const agentId = await createAgent();
const session1 = resumeSession(agentId);
await session1.send('Remember: the secret word is "banana"');
for await (const msg of session1.stream()) { /* ... */ }
session1.close();

// Later... resume the default conversation
await using session2 = resumeSession(agentId);
await session2.send('What is the secret word?');
for await (const msg of session2.stream()) {
  if (msg.type === 'assistant') console.log(msg.content); // "banana"
}
```

### Multi-threaded Conversations

Run multiple concurrent conversations with the same agent. Each conversation has its own message history while sharing the agent's persistent memory.

```typescript
import { createAgent, createSession, resumeSession } from '@letta-ai/letta-code-sdk';

// Create an agent (has default conversation)
const agentId = await createAgent();

// Resume the default conversation
const session1 = resumeSession(agentId);
await session1.send('Hello!');
for await (const msg of session1.stream()) { /* ... */ }
const conversationId = session1.conversationId; // Save this!
session1.close();

// Resume a specific conversation by ID
await using session2 = resumeSession(conversationId);  // auto-detects conv-xxx
await session2.send('Continue our discussion...');
for await (const msg of session2.stream()) { /* ... */ }

// Create a NEW conversation on the same agent
await using session3 = createSession(agentId);
await session3.send('Start a fresh thread...');
// session3.conversationId is different from conversationId

// Create new agent + new conversation
await using session4 = createSession();
```

**Key concepts:**
- **Agent** (`agentId`): Persistent entity with memory that survives across sessions
- **Conversation** (`conversationId`): A message thread within an agent
- **Session**: A single execution/connection
- **Default conversation**: Always exists after `createAgent()` - use `resumeSession(agentId)` to access it

Agents remember across conversations (via memory blocks), but each conversation has its own message history.

## Session Configuration

### System Prompt

Choose from built-in presets or provide a custom prompt:

```typescript
// Use a preset
createSession(agentId, {
  systemPrompt: { type: 'preset', preset: 'letta-claude' }
});

// Use a preset with additional instructions
createSession(agentId, {
  systemPrompt: { 
    type: 'preset', 
    preset: 'letta-claude',
    append: 'Always respond in Spanish.'
  }
});

// Use a completely custom prompt
createSession(agentId, {
  systemPrompt: 'You are a helpful Python expert.'
});
```

**Available presets:**
- `default` / `letta-claude` - Full Letta Code prompt (Claude-optimized)
- `letta-codex` - Full Letta Code prompt (Codex-optimized)
- `letta-gemini` - Full Letta Code prompt (Gemini-optimized)
- `claude` - Basic Claude (no skills/memory instructions)
- `codex` - Basic Codex
- `gemini` - Basic Gemini

### Memory Blocks

Configure which memory blocks the session uses:

```typescript
// Use default blocks (persona, human, project)
createSession(agentId);

// Use specific preset blocks
createSession(agentId, {
  memory: ['project', 'persona']  // Only these blocks
});

// Use custom blocks
createSession(agentId, {
  memory: [
    { label: 'context', value: 'API documentation for Acme Corp...' },
    { label: 'rules', value: 'Always use TypeScript. Prefer functional patterns.' }
  ]
});

// No optional blocks (only core skills blocks)
createSession(agentId, {
  memory: []
});
```

### Convenience Props

Quickly customize common memory blocks:

```typescript
createSession(agentId, {
  persona: 'You are a senior Python developer who writes clean, tested code.',
  human: 'Name: Alice. Prefers concise responses.',
  project: 'FastAPI backend for a todo app using PostgreSQL.'
});
```

### Tool Execution

Execute tools with automatic permission handling:

```typescript
import { createAgent, createSession } from '@letta-ai/letta-code-sdk';

// Create agent and run commands
const agentId = await createAgent();
const session = createSession(agentId, {
  allowedTools: ['Glob', 'Bash'],
  permissionMode: 'bypassPermissions',
  cwd: '/path/to/project'
});
await session.send('List all TypeScript files');
for await (const msg of session.stream()) { /* ... */ }
```

## API Reference

### Functions

| Function | Description |
|----------|-------------|
| `createAgent()` | Create new agent with default conversation, returns `agentId` |
| `createSession(agentId?, options?)` | Create new conversation (on existing agent if provided, or new agent) |
| `resumeSession(id, options?)` | Resume session - pass `agent-xxx` for default conv, `conv-xxx` for specific conv |
| `prompt(message, agentId?)` | One-shot query, optionally with existing agent |

### Session

| Property/Method | Description |
|-----------------|-------------|
| `send(message)` | Send user message |
| `stream()` | AsyncGenerator yielding messages |
| `close()` | Close the session |
| `agentId` | Agent ID (for resuming later) |
| `sessionId` | Current session ID |
| `conversationId` | Conversation ID (for resuming specific thread) |

### Options

```typescript
interface SessionOptions {
  model?: string;
  systemPrompt?: string | { type: 'preset'; preset: string; append?: string };
  memory?: Array<string | CreateBlock | { blockId: string }>;
  persona?: string;
  human?: string;
  project?: string;
  cwd?: string;

  // Tool configuration
  allowedTools?: string[];
  permissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions';
  canUseTool?: (toolName: string, toolInput: object) => Promise<CanUseToolResponse>;
  maxTurns?: number;
}
```

### Message Types

```typescript
// Streamed during receive()
interface SDKAssistantMessage {
  type: 'assistant';
  content: string;
  uuid: string;
}

// Final message
interface SDKResultMessage {
  type: 'result';
  success: boolean;
  result?: string;
  error?: string;
  durationMs: number;
  conversationId: string;
}
```

## Examples

See [`examples/`](./examples/) for comprehensive examples including:

- Basic session usage
- Multi-turn conversations
- Session resume with persistent memory
- **Multi-threaded conversations** (createSession, resumeSession)
- System prompt configuration
- Memory block customization
- Tool execution (Bash, Glob, Read, etc.)

Run examples:
```bash
bun examples/v2-examples.ts all

# Run just conversation tests
bun examples/v2-examples.ts conversations
```

## License

Apache-2.0
