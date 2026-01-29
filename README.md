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
import { createAgent } from '@letta-ai/letta-code-sdk';

await using agent = createAgent();

await agent.send('What is 5 + 3?');
for await (const msg of agent.stream()) {
  if (msg.type === 'assistant') console.log(msg.content);
}

await agent.send('Multiply that by 2');
for await (const msg of agent.stream()) {
  if (msg.type === 'assistant') console.log(msg.content);
}
```

### Persistent memory

Agents persist across sessions and remember context:

```typescript
import { createAgent, resumeAgent } from '@letta-ai/letta-code-sdk';

// First session
const agent1 = createAgent();
await agent1.send('Remember: the secret word is "banana"');
for await (const msg of agent1.stream()) { /* ... */ }
const agentId = agent1.agentId;
agent1.close();

// Later...
await using agent2 = resumeAgent(agentId);
await agent2.send('What is the secret word?');
for await (const msg of agent2.stream()) {
  if (msg.type === 'assistant') console.log(msg.content); // "banana"
}
```

### Multi-threaded conversations

Run multiple concurrent conversations with the same agent:

```typescript
import { createAgent, resumeAgent } from '@letta-ai/letta-code-sdk';

// Create an agent
const agent = createAgent();
await agent.send('Hello!');
for await (const msg of agent.stream()) { /* ... */ }
const agentId = agent.agentId;
const conversationId = agent.conversationId;
agent.close();

// Resume a specific conversation (auto-detects conv-* prefix)
await using agent2 = resumeAgent(conversationId);
await agent2.send('Continue our discussion...');
for await (const msg of agent2.stream()) { /* ... */ }

// Create a NEW conversation on the same agent
await using agent3 = resumeAgent(agentId, { newConversation: true });
await agent3.send('Start a fresh thread...');
// agent3.conversationId is different from conversationId

// Resume with LRU (no ID needed)
await using agent4 = resumeAgent();
```

## Key Concepts

- **Agent** (`agentId`): Persistent entity with memory that survives across sessions
- **Conversation** (`conversationId`): A message thread within an agent
- **LRU**: Last Recently Used - the SDK tracks your last used agent/conversation

## Agent Configuration

### System Prompt

Choose from built-in presets or provide a custom prompt:

```typescript
// Use a preset
createAgent({
  systemPrompt: { type: 'preset', preset: 'letta-claude' }
});

// Use a preset with additional instructions
createAgent({
  systemPrompt: { 
    type: 'preset', 
    preset: 'letta-claude',
    append: 'Always respond in Spanish.'
  }
});

// Use a completely custom prompt
createAgent({
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

Configure which memory blocks the agent uses:

```typescript
// Use default blocks (persona, human, project)
createAgent({});

// Use specific preset blocks
createAgent({
  memory: ['project', 'persona']  // Only these blocks
});

// Use custom blocks
createAgent({
  memory: [
    { label: 'context', value: 'API documentation for Acme Corp...' },
    { label: 'rules', value: 'Always use TypeScript. Prefer functional patterns.' }
  ]
});

// Mix presets and custom blocks
createAgent({
  memory: [
    'project',  // Use default project block
    { label: 'custom', value: 'Additional context...' }
  ]
});

// No optional blocks (only core skills blocks)
createAgent({
  memory: []
});
```

### Convenience Props

Quickly customize common memory blocks:

```typescript
createAgent({
  persona: 'You are a senior Python developer who writes clean, tested code.',
  human: 'Name: Alice. Prefers concise responses.',
  project: 'FastAPI backend for a todo app using PostgreSQL.'
});

// Combine with memory config
createAgent({
  memory: ['persona', 'project'],  // Only include these blocks
  persona: 'You are a Go expert.',
  project: 'CLI tool for managing Docker containers.'
});
```

### Tool Execution

Execute tools with automatic permission handling:

```typescript
import { prompt } from '@letta-ai/letta-code-sdk';

// Run shell commands
const result = await prompt('List all TypeScript files', {
  allowedTools: ['Glob', 'Bash'],
  permissionMode: 'bypassPermissions',
  cwd: '/path/to/project'
});

// Read and analyze code
const analysis = await prompt('Explain what auth.ts does', {
  allowedTools: ['Read', 'Grep'],
  permissionMode: 'bypassPermissions'
});
```

## API Reference

### Functions

| Function | Description |
|----------|-------------|
| `createAgent(options?)` | Create new agent |
| `resumeAgent(id?, options?)` | Resume agent or conversation (auto-detects `agent-*` vs `conv-*` prefix) |
| `prompt(message, options?)` | One-shot query, returns result directly |

### Valid Combinations

The table below shows how each function resolves the agent and conversation:

- **Agent**: `New` (creates new), `LRU` (last used), `Specified` (by ID), `Derived` (from conversation)
- **Conversation**: `Default` (agent's main thread), `New` (fresh thread), `LRU or Default` (last used if available), `Specified` (by ID)

| Function | Agent | Conversation |
|----------|-------|--------------|
| `createAgent()` | New | Default |
| `createAgent({ newConversation })` | New | New |
| `resumeAgent()` | LRU | LRU or Default |
| `resumeAgent({ newConversation })` | LRU | New |
| `resumeAgent(agentId)` | Specified | Default |
| `resumeAgent(agentId, { newConversation })` | Specified | New |
| `resumeAgent(agentId, { lastConversation })` | Specified | LRU or Default |
| `resumeAgent(conversationId)` | Derived | Specified |
| `prompt(msg)` | LRU or New | New |
| `prompt(msg, { agentId })` | Specified | New |

### Agent

| Property/Method | Description |
|-----------------|-------------|
| `send(message)` | Send user message |
| `stream()` | AsyncGenerator yielding messages |
| `close()` | Close the session |
| `abort()` | Abort current execution |
| `agentId` | Agent ID (for resuming later) |
| `sessionId` | Current session ID |
| `conversationId` | Conversation ID (for resuming specific thread) |

### Options

```typescript
interface AgentOptions {
  // Model selection
  model?: string;

  // Conversation options
  newConversation?: boolean;     // Create new conversation
  lastConversation?: boolean;    // Use LRU conversation for this agent

  // System prompt: string or preset config
  systemPrompt?: string | {
    type: 'preset';
    preset: 'default' | 'letta-claude' | 'letta-codex' | 'letta-gemini' | 'claude' | 'codex' | 'gemini';
    append?: string;
  };

  // Memory blocks: preset names, custom blocks, or mixed
  memory?: Array<string | CreateBlock | { blockId: string }>;

  // Convenience: set block values directly
  persona?: string;
  human?: string;
  project?: string;

  // Tool configuration
  allowedTools?: string[];
  permissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions';

  // Working directory
  cwd?: string;

  // Custom permission callback
  canUseTool?: (toolName: string, input: Record<string, unknown>) => CanUseToolResponse;
}
```

### Message Types

```typescript
// Streamed during stream()
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
- Multi-threaded conversations
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
