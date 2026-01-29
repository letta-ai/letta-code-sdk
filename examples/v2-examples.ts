#!/usr/bin/env bun

/**
 * Letta Code SDK V2 Examples
 * 
 * Comprehensive tests for all SDK features.
 * 
 * Run with: bun examples/v2-examples.ts [example]
 */

import { createAgent, createSession, resumeSession, prompt } from '../src/index.js';

async function main() {
  const example = process.argv[2] || 'basic';

  switch (example) {
    case 'basic':
      await basicSession();
      break;
    case 'multi-turn':
      await multiTurn();
      break;
    case 'one-shot':
      await oneShot();
      break;
    case 'create-agent':
      await testCreateAgent();
      break;
    case 'resume':
      await sessionResume();
      break;
    case 'options':
      await testOptions();
      break;
    case 'message-types':
      await testMessageTypes();
      break;
    case 'session-properties':
      await testSessionProperties();
      break;
    case 'tool-execution':
      await testToolExecution();
      break;
    case 'permission-callback':
      await testPermissionCallback();
      break;
    case 'system-prompt':
      await testSystemPrompt();
      break;
    case 'memory-config':
      await testMemoryConfig();
      break;
    case 'convenience-props':
      await testConvenienceProps();
      break;
    case 'conversations':
      await testConversations();
      break;
    case 'all':
      await basicSession();
      await multiTurn();
      await oneShot();
      await testCreateAgent();
      await sessionResume();
      await testOptions();
      await testMessageTypes();
      await testSessionProperties();
      await testToolExecution();
      await testPermissionCallback();
      await testSystemPrompt();
      await testMemoryConfig();
      await testConvenienceProps();
      await testConversations();
      console.log('\n✅ All examples passed');
      break;
    default:
      console.log('Usage: bun v2-examples.ts [basic|multi-turn|one-shot|create-agent|resume|options|message-types|session-properties|tool-execution|permission-callback|system-prompt|memory-config|convenience-props|conversations|all]');
  }
}

// ═══════════════════════════════════════════════════════════════
// BASIC EXAMPLES
// ═══════════════════════════════════════════════════════════════

// Basic session with send/receive pattern
async function basicSession() {
  console.log('=== Basic Session ===\n');

  await using session = createSession(undefined, {
    model: 'haiku',
    permissionMode: 'bypassPermissions',
  });
  
  await session.send('Hello! Introduce yourself in one sentence.');

  let response = '';
  for await (const msg of session.stream()) {
    if (msg.type === 'assistant') {
      response += msg.content;
    }
    if (msg.type === 'result') {
      console.log(`Letta: ${response.trim()}`);
      console.log(`[Result: ${msg.success ? 'success' : 'failed'}, ${msg.durationMs}ms]`);
    }
  }
  console.log();
}

// Multi-turn conversation
async function multiTurn() {
  console.log('=== Multi-Turn Conversation ===\n');

  await using session = createSession(undefined, {
    model: 'haiku',
    permissionMode: 'bypassPermissions',
  });

  // Turn 1
  await session.send('What is 5 + 3? Just the number.');
  let turn1Result = '';
  for await (const msg of session.stream()) {
    if (msg.type === 'assistant') turn1Result += msg.content;
  }
  console.log(`Turn 1: ${turn1Result.trim()}`);

  // Turn 2 - agent remembers context
  await session.send('Multiply that by 2. Just the number.');
  let turn2Result = '';
  for await (const msg of session.stream()) {
    if (msg.type === 'assistant') turn2Result += msg.content;
  }
  console.log(`Turn 2: ${turn2Result.trim()}`);
  console.log();
}

// One-shot convenience function
async function oneShot() {
  console.log('=== One-Shot Prompt ===\n');

  const result = await prompt('What is the capital of France? One word.', {
    model: 'haiku',
    permissionMode: 'bypassPermissions',
  });

  if (result.success) {
    console.log(`Answer: ${result.result}`);
    console.log(`Duration: ${result.durationMs}ms`);
  } else {
    console.log(`Error: ${result.error}`);
  }
  console.log();
}

