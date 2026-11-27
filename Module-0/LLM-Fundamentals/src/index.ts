import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-haiku-5-5";

// Override with the MAX_TOKENS environment variable, e.g. MAX_TOKENS=50
const DEFAULT_MAX_TOKENS = 1024;

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

// Returns null when the value is not a positive integer
function parseMaxTokens(raw: string | undefined): number | null {
  if (raw === undefined || raw.trim() === "") {
    return DEFAULT_MAX_TOKENS;
  }
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : null;
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

  const maxTokens = parseMaxTokens(process.env.MAX_TOKENS);
  if (maxTokens === null) {
    console.error(
      `Error: MAX_TOKENS must be a positive integer, got "${process.env.MAX_TOKENS}".`,
    );
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
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

    // An empty answer would otherwise print a blank line with no explanation
    const isEmptyAnswer = text.trim().length === 0;
    if (isEmptyAnswer) {
      const blockTypes = response.content.map((block) => block.type);
      console.error("Error: the model returned no text answer.");
      console.error(`Content blocks: [${blockTypes.join(", ")}]`);
    } else {
      console.log(text);
    }

    // Printed to stderr so stdout contains only the answer
    const { input_tokens, output_tokens } = response.usage;
    const cost = calculateCost(response.usage);
    console.error(
      `\nTokens: ${input_tokens} in / ${output_tokens} out | Cost: $${cost.toFixed(6)} | Stop: ${response.stop_reason}`,
    );

    if (response.stop_reason === "max_tokens") {
      console.error("Warning: the answer was cut off at the max_tokens limit.");
    }

    if (isEmptyAnswer) {
      process.exit(1);
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

// Safety net: any error that escapes main() still gets a clear message and exit code 1
main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
