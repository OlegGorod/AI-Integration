import type Anthropic from "@anthropic-ai/sdk";

// Claude Haiku 5.5 prices in USD per 1M tokens (as of 2026-11-27).
// Source: https://platform.claude.com/docs/en/about-claude/pricing
const INPUT_PRICE_PER_MTOK = 0.1;
const OUTPUT_PRICE_PER_MTOK = 0.5;

// Prompts over 100K tokens are billed at higher rates for the whole request.
const LONG_PROMPT_THRESHOLD = 100_000;
const LONG_INPUT_PRICE_PER_MTOK = 0.5;
const LONG_OUTPUT_PRICE_PER_MTOK = 2.5;

export function calculateCost(usage: Anthropic.Usage): number {
  const isLongPrompt = usage.input_tokens > LONG_PROMPT_THRESHOLD;
  const inputPrice = isLongPrompt
    ? LONG_INPUT_PRICE_PER_MTOK
    : INPUT_PRICE_PER_MTOK;
  const outputPrice = isLongPrompt
    ? LONG_OUTPUT_PRICE_PER_MTOK
    : OUTPUT_PRICE_PER_MTOK;

  return (
    (usage.input_tokens / 1_000_000) * inputPrice +
    (usage.output_tokens / 1_000_000) * outputPrice
  );
}
