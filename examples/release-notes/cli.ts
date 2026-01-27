#!/usr/bin/env bun

/**
 * Release Notes Generator CLI
 * 
 * Generate release notes from git commits.
 * 
 * Usage:
 *   bun cli.ts v1.0.0              # Notes from v1.0.0 to HEAD
 *   bun cli.ts v1.0.0 v1.1.0       # Notes from v1.0.0 to v1.1.0
 *   bun cli.ts v1.0.0 -o RELEASE.md # Output to file
 *   bun cli.ts --status            # Show agent status
 *   bun cli.ts --reset             # Reset agent
 */

import { parseArgs } from 'node:util';
import {
  loadState,
  saveState,
  getOrCreateAgent,
  generateReleaseNotes,
  showStatus,
  reset,
} from './generator.js';

async function main() {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      output: { type: 'string', short: 'o' },
      status: { type: 'boolean', default: false },
      reset: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
  });

  if (values.help) {
    printHelp();
    return;
  }

  if (values.reset) {
    await reset();
    return;
  }

  const state = await loadState();

  if (values.status) {
    await showStatus(state);
    return;
  }

  if (positionals.length === 0) {
    console.log('Error: Please specify a git ref (tag, branch, or commit).\n');
    console.log('Examples:');
    console.log('  bun cli.ts v1.0.0           # From v1.0.0 to HEAD');
    console.log('  bun cli.ts v1.0.0 v1.1.0    # From v1.0.0 to v1.1.0');
    console.log('  bun cli.ts HEAD~10          # Last 10 commits');
    return;
  }

  const fromRef = positionals[0];
  const toRef = positionals[1] || 'HEAD';

  // Get or create the agent
  const agent = await getOrCreateAgent(state);
  
  // Save agent ID if new
  if (!state.agentId && agent.agentId) {
    state.agentId = agent.agentId;
    await saveState(state);
    console.log(`\x1b[90m[Agent: ${agent.agentId}]\x1b[0m`);
    console.log(`\x1b[90m[→ https://app.letta.com/agents/${agent.agentId}]\x1b[0m\n`);
  }

  await generateReleaseNotes(agent, state, fromRef, toRef, values.output);

  agent.close();
}

function printHelp() {
  console.log(`
📝 Release Notes Generator

Generate release notes from git commits. Remembers your formatting preferences.

USAGE:
  bun cli.ts <from-ref> [to-ref]   Generate notes for commit range
  bun cli.ts <from-ref> -o FILE    Output to file
  bun cli.ts --status              Show agent status
  bun cli.ts --reset               Reset agent (forget preferences)
  bun cli.ts -h, --help            Show this help

ARGUMENTS:
  from-ref    Starting point (tag, branch, commit SHA)
  to-ref      Ending point (default: HEAD)

OPTIONS:
  -o, --output FILE    Write release notes to file

EXAMPLES:
  bun cli.ts v1.0.0                    # Changes since v1.0.0
  bun cli.ts v1.0.0 v1.1.0             # Changes between two tags
  bun cli.ts HEAD~20                   # Last 20 commits
  bun cli.ts v1.0.0 -o CHANGELOG.md    # Write to file

CATEGORIES:
  The agent automatically categorizes commits:
  - 🚀 Features
  - 🐛 Bug Fixes
  - 💥 Breaking Changes
  - 📚 Documentation
  - 🔧 Maintenance

PERSISTENCE:
  The agent learns your formatting preferences over time.
`);
}

main().catch(console.error);