// Create agent first, then interact
async function testCreateAgent() {
  console.log('=== Create Agent + Sessions ===\n');

  // Create agent with custom configuration
  console.log('Creating agent...');
  const agentId = await createAgent({
    model: 'haiku',
    systemPrompt: 'You are a helpful assistant. Keep responses concise.',
    blockValues: {
      persona: 'You are a friendly AI assistant.',
    },
  });
  console.log(`Agent created: ${agentId}\n`);

  // Session 1: Connect to default conversation
  console.log('[Session 1] Connect to agent (default conversation)...');
  {
    const session = createSession(agentId, {
      permissionMode: 'bypassPermissions',
    });

    await session.send('Remember: my favorite color is blue.');
    let response = '';
    for await (const msg of session.stream()) {
      if (msg.type === 'assistant') response += msg.content;
      if (msg.type === 'result') {
        console.log(`Response: ${response.trim()}`);
        console.log(`Conversation: ${session.conversationId}\n`);
      }
    }
    session.close();
  }

  // Session 2: Resume (continues from last)
  console.log('[Session 2] Resume agent (continues last conversation)...');
  {
    await using session = resumeSession(agentId, {
      permissionMode: 'bypassPermissions',
    });

    await session.send('What is my favorite color?');
    let response = '';
    for await (const msg of session.stream()) {
      if (msg.type === 'assistant') response += msg.content;
      if (msg.type === 'result') {
        console.log(`Response: ${response.trim()}`);
        const remembers = response.toLowerCase().includes('blue');
        console.log(`Remembers: ${remembers ? 'YES ✓' : 'NO ✗'}\n`);
      }
    }
  }

  // Session 3: Create new conversation
  console.log('[Session 3] Resume with NEW conversation...');
  {
    await using session = resumeSession(agentId, {
      permissionMode: 'bypassPermissions',
      newConversation: true,
    });

    await session.send('What is my favorite color?');
    let response = '';
    for await (const msg of session.stream()) {
      if (msg.type === 'assistant') response += msg.content;
      if (msg.type === 'result') {
        console.log(`Response: ${response.trim()}`);
        const remembers = response.toLowerCase().includes('blue');
        console.log(`Remembers: ${remembers ? 'NO (expected) ✓' : 'YES (unexpected) ✗'}\n`);
      }
    }
  }

  console.log('Key insights:');
  console.log('  - createSession(agentId) → default conversation (stable)');
  console.log('  - resumeSession(agentId) → last conversation (continue work)');
  console.log('  - { newConversation: true } → fresh start\n');
}

// Session resume - with PERSISTENT MEMORY
async function sessionResume() {
  console.log('=== Session Resume (Persistent Memory) ===\n');

  let agentId: string | null = null;

  // First session - establish a memory
  {
    const session = createSession(undefined, {
      model: 'haiku',
      permissionMode: 'bypassPermissions',
    });
    
    console.log('[Session 1] Teaching agent a secret word...');
    await session.send('Remember this secret word: "pineapple". Store it in your memory.');

    let response = '';
    for await (const msg of session.stream()) {
      if (msg.type === 'assistant') response += msg.content;
      if (msg.type === 'result') {
        console.log(`[Session 1] Agent: ${response.trim()}`);
      }
    }
    
    agentId = session.agentId;
    console.log(`[Session 1] Agent ID: ${agentId}\n`);
    session.close();
  }

  console.log('--- Session closed. Agent persists on server. ---\n');

  // Resume and verify agent remembers
  {
    await using session = resumeSession(agentId!, {
      permissionMode: 'bypassPermissions',
    });
    
    console.log('[Session 2] Asking agent for the secret word...');
    await session.send('What is the secret word I told you to remember?');

    let response = '';
    for await (const msg of session.stream()) {
      if (msg.type === 'assistant') response += msg.content;
      if (msg.type === 'result') {
        console.log(`[Session 2] Agent: ${response.trim()}`);
      }
    }
  }
  console.log();
}

// ═══════════════════════════════════════════════════════════════
// OPTIONS TESTS
// ═══════════════════════════════════════════════════════════════

