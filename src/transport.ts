/**
 * SubprocessTransport
 *
 * Spawns the Letta Code CLI and communicates via stdin/stdout JSON streams.
 */

import { spawn, type ChildProcess } from "node:child_process";
import { createInterface, type Interface } from "node:readline";
import type { SessionOptions, WireMessage } from "./types.js";

export class SubprocessTransport {
  private process: ChildProcess | null = null;
  private stdout: Interface | null = null;
  private messageQueue: WireMessage[] = [];
  private messageResolvers: Array<(msg: WireMessage) => void> = [];
  private closed = false;
  private agentId?: string;

  constructor(
    private options: SessionOptions & { agentId?: string } = {}
  ) {}

  /**
   * Start the CLI subprocess
   */
  async connect(): Promise<void> {
    const args = this.buildArgs();

    // Find the CLI - use the installed letta-code package
    const cliPath = await this.findCli();
    if (process.env.DEBUG) {
      console.log("[letta-code-sdk] Using CLI:", cliPath);
      console.log("[letta-code-sdk] Args:", args.join(" "));
    }

    this.process = spawn("node", [cliPath, ...args], {
      cwd: this.options.cwd || process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
    });

    if (!this.process.stdout || !this.process.stdin) {
      throw new Error("Failed to create subprocess pipes");
    }

    // Set up stdout reading
    this.stdout = createInterface({
      input: this.process.stdout,
      crlfDelay: Infinity,
    });

    this.stdout.on("line", (line) => {
      if (!line.trim()) return;
      try {
        const msg = JSON.parse(line) as WireMessage;
        this.handleMessage(msg);
      } catch {
        // Ignore non-JSON lines (stderr leakage, etc.)
      }
    });

    // Log stderr for debugging (CLI errors, auth failures, etc.)
    if (this.process.stderr) {
      this.process.stderr.on("data", (data: Buffer) => {
        const msg = data.toString().trim();
        if (msg) {
          console.error("[letta-code-sdk] CLI stderr:", msg);
        }
      });
    }

    // Handle process exit
    this.process.on("close", (code) => {
      this.closed = true;
      if (code !== 0 && code !== null) {
        console.error(`[letta-code-sdk] CLI process exited with code ${code}`);
      }
    });

    this.process.on("error", (err) => {
      console.error("[letta-code-sdk] CLI process error:", err);
      this.closed = true;
    });
  }

  /**
   * Send a message to the CLI via stdin
   */
  async write(data: object): Promise<void> {
    if (!this.process?.stdin || this.closed) {
      throw new Error("Transport not connected");
    }
    this.process.stdin.write(JSON.stringify(data) + "\n");
  }

  /**
   * Read the next message from the CLI
   */
  async read(): Promise<WireMessage | null> {
    // Return queued message if available
    if (this.messageQueue.length > 0) {
      return this.messageQueue.shift()!;
    }

    // If closed, no more messages
    if (this.closed) {
      return null;
    }

    // Wait for next message
    return new Promise((resolve) => {
      this.messageResolvers.push(resolve);
    });
  }

  /**
   * Async iterator for messages
   */
  async *messages(): AsyncGenerator<WireMessage> {
    while (true) {
      const msg = await this.read();
      if (msg === null) break;
      yield msg;
    }
  }

  /**
   * Close the transport
   */
  close(): void {
    if (this.process) {
      this.process.stdin?.end();
      this.process.kill();
      this.process = null;
    }
    this.closed = true;

    // Resolve any pending readers with null
    for (const resolve of this.messageResolvers) {
      resolve(null as unknown as WireMessage);
    }
    this.messageResolvers = [];
  }

  get isClosed(): boolean {
    return this.closed;
  }

  private handleMessage(msg: WireMessage): void {
    // Track agent_id from init message
    if (msg.type === "system" && "subtype" in msg && msg.subtype === "init") {
      this.agentId = (msg as unknown as { agent_id: string }).agent_id;
    }

    // If someone is waiting for a message, give it to them
    if (this.messageResolvers.length > 0) {
      const resolve = this.messageResolvers.shift()!;
      resolve(msg);
    } else {
      // Otherwise queue it
      this.messageQueue.push(msg);
    }
  }

