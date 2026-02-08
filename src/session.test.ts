import { describe, expect, test } from "bun:test";
import { Session } from "./session.js";
import type { SDKMessage, WireMessage } from "./types.js";

function createFakeTransport(
  messages: WireMessage[],
  onWrite?: (data: unknown) => void
) {
  const writes: unknown[] = [];
  const transport = {
    connect: async () => {},
    write: async (data: unknown) => {
      writes.push(data);
      onWrite?.(data);
    },
    messages: async function* () {
      for (const msg of messages) {
        yield msg;
      }
    },
    close: () => {},
  };

  return { transport, writes };
}

describe("Session", () => {
  describe("handleCanUseTool with bypassPermissions", () => {
    test("auto-approves tools when permissionMode is bypassPermissions", async () => {
      // Create a session with bypassPermissions
      const session = new Session({
        permissionMode: "bypassPermissions",
      });

      // Access the private method for testing
      // @ts-expect-error - accessing private method for testing
      const handleCanUseTool = session.handleCanUseTool.bind(session);

      // Mock the transport.write to capture the response
      let capturedResponse: unknown;
      // @ts-expect-error - accessing private property for testing
      session.transport.write = async (msg: unknown) => {
        capturedResponse = msg;
      };

      // Simulate a control_request for tool approval
      await handleCanUseTool("test-request-id", {
        subtype: "can_use_tool",
        tool_name: "Bash",
        tool_call_id: "test-tool-call-id",
        input: { command: "ls" },
        permission_suggestions: [],
        blocked_path: null,
      });

      // Verify the response auto-approves
      expect(capturedResponse).toEqual({
        type: "control_response",
        response: {
          subtype: "success",
          request_id: "test-request-id",
          response: {
            behavior: "allow",
            updatedInput: null,
            updatedPermissions: [],
          },
        },
      });
    });

    test("denies tools by default when no callback and not bypassPermissions", async () => {
      // Create a session with default permission mode
      const session = new Session({
        permissionMode: "default",
      });

      // @ts-expect-error - accessing private method for testing
      const handleCanUseTool = session.handleCanUseTool.bind(session);

      let capturedResponse: unknown;
      // @ts-expect-error - accessing private property for testing
      session.transport.write = async (msg: unknown) => {
        capturedResponse = msg;
      };

      await handleCanUseTool("test-request-id", {
        subtype: "can_use_tool",
        tool_name: "Bash",
        tool_call_id: "test-tool-call-id",
        input: { command: "ls" },
        permission_suggestions: [],
        blocked_path: null,
      });

      // Verify the response denies (no callback registered)
      expect(capturedResponse).toEqual({
        type: "control_response",
        response: {
          subtype: "success",
          request_id: "test-request-id",
          response: {
            behavior: "deny",
            message: "No canUseTool callback registered",
            interrupt: false,
          },
        },
      });
    });

    test("uses canUseTool callback when provided and not bypassPermissions", async () => {
      const session = new Session({
        permissionMode: "default",
        canUseTool: async (toolName, input) => {
          if (toolName === "Bash") {
            return { behavior: "allow" };
          }
          return { behavior: "deny", message: "Tool not allowed" };
        },
      });

      // @ts-expect-error - accessing private method for testing
      const handleCanUseTool = session.handleCanUseTool.bind(session);

      let capturedResponse: unknown;
      // @ts-expect-error - accessing private property for testing
      session.transport.write = async (msg: unknown) => {
        capturedResponse = msg;
      };

      await handleCanUseTool("test-request-id", {
        subtype: "can_use_tool",
        tool_name: "Bash",
        tool_call_id: "test-tool-call-id",
        input: { command: "ls" },
        permission_suggestions: [],
        blocked_path: null,
      });

      // Verify callback was used and allowed
      expect(capturedResponse).toMatchObject({
        type: "control_response",
        response: {
          subtype: "success",
          request_id: "test-request-id",
          response: {
            behavior: "allow",
          },
        },
      });
    });
  });

  test("stream yields init message", async () => {
    const session = new Session();

    const initMessage = {
      type: "system",
      subtype: "init",
      agent_id: "agent-1",
      session_id: "session-1",
      conversation_id: "conv-1",
      model: "test-model",
      tools: [],
    } as unknown as WireMessage;
    const assistantMessage = {
      type: "message",
      message_type: "assistant_message",
      uuid: "msg-1",
      content: "hello",
    } as unknown as WireMessage;
    const resultMessage = {
      type: "result",
      subtype: "success",
      duration_ms: 5,
      conversation_id: "conv-1",
      result: "done",
    } as unknown as WireMessage;

    const { transport } = createFakeTransport([
      initMessage,
      assistantMessage,
      resultMessage,
    ]);

    // @ts-expect-error - overriding private transport for testing
    session.transport = transport;

    const received: string[] = [];
    for await (const msg of session.stream()) {
      received.push(msg.type);
    }

    expect(received).toEqual(["init", "assistant", "result"]);
  });

  test("drops oldest queued messages when queue is full", async () => {
    const originalWarn = console.warn;
    let warnCount = 0;
    let lastWarn = "";
    console.warn = (...args: unknown[]) => {
      warnCount += 1;
      lastWarn = args.map((arg) => String(arg)).join(" ");
    };

    try {
      const session = new Session({ messageQueueSize: 2 });

      const initMessage = {
        type: "system",
        subtype: "init",
        agent_id: "agent-1",
        session_id: "session-1",
        conversation_id: "conv-1",
        model: "test-model",
        tools: [],
      } as unknown as WireMessage;
      const assistantOne = {
        type: "message",
        message_type: "assistant_message",
        uuid: "msg-1",
        content: "one",
      } as unknown as WireMessage;
      const assistantTwo = {
        type: "message",
        message_type: "assistant_message",
        uuid: "msg-2",
        content: "two",
      } as unknown as WireMessage;
      const assistantThree = {
        type: "message",
        message_type: "assistant_message",
        uuid: "msg-3",
        content: "three",
      } as unknown as WireMessage;

      const { transport } = createFakeTransport([
        initMessage,
        assistantOne,
        assistantTwo,
        assistantThree,
      ]);

      // @ts-expect-error - overriding private transport for testing
      session.transport = transport;

      await session.initialize();
      await new Promise((resolve) => setTimeout(resolve, 0));

      // @ts-expect-error - accessing private queue for testing
      const queued = session.messageQueue as SDKMessage[];

      expect(queued.length).toBe(2);
      const [first, second] = queued;
      expect(first).toBeDefined();
      expect(second).toBeDefined();
      if (!first || !second) {
        throw new Error("Expected queued messages to be present");
      }
      expect(first.type).toBe("assistant");
      expect(second.type).toBe("assistant");
      expect((first as { content: string }).content).toBe("two");
      expect((second as { content: string }).content).toBe("three");
      expect(warnCount).toBe(1);
      expect(lastWarn).toContain("Dropped queued message");
      expect(lastWarn).toContain("droppedMessageCount=1");
    } finally {
      console.warn = originalWarn;
    }
  });

  test("handles approvals without stream consumption and blocks send", async () => {
    let canUseToolCalledResolve!: () => void;
    const canUseToolCalled = new Promise<void>((resolve) => {
      canUseToolCalledResolve = resolve;
    });
    let allowResolve!: () => void;
    const allowPromise = new Promise<void>((resolve) => {
      allowResolve = resolve;
    });

    const session = new Session({
      canUseTool: async () => {
        canUseToolCalledResolve();
        await allowPromise;
        return { behavior: "allow" };
      },
    });

    const initMessage = {
      type: "system",
      subtype: "init",
      agent_id: "agent-1",
      session_id: "session-1",
      conversation_id: "conv-1",
      model: "test-model",
      tools: [],
    } as unknown as WireMessage;
    const controlRequest = {
      type: "control_request",
      request_id: "req-1",
      request: {
        subtype: "can_use_tool",
        tool_name: "Bash",
        tool_call_id: "tool-1",
        input: { command: "ls" },
        permission_suggestions: [],
        blocked_path: null,
      },
    } as unknown as WireMessage;

    const { transport, writes } = createFakeTransport([
      initMessage,
      controlRequest,
    ]);

    // @ts-expect-error - overriding private transport for testing
    session.transport = transport;

    await session.initialize();
    await canUseToolCalled;

    const sendPromise = session.send("hello");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(writes.some((entry) => (entry as { type?: string }).type === "user")).toBe(false);

    allowResolve();
    await sendPromise;

    const controlIndex = writes.findIndex(
      (entry) => (entry as { type?: string }).type === "control_response"
    );
    const userIndex = writes.findIndex(
      (entry) => (entry as { type?: string }).type === "user"
    );
    expect(controlIndex).toBeGreaterThanOrEqual(0);
    expect(userIndex).toBeGreaterThan(controlIndex);
  });
});