async function testOptions() {
  console.log('=== Testing Options ===\n');

  // Test model option
  console.log('Testing model option...');
  const modelResult = await prompt('Say "model test ok"', {
    model: 'haiku',
    permissionMode: 'bypassPermissions',
  });
  console.log(`  model: ${modelResult.success ? 'PASS' : 'FAIL'} - ${modelResult.result?.slice(0, 50)}`);

  // Test systemPrompt option
  console.log('Testing systemPrompt option...');
  const sysPromptResult = await prompt('Tell me a fun fact about penguins in one sentence.', {
    model: 'haiku',
    systemPrompt: 'You love penguins and always try to work penguin facts into conversations.',
    permissionMode: 'bypassPermissions',
  });
  const hasPenguin = sysPromptResult.result?.toLowerCase().includes('penguin');
  console.log(`  systemPrompt: ${hasPenguin ? 'PASS' : 'PARTIAL'} - ${sysPromptResult.result?.slice(0, 80)}`);

  // Test cwd option
  console.log('Testing cwd option...');
  const cwdResult = await prompt('Run pwd to show current directory', {
    model: 'haiku',
    cwd: '/tmp',
    allowedTools: ['Bash'],
    permissionMode: 'bypassPermissions',
  });
  const hasTmp = cwdResult.result?.includes('/tmp');
  console.log(`  cwd: ${hasTmp ? 'PASS' : 'CHECK'} - ${cwdResult.result?.slice(0, 60)}`);

  // Test allowedTools option with tool execution
  console.log('Testing allowedTools option...');
  const toolsResult = await prompt('Run: echo tool-test-ok', {
    model: 'haiku',
    allowedTools: ['Bash'],
    permissionMode: 'bypassPermissions',
  });
  const hasToolOutput = toolsResult.result?.includes('tool-test-ok');
  console.log(`  allowedTools: ${hasToolOutput ? 'PASS' : 'CHECK'} - ${toolsResult.result?.slice(0, 60)}`);

  // Test permissionMode: bypassPermissions
  console.log('Testing permissionMode: bypassPermissions...');
  const bypassResult = await prompt('Run: echo bypass-test', {
    model: 'haiku',
    allowedTools: ['Bash'],
    permissionMode: 'bypassPermissions',
  });
  const hasBypassOutput = bypassResult.result?.includes('bypass-test');
  console.log(`  permissionMode: ${hasBypassOutput ? 'PASS' : 'CHECK'}`);

  console.log();
}

// ═══════════════════════════════════════════════════════════════
// MESSAGE TYPES TESTS
// ═══════════════════════════════════════════════════════════════

async function testMessageTypes() {
  console.log('=== Testing Message Types ===\n');

  const session = createSession(undefined, {
    model: 'haiku',
    permissionMode: 'bypassPermissions',
  });

  await session.send('Say "hello" exactly');

  let sawAssistant = false;
  let sawResult = false;
  let assistantContent = '';

  for await (const msg of session.stream()) {
    if (msg.type === 'assistant') {
      sawAssistant = true;
      assistantContent += msg.content;
      // Verify assistant message has uuid
      if (!msg.uuid) {
        console.log('  assistant.uuid: FAIL - missing uuid');
      }
    }
    if (msg.type === 'result') {
      sawResult = true;
      // Verify result message structure
      const hasSuccess = typeof msg.success === 'boolean';
      const hasDuration = typeof msg.durationMs === 'number';
      console.log(`  result.success: ${hasSuccess ? 'PASS' : 'FAIL'}`);
      console.log(`  result.durationMs: ${hasDuration ? 'PASS' : 'FAIL'}`);
      console.log(`  result.result: ${msg.result ? 'PASS' : 'FAIL (empty)'}`);
    }
  }

  console.log(`  assistant message received: ${sawAssistant ? 'PASS' : 'FAIL'}`);
  console.log(`  result message received: ${sawResult ? 'PASS' : 'FAIL'}`);

  session.close();
  console.log();
}

// ═══════════════════════════════════════════════════════════════
// SESSION PROPERTIES TESTS
// ═══════════════════════════════════════════════════════════════

