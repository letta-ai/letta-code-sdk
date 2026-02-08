/**
 * Session
 *
 * Represents a conversation session with a Letta agent.
 * Implements the V2 API pattern: send() / receive()
 */

import { SubprocessTransport } from "./transport.js";
import type {
  InternalSessionOptions,
  SDKMessage,
  SDKInitMessage,
  SDKAssistantMessage,
  SDKResultMessage,
  WireMessage,
  ControlRequest,
  CanUseToolControlRequest,
  CanUseToolResponse,
  CanUseToolResponseAllow,
  CanUseToolResponseDeny,
  SendMessage,
} from "./types.js";


export class Session implements AsyncDisposable {
  private transport: SubprocessTransport;
  private _agentId: string | null = null;
  private _sessionId: string | null = null;
  private _conversationId: string | null = null;
  private initialized = false;
  private pumpRunning = false;
  private pumpClosed = false;
  private pumpError: Error | null = null;
  private messageQueue: SDKMessage[] = [];
  private messageResolvers: Array<(msg: SDKMessage | null) => void> = [];
  private queuedInitMessage: SDKInitMessage | null = null;
  private maxQueueSize: number;
  private droppedMessageCount = 0;
  private initPromise: Promise<SDKInitMessage> | null = null;
  private initResolver: ((msg: SDKInitMessage) => void) | null = null;
  private initRejecter: ((err: Error) => void) | null = null;
  private pendingInitMessage: SDKInitMessage | null = null;
  private approvalBarrier: Promise<void> | null = null;
  private approvalBarrierResolve: (() => void) | null = null;

  constructor(
    private options: InternalSessionOptions = {}
  ) {
    // Note: Validation happens in public API functions (createSession, createAgent, etc.)
    this.transport = new SubprocessTransport(options);
    this.maxQueueSize = options.messageQueueSize ?? 1000;
  }

  /**
   * Initialize the session (called automatically on first send)
   */
  async initialize(): Promise<SDKInitMessage> {
    if (this.initialized) {
      throw new Error("Session already initialized");
    }

    await this.transport.connect();
    this.startPump();

    const initPromise = this.waitForInitMessage();
    // Send initialize control request
    await this.transport.write({
      type: "control_request",
      request_id: "init_1",
      request: { subtype: "initialize" },
    });

    const initMsg = await initPromise;
    this._agentId = initMsg.agentId;
    this._sessionId = initMsg.sessionId;
    this._conversationId = initMsg.conversationId;
    this.initialized = true;

    return initMsg;
  }

