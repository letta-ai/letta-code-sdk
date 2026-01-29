import { describe, expect, test } from "bun:test";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";

describe("CLI resolution", () => {
  test("resolves @letta-ai/letta-code via package main export", () => {
    // This is the resolution strategy used by findCli().
    // Previously we resolved "@letta-ai/letta-code/letta.js" which fails
    // with ERR_PACKAGE_PATH_NOT_EXPORTED because the subpath isn't in the
    // package.json exports field. The main export "." maps to "./letta.js".
    const require = createRequire(import.meta.url);
    const resolved = require.resolve("@letta-ai/letta-code");
    expect(resolved).toBeDefined();
    expect(resolved.endsWith("letta.js")).toBe(true);
    expect(existsSync(resolved)).toBe(true);
  });

  test("subpath resolution fails without explicit export", () => {
    // This documents why we can't use the subpath directly.
    const require = createRequire(import.meta.url);
    expect(() => {
      require.resolve("@letta-ai/letta-code/letta.js");
    }).toThrow();
  });
});