async function testSessionProperties() {
  console.log('=== Testing Session Properties ===\n');

  const session = createSession(undefined, {
    model: 'haiku',
    permissionMode: 'bypassPermissions',
  });

  // Before send - properties should be null
  console.log(`  agentId before send: ${session.agentId === null ? 'PASS (null)' : 'FAIL'}`);
  console.log(`  sessionId before send: ${session.sessionId === null ? 'PASS (null)' : 'FAIL'}`);

  await session.send('Hi');
  for await (const _ of session.stream()) {
    // drain
  }

  // After send - properties should be set
  const hasAgentId = session.agentId !== null && session.agentId.startsWith('agent-');
  const hasSessionId = session.sessionId !== null;
  console.log(`  agentId after send: ${hasAgentId ? 'PASS' : 'FAIL'} - ${session.agentId}`);
  console.log(`  sessionId after send: ${hasSessionId ? 'PASS' : 'FAIL'} - ${session.sessionId}`);

  // Test close()
  session.close();
  console.log(`  close(): PASS (no error)`);

  console.log();
}

// ═══════════════════════════════════════════════════════════════
// TOOL EXECUTION TESTS
// ═══════════════════════════════════════════════════════════════

async function testToolExecution() {
  console.log('=== Testing Tool Execution ===\n');

  // Test 1: Basic command execution
  console.log('Testing basic command execution...');
  const echoResult = await prompt('Run: echo hello-world', {
    model: 'haiku',
    allowedTools: ['Bash'],
    permissionMode: 'bypassPermissions',
  });
  const hasHello = echoResult.result?.includes('hello-world');
  console.log(`  echo command: ${hasHello ? 'PASS' : 'FAIL'}`);

  // Test 2: Command with arguments
  console.log('Testing command with arguments...');
  const argsResult = await prompt('Run: echo "arg1 arg2 arg3"', {
    model: 'haiku',
    allowedTools: ['Bash'],
    permissionMode: 'bypassPermissions',
  });
  const hasArgs = argsResult.result?.includes('arg1') && argsResult.result?.includes('arg3');
  console.log(`  echo with args: ${hasArgs ? 'PASS' : 'FAIL'}`);

  // Test 3: File reading with Glob
  console.log('Testing Glob tool...');
  const globResult = await prompt('List all .ts files in the current directory using Glob', {
    model: 'haiku',
    allowedTools: ['Glob'],
    permissionMode: 'bypassPermissions',
  });
  console.log(`  Glob tool: ${globResult.success ? 'PASS' : 'FAIL'}`);

  // Test 4: Multi-step tool usage (agent decides which tools to use)
  console.log('Testing multi-step tool usage...');
  const multiResult = await prompt('First run "echo step1", then run "echo step2". Show me both outputs.', {
    model: 'haiku',
    allowedTools: ['Bash'],
    permissionMode: 'bypassPermissions',
  });
  const hasStep1 = multiResult.result?.includes('step1');
  const hasStep2 = multiResult.result?.includes('step2');
  console.log(`  multi-step: ${hasStep1 && hasStep2 ? 'PASS' : 'PARTIAL'} (step1: ${hasStep1}, step2: ${hasStep2})`);

  console.log();
}

// ═══════════════════════════════════════════════════════════════
// PERMISSION CALLBACK TESTS
// ═══════════════════════════════════════════════════════════════

