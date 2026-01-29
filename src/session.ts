/**
 * Session
 *
 * Represents a conversation session with a Letta agent.
 * Implements the V2 API pattern: send() / receive()
 */

import { SubprocessTransport } from "./transport.js";
import { updateLru } from "./lru.js";
import type {
  SessionOptions,
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
} from "./types.js";
import { validateSessionOptions } from "./validation.js";

export class Session implements AsyncDisposable {
  private transport: SubprocessTransport;
  private _agentId: string | null = null;
  private _sessionId: string | null = null;
  private _conversationId: string | null = null;
  private initialized = false;

  constructor(
    private options: SessionOptions & { agentId?: string } = {}
  ) {
    // Validate options before creating transport
    validateSessionOptions(options);
    this.transport = new SubprocessTransport(options);
  }

  /**
   * Initialize the session (called automatically on first send)
   */
  async initialize(): Promise<SDKInitMessage> {
    if (this.initialized) {
      throw new Error("Session already initialized");
    }

    await this.transport.connect();

    // Send initialize control request
    await this.transport.write({
      type: "control_request",
      request_id: "init_1",
      request: { subtype: "initialize" },
    });

    // Wait for init message
    for await (const msg of this.transport.messages()) {
      if (msg.type === "system" && "subtype" in msg && msg.subtype === "init") {
        const initMsg = msg as WireMessage & {
          agent_id: string;
          session_id: string;
          conversation_id: string;
          model: string;
          tools: string[];
        };
        this._agentId = initMsg.agent_id;
        this._sessionId = initMsg.session_id;
        this._conversationId = initMsg.conversation_id;
        this.initialized = true;

        // Update LRU tracking
        updateLru(initMsg.agent_id, initMsg.conversation_id);

        return {
          type: "init",
          agentId: initMsg.agent_id,
          sessionId: initMsg.session_id,
          conversationId: initMsg.conversation_id,
          model: initMsg.model,
          tools: initMsg.tools,
        };
      }
    }

    throw new Error("Failed to initialize session - no init message received");
  }

  /**
   * Send a message to the agent
   */
  async send(message: string): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    await this.transport.write({
      type: "user",
      message: { role: "user", content: message },
    });
  }

  /**
   * Stream messages from the agent
   */
  async *stream(): AsyncGenerator<SDKMessage> {
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
        yield sdkMsg;

        // Stop on result message
        if (sdkMsg.type === "result") {
          break;
        }
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
    let response: CanUseToolResponse;

    if (this.options.canUseTool) {
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
    await this.transport.write({
      type: "control_response",
      response: {
        subtype: "success",
        request_id: requestId,
        response,
      },
    });
  }

  /**
   * Abort the current operation (interrupt without closing the session)
   */
  async abort(): Promise<void> {
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
}