  /**
   * Send a message to the agent
   * 
   * @param message - Text string or multimodal content array
   * 
   * @example
   * // Simple text
   * await session.send("Hello!");
   * 
   * @example
   * // With image
   * await session.send([
   *   { type: "text", text: "What's in this image?" },
   *   { type: "image", source: { type: "base64", mediaType: "image/png", data: "..." } }
   * ]);
   */
  async send(message: SendMessage): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    await this.waitForApprovalClear();
    await this.transport.write({
      type: "user",
      message: { role: "user", content: message },
    });
  }

  /**
   * Stream messages from the agent
   */
  async *stream(): AsyncGenerator<SDKMessage> {
    if (!this.initialized) {
      await this.initialize();
    }

    while (true) {
      const sdkMsg = await this.readSdkMessage();
      if (!sdkMsg) break;
      yield sdkMsg;

      // Stop on result message
      if (sdkMsg.type === "result") {
        break;
      }
    }
  }

  /**
   * Handle can_use_tool control request from CLI (Claude SDK compatible format)
   */
  private async handleCanUseTool(
    requestId: string,
    req: CanUseToolControlRequest
  ): Promise<void> {
    const releaseBarrier = this.startApprovalBarrier();
    let response: CanUseToolResponse;

    // If bypassPermissions mode, auto-allow all tools
    if (this.options.permissionMode === "bypassPermissions") {
      response = {
        behavior: "allow",
        updatedInput: null,
        updatedPermissions: [],
      } satisfies CanUseToolResponseAllow;
    } else if (this.options.canUseTool) {
      try {
        const result = await this.options.canUseTool(req.tool_name, req.input);
        if (result.behavior === "allow") {
          response = {
            behavior: "allow",
            updatedInput: result.updatedInput ?? null,
            updatedPermissions: [], // TODO: not implemented
          } satisfies CanUseToolResponseAllow;
        } else {
          response = {
            behavior: "deny",
            message: result.message ?? "Denied by canUseTool callback",
            interrupt: false, // TODO: not wired up yet
          } satisfies CanUseToolResponseDeny;
        }
      } catch (err) {
        response = {
          behavior: "deny",
          message: err instanceof Error ? err.message : "Callback error",
          interrupt: false,
        };
      }
    } else {
      // No callback registered - deny by default
      response = {
        behavior: "deny",
        message: "No canUseTool callback registered",
        interrupt: false,
      };
    }

    // Send control_response (Claude SDK compatible format)
    try {
      await this.transport.write({
        type: "control_response",
        response: {
          subtype: "success",
          request_id: requestId,
          response,
        },
      });
    } finally {
      releaseBarrier();
    }
  }

  /**
   * Abort the current operation (interrupt without closing the session)
   */
  async abort(): Promise<void> {
    await this.waitForApprovalClear();
    await this.transport.write({
      type: "control_request",
      request_id: `interrupt-${Date.now()}`,
      request: { subtype: "interrupt" },
    });
  }

  /**
   * Close the session
   */
  close(): void {
    this.releaseApprovalBarrier();
    this.transport.close();
  }

  /**
   * Get the agent ID (available after initialization)
   */
  get agentId(): string | null {
    return this._agentId;
  }

  /**
   * Get the session ID (available after initialization)
   */
  get sessionId(): string | null {
    return this._sessionId;
  }

  /**
   * Get the conversation ID (available after initialization)
   */
  get conversationId(): string | null {
    return this._conversationId;
  }

  /**
   * AsyncDisposable implementation for `await using`
   */
  async [Symbol.asyncDispose](): Promise<void> {
    this.close();
  }

  /**
   * Transform wire message to SDK message
   */
  private transformMessage(wireMsg: WireMessage): SDKMessage | null {
    // Init message
    if (wireMsg.type === "system" && "subtype" in wireMsg && wireMsg.subtype === "init") {
      const msg = wireMsg as WireMessage & {
        agent_id: string;
        session_id: string;
        conversation_id: string;
        model: string;
        tools: string[];
      };
      return {
        type: "init",
        agentId: msg.agent_id,
        sessionId: msg.session_id,
        conversationId: msg.conversation_id,
        model: msg.model,
        tools: msg.tools,
      };
    }

    // Handle message types (all have type: "message" with message_type field)
    if (wireMsg.type === "message" && "message_type" in wireMsg) {
      const msg = wireMsg as WireMessage & {
        message_type: string;
        uuid: string;
        // assistant_message fields
        content?: string;
        // tool_call_message fields
        tool_call?: { name: string; arguments: string; tool_call_id: string };
        tool_calls?: Array<{ name: string; arguments: string; tool_call_id: string }>;
        // tool_return_message fields
        tool_call_id?: string;
        tool_return?: string;
        status?: "success" | "error";
        // reasoning_message fields
        reasoning?: string;
      };

      // Assistant message
      if (msg.message_type === "assistant_message" && msg.content) {
        return {
          type: "assistant",
          content: msg.content,
          uuid: msg.uuid,
        };
      }

      // Tool call message
      if (msg.message_type === "tool_call_message") {
        const toolCall = msg.tool_calls?.[0] || msg.tool_call;
        if (toolCall) {
          let toolInput: Record<string, unknown> = {};
          try {
            toolInput = JSON.parse(toolCall.arguments);
          } catch {
            toolInput = { raw: toolCall.arguments };
          }
          return {
            type: "tool_call",
            toolCallId: toolCall.tool_call_id,
            toolName: toolCall.name,
            toolInput,
            uuid: msg.uuid,
          };
        }
      }

      // Tool return message
      if (msg.message_type === "tool_return_message" && msg.tool_call_id) {
        return {
          type: "tool_result",
          toolCallId: msg.tool_call_id,
          content: msg.tool_return || "",
          isError: msg.status === "error",
          uuid: msg.uuid,
        };
      }

      // Reasoning message
      if (msg.message_type === "reasoning_message" && msg.reasoning) {
        return {
          type: "reasoning",
          content: msg.reasoning,
          uuid: msg.uuid,
        };
      }
    }

    // Stream event (partial message updates)
    if (wireMsg.type === "stream_event") {
      const msg = wireMsg as WireMessage & {
        event: {
          type: string;
          index?: number;
          delta?: { type?: string; text?: string; reasoning?: string };
          content_block?: { type?: string; text?: string };
        };
        uuid: string;
      };
      return {
        type: "stream_event",
        event: msg.event,
        uuid: msg.uuid,
      };
    }

    // Result message
    if (wireMsg.type === "result") {
      const msg = wireMsg as WireMessage & {
        subtype: string;
        result?: string;
        duration_ms: number;
        total_cost_usd?: number;
        conversation_id: string;
      };
      return {
        type: "result",
        success: msg.subtype === "success",
        result: msg.result,
        error: msg.subtype !== "success" ? msg.subtype : undefined,
        durationMs: msg.duration_ms,
        totalCostUsd: msg.total_cost_usd,
        conversationId: msg.conversation_id,
      };
    }

    // Skip other message types (system_message, user_message, etc.)
    return null;
  }

  private startPump(): void {
    if (this.pumpRunning) return;
    this.pumpRunning = true;
    void this.pumpLoop();
  }

  private async pumpLoop(): Promise<void> {
    try {
      for await (const wireMsg of this.transport.messages()) {
        // Handle CLI → SDK control requests (e.g., can_use_tool)
        if (wireMsg.type === "control_request") {
          const controlReq = wireMsg as ControlRequest;
          if (controlReq.request.subtype === "can_use_tool") {
            await this.handleCanUseTool(
              controlReq.request_id,
              controlReq.request as CanUseToolControlRequest
            );
            continue;
          }
        }

        const sdkMsg = this.transformMessage(wireMsg);
        if (sdkMsg) {
          if (sdkMsg.type === "init") {
            this.resolveInitMessage(sdkMsg);
            this.queueInitMessage(sdkMsg);
          } else {
            this.enqueueMessage(sdkMsg);
          }
        }
      }
    } catch (err) {
      this.pumpError = err instanceof Error ? err : new Error("Message pump failed");
    } finally {
      this.pumpClosed = true;
      this.resolveMessageReaders();
      this.rejectInitIfPending();
    }
  }

  private enqueueMessage(msg: SDKMessage): void {
    if (this.messageResolvers.length > 0) {
      const resolve = this.messageResolvers.shift()!;
      resolve(msg);
    } else {
      this.dropOldestIfNeeded();
      this.messageQueue.push(msg);
    }
  }

  private queueInitMessage(msg: SDKInitMessage): void {
    if (this.messageResolvers.length > 0) {
      const resolve = this.messageResolvers.shift()!;
      resolve(msg);
      return;
    }

    if (!this.queuedInitMessage) {
      this.queuedInitMessage = msg;
    }
  }

  private dropOldestIfNeeded(): void {
    if (this.maxQueueSize <= 0) {
      return;
    }

    while (this.messageQueue.length >= this.maxQueueSize) {
      const dropped = this.messageQueue.shift();
      if (!dropped) break;
      this.droppedMessageCount += 1;
      console.warn(
        "[letta-code-sdk] Dropped queued message due to full queue. " +
        `droppedMessageCount=${this.droppedMessageCount}`
      );
    }
  }

  private resolveMessageReaders(): void {
    for (const resolve of this.messageResolvers) {
      resolve(null);
    }
    this.messageResolvers = [];
  }

  private async readSdkMessage(): Promise<SDKMessage | null> {
    if (this.queuedInitMessage) {
      const msg = this.queuedInitMessage;
      this.queuedInitMessage = null;
      return msg;
    }

    if (this.messageQueue.length > 0) {
      return this.messageQueue.shift()!;
    }

    if (this.pumpError) {
      throw this.pumpError;
    }

    if (this.pumpClosed) {
      return null;
    }

    return new Promise((resolve) => {
      this.messageResolvers.push(resolve);
    });
  }

  private waitForInitMessage(): Promise<SDKInitMessage> {
    if (this.pendingInitMessage) {
      const msg = this.pendingInitMessage;
      this.pendingInitMessage = null;
      return Promise.resolve(msg);
    }

    if (!this.initPromise) {
      this.initPromise = new Promise((resolve, reject) => {
        this.initResolver = resolve;
        this.initRejecter = reject;
      });
    }

    return this.initPromise;
  }

  private resolveInitMessage(msg: SDKInitMessage): void {
    if (this.initResolver) {
      const resolve = this.initResolver;
      this.initResolver = null;
      this.initRejecter = null;
      this.initPromise = null;
      resolve(msg);
      return;
    }

    this.pendingInitMessage = msg;
  }

  private rejectInitIfPending(): void {
    if (this.initRejecter) {
      const reject = this.initRejecter;
      this.initResolver = null;
      this.initRejecter = null;
      this.initPromise = null;
      reject(new Error("Failed to initialize session - no init message received"));
    }
  }

  private startApprovalBarrier(): () => void {
    if (this.approvalBarrier) {
      return () => undefined;
    }

    this.approvalBarrier = new Promise((resolve) => {
      this.approvalBarrierResolve = resolve;
    });

    return () => {
      this.releaseApprovalBarrier();
    };
  }

  private releaseApprovalBarrier(): void {
    if (this.approvalBarrierResolve) {
      this.approvalBarrierResolve();
    }
    this.approvalBarrier = null;
    this.approvalBarrierResolve = null;
  }

  private async waitForApprovalClear(): Promise<void> {
    if (this.approvalBarrier) {
      await this.approvalBarrier;
    }
  }
}