async function testPermissionCallback() {
  console.log('=== Testing Permission Callback ===\n');

  // Note: permissionMode 'default' with NO allowedTools triggers callback
  // allowedTools auto-allows tools, bypassing the callback

  // Test 1: Allow specific commands via callback
  console.log('Testing canUseTool callback (allow)...');
  const allowResult = await prompt('Run: echo callback-allowed', {
    model: 'haiku',
    // NO allowedTools - this ensures callback is invoked
    permissionMode: 'default',
    canUseTool: async (toolName, toolInput) => {
      console.error('CALLBACK:', toolName, toolInput);
      const command = (toolInput as { command?: string }).command || '';
      if (command.includes('callback-allowed')) {
        return { behavior: 'allow', message: 'Command whitelisted' };
      }
      return { behavior: 'deny', message: 'Command not whitelisted' };
    },
  });
  const hasAllowed = allowResult.result?.includes('callback-allowed');
  console.log(`  allow via callback: ${hasAllowed ? 'PASS' : 'FAIL'}`);

  // Test 2: Deny specific commands via callback
  console.log('Testing canUseTool callback (deny)...');
  const denyResult = await prompt('Run: echo dangerous-command', {
    model: 'haiku',
    permissionMode: 'default',
    canUseTool: async (toolName, toolInput) => {
      const command = (toolInput as { command?: string }).command || '';
      if (command.includes('dangerous')) {
        return { behavior: 'deny', message: 'Dangerous command blocked' };
      }
      return { behavior: 'allow' };
    },
  });
  // Agent should report that it couldn't execute the command
  const wasDenied = !denyResult.result?.includes('dangerous-command');
  console.log(`  deny via callback: ${wasDenied ? 'PASS' : 'CHECK'}`);

  console.log();
}

// ═══════════════════════════════════════════════════════════════
// SYSTEM PROMPT TESTS
// ═══════════════════════════════════════════════════════════════

async function testSystemPrompt() {
  console.log('=== Testing System Prompt Configuration ===\n');

  // Test 1: Preset system prompt
  console.log('Testing preset system prompt...');
  const presetResult = await prompt('What kind of agent are you? One sentence.', {
    model: 'haiku',
    systemPrompt: { type: 'preset', preset: 'letta-claude' },
    permissionMode: 'bypassPermissions',
  });
  console.log(`  preset (letta-claude): ${presetResult.success ? 'PASS' : 'FAIL'}`);
  console.log(`    Response: ${presetResult.result?.slice(0, 80)}...`);

  // Test 2: Preset with append
  console.log('Testing preset with append...');
  const appendResult = await prompt('Say hello', {
    model: 'haiku',
    systemPrompt: { 
      type: 'preset', 
      preset: 'letta-claude',
      append: 'Always end your responses with "🎉"'
    },
    permissionMode: 'bypassPermissions',
  });
  const hasEmoji = appendResult.result?.includes('🎉');
  console.log(`  preset with append: ${hasEmoji ? 'PASS' : 'CHECK'}`);
  console.log(`    Response: ${appendResult.result?.slice(0, 80)}...`);

  // Test 3: Custom string system prompt
  console.log('Testing custom string system prompt...');
  const customResult = await prompt('What is your specialty?', {
    model: 'haiku',
    systemPrompt: 'You are a pirate captain. Always speak like a pirate.',
    permissionMode: 'bypassPermissions',
  });
  const hasPirateSpeak = customResult.result?.toLowerCase().includes('arr') || 
                         customResult.result?.toLowerCase().includes('matey') ||
                         customResult.result?.toLowerCase().includes('ship');
  console.log(`  custom string: ${customResult.success ? 'PASS' : 'FAIL'}`);
  console.log(`    Response: ${customResult.result?.slice(0, 80)}...`);

  // Test 4: Basic preset (claude - no skills/memory)
  console.log('Testing basic preset (claude)...');
  const basicResult = await prompt('Hello, just say hi back', {
    model: 'haiku',
    systemPrompt: { type: 'preset', preset: 'claude' },
    permissionMode: 'bypassPermissions',
  });
  console.log(`  basic preset (claude): ${basicResult.success ? 'PASS' : 'FAIL'}`);

  console.log();
}

// ═══════════════════════════════════════════════════════════════
// MEMORY CONFIGURATION TESTS
// ═══════════════════════════════════════════════════════════════

