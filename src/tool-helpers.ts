/**
 * Tool Helpers
 * 
 * Helper functions for creating tool results and parsing parameters.
 * Matches the API from pi-coding-agent.
 */

import type { AgentToolResult } from "./types.js";

/**
 * Create a JSON tool result
 */
export function jsonResult(payload: unknown): AgentToolResult<unknown> {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(payload, null, 2),
      },
    ],
    details: payload,
  };
}

/**
 * Options for reading string parameters
 */
export interface StringParamOptions {
  required?: boolean;
  trim?: boolean;
  label?: string;
  allowEmpty?: boolean;
}

/**
 * Read a string parameter from tool args
 */
export function readStringParam(
  params: Record<string, unknown>,
  key: string,
  options?: StringParamOptions & { required: true },
): string;
export function readStringParam(
  params: Record<string, unknown>,
  key: string,
  options?: StringParamOptions,
): string | undefined;
export function readStringParam(
  params: Record<string, unknown>,
  key: string,
  options: StringParamOptions = {},
): string | undefined {
  const { required = false, trim = true, label = key, allowEmpty = false } = options;
  const raw = params[key];
  if (typeof raw !== "string") {
    if (required) throw new Error(`${label} required`);
    return undefined;
  }
  const value = trim ? raw.trim() : raw;
  if (!value && !allowEmpty) {
    if (required) throw new Error(`${label} required`);
    return undefined;
  }
  return value;
}

/**
 * Read a number parameter from tool args
 */
export function readNumberParam(
  params: Record<string, unknown>,
  key: string,
  options: { required?: boolean; label?: string; integer?: boolean } = {},
): number | undefined {
  const { required = false, label = key, integer = false } = options;
  const raw = params[key];
  let value: number | undefined;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    value = raw;
  } else if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed) {
      const parsed = Number.parseFloat(trimmed);
      if (Number.isFinite(parsed)) value = parsed;
    }
  }
  if (value === undefined) {
    if (required) throw new Error(`${label} required`);
    return undefined;
  }
  return integer ? Math.trunc(value) : value;
}

/**
 * Read a boolean parameter from tool args
 */
export function readBooleanParam(
  params: Record<string, unknown>,
  key: string,
  options: { required?: boolean; label?: string } = {},
): boolean | undefined {
  const { required = false, label = key } = options;
  const raw = params[key];
  if (typeof raw === "boolean") {
    return raw;
  }
  if (typeof raw === "string") {
    const lower = raw.toLowerCase().trim();
    if (lower === "true" || lower === "1" || lower === "yes") return true;
    if (lower === "false" || lower === "0" || lower === "no") return false;
  }
  if (required) throw new Error(`${label} required`);
  return undefined;
}

/**
 * Read a string array parameter from tool args
 */
export function readStringArrayParam(
  params: Record<string, unknown>,
  key: string,
  options: StringParamOptions = {},
): string[] | undefined {
  const { required = false, label = key } = options;
  const raw = params[key];
  if (Array.isArray(raw)) {
    const values = raw
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter(Boolean);
    if (values.length === 0) {
      if (required) throw new Error(`${label} required`);
      return undefined;
    }
    return values;
  }
  if (typeof raw === "string") {
    const value = raw.trim();
    if (!value) {
      if (required) throw new Error(`${label} required`);
      return undefined;
    }
    return [value];
  }
  if (required) throw new Error(`${label} required`);
  return undefined;
}
