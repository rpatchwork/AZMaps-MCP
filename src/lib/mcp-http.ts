import { z } from 'zod';

type ToolCallParams = {
  name: string;
  args: unknown;
};

type ValidationFailure = {
  code: number;
  message: string;
  data?: Record<string, unknown>;
};

export function validateToolCallParams(params: unknown):
  | { ok: true; value: ToolCallParams }
  | { ok: false; error: ValidationFailure } {
  if (!params || typeof params !== 'object') {
    return {
      ok: false,
      error: {
        code: -32602,
        message: 'Invalid params: expected an object with name and optional arguments',
      },
    };
  }

  const record = params as Record<string, unknown>;
  const name = record.name;

  if (typeof name !== 'string' || name.trim().length === 0) {
    return {
      ok: false,
      error: {
        code: -32602,
        message: 'Invalid params: name must be a non-empty string',
      },
    };
  }

  return {
    ok: true,
    value: {
      name,
      args: record.arguments,
    },
  };
}

export function formatToolResultText(name: string, toolResult: unknown): string {
  // maps_generate_locked_html returns full HTML text and should not be JSON-escaped.
  if (name === 'maps_generate_locked_html' && typeof toolResult === 'string') {
    return toolResult;
  }

  if (typeof toolResult === 'string') {
    return toolResult;
  }

  return JSON.stringify(toolResult, null, 2);
}

export function isZodValidationError(error: unknown): error is z.ZodError {
  return error instanceof z.ZodError;
}