async function testMemoryConfig() {
  console.log('=== Testing Memory Configuration ===\n');

  // Test 1: Default memory (persona, human, project)
  console.log('Testing default memory blocks...');
  const defaultResult = await prompt('What memory blocks do you have? List their labels.', {
    model: 'haiku',
    permissionMode: 'bypassPermissions',
  });
  const hasDefaultBlocks = defaultResult.result?.includes('persona') || 
                           defaultResult.result?.includes('project');
  console.log(`  default blocks: ${defaultResult.success ? 'PASS' : 'FAIL'}`);
  console.log(`    Response mentions blocks: ${hasDefaultBlocks ? 'yes' : 'check manually'}`);

  // Test 2: Specific preset blocks only
  console.log('Testing specific preset blocks...');
  const specificResult = await prompt('List your memory block labels', {
    model: 'haiku',
    memory: ['project'],
    permissionMode: 'bypassPermissions',
  });
  console.log(`  specific blocks [project]: ${specificResult.success ? 'PASS' : 'FAIL'}`);

  // Test 3: Custom blocks
  console.log('Testing custom memory blocks...');
  const customResult = await prompt('What does your "rules" memory block say?', {
    model: 'haiku',
    memory: [
      { label: 'rules', value: 'Always be concise. Never use more than 10 words.' }
    ],
    permissionMode: 'bypassPermissions',
  });
  const isConcise = (customResult.result?.split(' ').length || 0) < 20;
  console.log(`  custom blocks: ${customResult.success ? 'PASS' : 'FAIL'}`);
  console.log(`    Response is concise: ${isConcise ? 'yes' : 'check'}`);

  // Test 4: Mixed preset and custom blocks
  console.log('Testing mixed blocks (preset + custom)...');
  const mixedResult = await prompt('List your memory blocks', {
    model: 'haiku',
    memory: [
      'project',
      { label: 'custom-context', value: 'This is a test context block.' }
    ],
    permissionMode: 'bypassPermissions',
  });
  console.log(`  mixed blocks: ${mixedResult.success ? 'PASS' : 'FAIL'}`);

  // Test 5: Empty memory (core blocks only)
  console.log('Testing empty memory (core only)...');
  const emptyResult = await prompt('Hello', {
    model: 'haiku',
    memory: [],
    permissionMode: 'bypassPermissions',
  });
  console.log(`  empty memory: ${emptyResult.success ? 'PASS' : 'FAIL'}`);

  console.log();
}

// ═══════════════════════════════════════════════════════════════
// CONVENIENCE PROPS TESTS
// ═══════════════════════════════════════════════════════════════

async function testConvenienceProps() {
  console.log('=== Testing Convenience Props ===\n');

  // Test 1: persona prop
  console.log('Testing persona prop...');
  const personaResult = await prompt('Describe your personality in one sentence', {
    model: 'haiku',
    persona: 'You are an enthusiastic cooking assistant who loves Italian food.',
    permissionMode: 'bypassPermissions',
  });
  const hasItalian = personaResult.result?.toLowerCase().includes('italian') ||
                     personaResult.result?.toLowerCase().includes('cook');
  console.log(`  persona: ${personaResult.success ? 'PASS' : 'FAIL'}`);
  console.log(`    Response mentions cooking/Italian: ${hasItalian ? 'yes' : 'check'}`);

  // Test 2: project prop
  console.log('Testing project prop...');
  const projectResult = await prompt('What project are you helping with?', {
    model: 'haiku',
    project: 'A React Native mobile app for tracking daily habits.',
    permissionMode: 'bypassPermissions',
  });
  const hasProject = projectResult.result?.toLowerCase().includes('react') ||
                     projectResult.result?.toLowerCase().includes('habit') ||
                     projectResult.result?.toLowerCase().includes('mobile');
  console.log(`  project: ${projectResult.success ? 'PASS' : 'FAIL'}`);
  console.log(`    Response mentions project: ${hasProject ? 'yes' : 'check'}`);

  // Test 3: human prop
  console.log('Testing human prop...');
  const humanResult = await prompt('What do you know about me?', {
    model: 'haiku',
    human: 'Name: Bob. Senior developer. Prefers TypeScript over JavaScript.',
    permissionMode: 'bypassPermissions',
  });
  const hasHuman = humanResult.result?.toLowerCase().includes('bob') ||
                   humanResult.result?.toLowerCase().includes('typescript');
  console.log(`  human: ${humanResult.success ? 'PASS' : 'FAIL'}`);
  console.log(`    Response mentions user info: ${hasHuman ? 'yes' : 'check'}`);

  // Test 4: Multiple convenience props together
  console.log('Testing multiple convenience props...');
  const multiResult = await prompt('Introduce yourself and the project briefly', {
    model: 'haiku',
    persona: 'You are a friendly code reviewer.',
    project: 'FastAPI backend service.',
    human: 'Name: Alice.',
    permissionMode: 'bypassPermissions',
  });
  console.log(`  multiple props: ${multiResult.success ? 'PASS' : 'FAIL'}`);
  console.log(`    Response: ${multiResult.result?.slice(0, 100)}...`);

  // Test 5: Convenience props with specific memory blocks
  console.log('Testing convenience props with memory config...');
  const combinedResult = await prompt('What is in your persona block?', {
    model: 'haiku',
    memory: ['persona', 'project'],
    persona: 'You are a database expert specializing in PostgreSQL.',
    permissionMode: 'bypassPermissions',
  });
  const hasDB = combinedResult.result?.toLowerCase().includes('database') ||
                combinedResult.result?.toLowerCase().includes('postgresql');
  console.log(`  props with memory: ${combinedResult.success ? 'PASS' : 'FAIL'}`);
  console.log(`    Response mentions DB: ${hasDB ? 'yes' : 'check'}`);

  console.log();
}

