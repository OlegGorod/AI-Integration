export const MODEL = "claude-haiku-5-5";

// Override with the MAX_TOKENS environment variable, e.g. MAX_TOKENS=50
export const DEFAULT_MAX_TOKENS = 1024;

// Returns null when the value is not a positive integer
export function parseMaxTokens(raw: string | undefined): number | null {
  if (raw === undefined || raw.trim() === "") {
    return DEFAULT_MAX_TOKENS;
  }
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : null;
}