  private buildArgs(): string[] {
    const args: string[] = [
      "--output-format",
      "stream-json",
      "--input-format",
      "stream-json",
    ];

    // Validate conversation + agent combinations
    // (These require agentId context, so can't be in validateSessionOptions)
    
    // conversationId (non-default) cannot be used with agentId
    if (this.options.conversationId && 
        this.options.conversationId !== "default" && 
        this.options.agentId) {
      throw new Error(
        "Cannot use both 'conversationId' and 'agentId'. " +
        "When resuming a conversation, the agent is derived automatically."
      );
    }

    // conversationId: "default" requires agentId
    if (this.options.conversationId === "default" && !this.options.agentId) {
      throw new Error(
        "conversationId 'default' requires agentId. " +
        "Use resumeSession(agentId, { defaultConversation: true }) instead."
      );
    }

    // defaultConversation requires agentId
    if (this.options.defaultConversation && !this.options.agentId) {
      throw new Error(
        "'defaultConversation' requires agentId. " +
        "Use resumeSession(agentId, { defaultConversation: true })."
      );
    }

    // Conversation and agent handling
    if (this.options.conversationId) {
      // Resume specific conversation (derives agent automatically)
      args.push("--conversation", this.options.conversationId);
    } else if (this.options.agentId) {
      // Resume existing agent
      args.push("--agent", this.options.agentId);
      if (this.options.newConversation) {
        // Create new conversation on this agent
        args.push("--new");
      } else if (this.options.defaultConversation) {
        // Use agent's default conversation explicitly
        args.push("--default");
      }
    } else if (this.options.promptMode) {
      // prompt() without agentId: no agent flags
      // Headless will use LRU agent or create Memo (like `letta -p "msg"`)
    } else if (this.options.createOnly) {
      // createAgent() - explicitly create new agent
      args.push("--new-agent");
    } else if (this.options.memory !== undefined && !this.options.agentId) {
      // createSession() with memory blocks requires new agent + new conversation
      // Memory blocks can only be set during agent creation with --new-agent
      args.push("--new-agent");
      args.push("--new");  // Also create the initial conversation
    } else if (this.options.newConversation) {
      // createSession() without agentId - LRU agent + new conversation
      args.push("--new");
    }
    // else: no agent flags = default behavior (LRU agent, default conversation)

    // Model
    if (this.options.model) {
      args.push("-m", this.options.model);
    }

    // System prompt configuration
    if (this.options.systemPrompt !== undefined) {
      if (typeof this.options.systemPrompt === "string") {
        // Raw string → --system-custom
        args.push("--system-custom", this.options.systemPrompt);
      } else {
        // Preset object → --system (+ optional --system-append)
        args.push("--system", this.options.systemPrompt.preset);
        if (this.options.systemPrompt.append) {
          args.push("--system-append", this.options.systemPrompt.append);
        }
      }
    }

    // Memory blocks (only for new agents)
    if (this.options.memory !== undefined && !this.options.agentId) {
      if (this.options.memory.length === 0) {
        // Empty array → no memory blocks (just core)
        args.push("--init-blocks", "");
      } else {
        // Separate preset names from custom/reference blocks
        const presetNames: string[] = [];
        const memoryBlocksJson: Array<
          | { label: string; value: string }
          | { blockId: string }
        > = [];

        for (const item of this.options.memory) {
          if (typeof item === "string") {
            // Preset name
            presetNames.push(item);
          } else if ("blockId" in item) {
            // Block reference - pass to --memory-blocks
            memoryBlocksJson.push(item as { blockId: string });
          } else {
            // CreateBlock
            memoryBlocksJson.push(item as { label: string; value: string });
          }
        }

        // Add preset names via --init-blocks
        if (presetNames.length > 0) {
          args.push("--init-blocks", presetNames.join(","));
        }

        // Add custom blocks and block references via --memory-blocks
        if (memoryBlocksJson.length > 0) {
          args.push("--memory-blocks", JSON.stringify(memoryBlocksJson));
        }
      }
    }

    // Convenience props for block values (only for new agents)
    if (!this.options.agentId) {
      if (this.options.persona !== undefined) {
        args.push("--block-value", `persona=${this.options.persona}`);
      }
      if (this.options.human !== undefined) {
        args.push("--block-value", `human=${this.options.human}`);
      }
      if (this.options.project !== undefined) {
        args.push("--block-value", `project=${this.options.project}`);
      }
    }

    // Permission mode
    if (this.options.permissionMode === "bypassPermissions") {
      args.push("--yolo");
    } else if (this.options.permissionMode === "acceptEdits") {
      args.push("--accept-edits");
    }

    // Allowed tools
    if (this.options.allowedTools) {
      args.push("--allowedTools", this.options.allowedTools.join(","));
    }

    return args;
  }

  private async findCli(): Promise<string> {
    // Try multiple resolution strategies
    const { existsSync } = await import("node:fs");
    const { dirname, join } = await import("node:path");
    const { fileURLToPath } = await import("node:url");

    // Strategy 1: Check LETTA_CLI_PATH env var
    if (process.env.LETTA_CLI_PATH && existsSync(process.env.LETTA_CLI_PATH)) {
      return process.env.LETTA_CLI_PATH;
    }

    // Strategy 2: Try to resolve from node_modules
    // Note: resolve the package main export (not /letta.js subpath) because
    // the package.json "exports" field doesn't expose the subpath directly.
    try {
      const { createRequire } = await import("node:module");
      const require = createRequire(import.meta.url);
      const resolved = require.resolve("@letta-ai/letta-code");
      if (existsSync(resolved)) {
        return resolved;
      }
    } catch {
      // Continue to next strategy
    }

    // Strategy 3: Check relative to this file (for local file: deps)
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const localPaths = [
      join(__dirname, "../../@letta-ai/letta-code/letta.js"),
      join(__dirname, "../../../letta-code-prod/letta.js"),
      join(__dirname, "../../../letta-code/letta.js"),
    ];

    for (const p of localPaths) {
      if (existsSync(p)) {
        return p;
      }
    }

    throw new Error(
      "Letta Code CLI not found. Set LETTA_CLI_PATH or install @letta-ai/letta-code."
    );
  }
}