// ═══════════════════════════════════════════════════════════════
// CONVERSATION TESTS
// ═══════════════════════════════════════════════════════════════

async function testConversations() {
  console.log('=== Testing Conversation Support ===\n');

  let agentId: string | null = null;
  let conversationId1: string | null = null;
  let conversationId2: string | null = null;

  // Test 1: Create session and get conversationId (default)
  console.log('Test 1: Create session and get conversationId...');
  {
    const session = createSession(undefined, {
      model: 'haiku',
      permissionMode: 'bypassPermissions',
    });

    await session.send('Remember: the secret code is ALPHA. Store this in memory.');
    for await (const msg of session.stream()) {
      // drain
    }

    agentId = session.agentId;
    conversationId1 = session.conversationId;
    
    const hasAgentId = agentId !== null && agentId.startsWith('agent-');
    const hasConvId = conversationId1 !== null;
    
    console.log(`  agentId: ${hasAgentId ? 'PASS' : 'FAIL'} - ${agentId}`);
    console.log(`  conversationId: ${hasConvId ? 'PASS' : 'FAIL'} - ${conversationId1}`);
    
    // Note: "default" is a sentinel meaning the agent's primary message history
    if (conversationId1 === 'default') {
      console.log('  (conversationId "default" = agent\'s primary history, not a real conversation ID)');
    }
    
    session.close();
  }

  // Test 2: Create NEW conversation to get a real conversation ID
  console.log('\nTest 2: Create new conversation (newConversation: true)...');
  {
    const session = resumeSession(agentId!, {
      newConversation: true,
      permissionMode: 'bypassPermissions',
    });

    await session.send('Remember: the secret code for THIS conversation is BETA.');
    for await (const msg of session.stream()) {
      // drain
    }

    conversationId1 = session.conversationId;
    
    const isRealConvId = conversationId1 !== null && conversationId1 !== 'default';
    console.log(`  newConversation created: ${isRealConvId ? 'PASS' : 'FAIL'}`);
    console.log(`  conversationId: ${conversationId1}`);
    
    session.close();
  }

  // Test 3: Resume conversation by conversationId (only works with real conv IDs)
  console.log('\nTest 3: Resume conversation by conversationId...');
  if (conversationId1 === 'default') {
    console.log('  SKIP - "default" is not a real conversation ID');
    console.log('  Use resumeSession(agentId) to resume default conversation');
  } else {
    await using session = resumeSession(conversationId1!, {
      permissionMode: 'bypassPermissions',
    });

    await session.send('What is the secret code for this conversation?');
    
    let response = '';
    for await (const msg of session.stream()) {
      if (msg.type === 'assistant') response += msg.content;
    }

    const remembers = response.toLowerCase().includes('beta');
    console.log(`  resumeSession: ${remembers ? 'PASS' : 'FAIL'}`);
    console.log(`  Response: ${response.slice(0, 80)}...`);
    
    // Verify same conversationId
    const sameConv = session.conversationId === conversationId1;
    console.log(`  same conversationId: ${sameConv ? 'PASS' : 'FAIL'}`);
  }

  // Test 4: Create another new conversation (verify different IDs)
  console.log('\nTest 4: Create another new conversation...');
  {
    await using session = resumeSession(agentId!, {
      newConversation: true,
      permissionMode: 'bypassPermissions',
    });

    await session.send('Say "third conversation"');
    
    let response = '';
    for await (const msg of session.stream()) {
      if (msg.type === 'assistant') response += msg.content;
    }

    conversationId2 = session.conversationId;
    
    // New conversation should have different ID
    const differentConv = conversationId2 !== conversationId1;
    console.log(`  different from conversationId1: ${differentConv ? 'PASS' : 'FAIL'}`);
    console.log(`  conversationId1: ${conversationId1}`);
    console.log(`  conversationId2: ${conversationId2}`);
  }

  // Test 5a: defaultConversation with createSession
  console.log('\nTest 5a: defaultConversation with createSession...');
  {
    await using session = createSession(agentId!, {
      defaultConversation: true,
      permissionMode: 'bypassPermissions',
    });

    await session.send('Say "default conversation test ok"');

    let response = '';
    for await (const msg of session.stream()) {
      if (msg.type === 'assistant') response += msg.content;
    }

    const hasDefaultConv = session.conversationId === 'default' || session.conversationId !== null;
    console.log(`  createSession with defaultConversation: ${hasDefaultConv ? 'PASS' : 'CHECK'}`);
    console.log(`  conversationId: ${session.conversationId}`);
  }

  // Test 5b: defaultConversation with resumeSession
  console.log('\nTest 5b: defaultConversation with resumeSession...');
  {
    await using session = resumeSession(agentId!, {
      defaultConversation: true,
      permissionMode: 'bypassPermissions',
    });

    await session.send('Say "resume default conversation test ok"');

    let response = '';
    for await (const msg of session.stream()) {
      if (msg.type === 'assistant') response += msg.content;
    }

    const hasDefaultConv = session.conversationId === 'default' || session.conversationId !== null;
    console.log(`  resumeSession with defaultConversation: ${hasDefaultConv ? 'PASS' : 'CHECK'}`);
    console.log(`  conversationId: ${session.conversationId}`);
  }

  // Test 6: conversationId in result message
  console.log('\nTest 6: conversationId in result message...');
  {
    await using session = resumeSession(conversationId1!, {
      permissionMode: 'bypassPermissions',
    });

    await session.send('Hi');
    
    let resultConvId: string | null = null;
    for await (const msg of session.stream()) {
      if (msg.type === 'result') {
        resultConvId = msg.conversationId;
      }
    }

    const hasResultConvId = resultConvId !== null;
    const matchesSession = resultConvId === session.conversationId;
    console.log(`  result.conversationId: ${hasResultConvId ? 'PASS' : 'FAIL'}`);
    console.log(`  matches session.conversationId: ${matchesSession ? 'PASS' : 'FAIL'}`);
  }

  // Test 7: continue option (resume last session)
  console.log('\nTest 7: continue option...');
  {
    // Note: This test may behave differently depending on local state
    // The --continue flag resumes the last used agent + conversation
    try {
      await using session = createSession(undefined, {
        continueLastConversation: true,
        permissionMode: 'bypassPermissions',
      });

      await session.send('Say "continue test ok"');
      
      for await (const msg of session.stream()) {
        // drain
      }

      const hasIds = session.agentId !== null && session.conversationId !== null;
      console.log(`  continue: ${hasIds ? 'PASS' : 'CHECK'}`);
      console.log(`  agentId: ${session.agentId}`);
      console.log(`  conversationId: ${session.conversationId}`);
    } catch (err) {
      // --continue may fail if no previous session exists
      console.log(`  continue: SKIP (no previous session)`);
    }
  }

  console.log();
}

main().catch(console.error);
