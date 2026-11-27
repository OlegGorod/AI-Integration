import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-haiku-5-5";

// Claude Haiku 5.5 prices in USD per 1M tokens (as of 2026-11-27).
// Source: https://platform.claude.com/docs/en/about-claude/pricing
const INPUT_PRICE_PER_MTOK = 0.1;
const OUTPUT_PRICE_PER_MTOK = 0.5;

// Prompts over 100K tokens are billed at higher rates for the whole request.
const LONG_PROMPT_THRESHOLD = 100_000;
const LONG_INPUT_PRICE_PER_MTOK = 0.5;
const LONG_OUTPUT_PRICE_PER_MTOK = 2.5;

function calculateCost(usage: Anthropic.Usage): number {
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

async function main(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  const prompt = process.argv.slice(2).join(" ").trim();

  if (!apiKey) {
    console.error("Error: environment variable ANTHROPIC_API_KEY is not set.");
    process.exit(1);
  }
  if (!prompt) {
    console.error(
      'We didn\'t receive a question. Usage: npm run ask -- "your question"',
    );
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system:
        "You are a helpful assistant. Answer briefly and clearly in one sentence.",
      output_config: { effort: "low" },
      messages: [{ role: "user", content: prompt }],
    });

    if (response.stop_reason === "refusal") {
      console.error("Error: the model declined to answer this request.");
      process.exit(1);
    }

    // response.content is a list of blocks; print only the text ones
    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    console.log(text);

    // Printed to stderr so stdout contains only the answer
    const { input_tokens, output_tokens } = response.usage;
    const cost = calculateCost(response.usage);
    console.error(
      `\nTokens: ${input_tokens} in / ${output_tokens} out | Cost: $${cost.toFixed(6)}`,
    );

    if (response.stop_reason === "max_tokens") {
      console.error("Warning: the answer was cut off at the max_tokens limit.");
    }
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      console.error("Error: invalid API key (401).");
    } else if (error instanceof Anthropic.RateLimitError) {
      console.error("Error: rate limit exceeded (429). Try again later.");
    } else if (error instanceof Anthropic.APIConnectionError) {
      console.error(`Error: could not connect to the API: ${error.message}`);
    } else if (error instanceof Anthropic.APIError) {
      console.error(`API error (${error.status}): ${error.message}`);
    } else {
      console.error("Unexpected error:", error);
    }
    process.exit(1);
  }
}

main();
