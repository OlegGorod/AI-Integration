import Anthropic from "@anthropic-ai/sdk";

// Turns any thrown value into a human-readable message.
// Callers decide how to show it (stderr in the CLI, JSON in an API route).
export function describeApiError(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError) {
    return "Error: invalid API key (401).";
  }
  if (error instanceof Anthropic.RateLimitError) {
    return "Error: rate limit exceeded (429). Try again later.";
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return `Error: could not connect to the API: ${error.message}`;
  }
  if (error instanceof Anthropic.APIError) {
    return `API error (${error.status}): ${error.message}`;
  }
  return `Unexpected error: ${String(error)}`;
}
