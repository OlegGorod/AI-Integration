import Anthropic from "@anthropic-ai/sdk";
import { MODEL, parseMaxTokens } from "../lib/config.js";
import { describeApiError } from "../lib/errors.js";
import { calculateCost } from "../lib/pricing.js";
import { extractText, listBlockTypes } from "../lib/response.js";

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

    const text = extractText(response);

    // An empty answer would otherwise print a blank line with no explanation
    const isEmptyAnswer = text.trim().length === 0;
    if (isEmptyAnswer) {
      console.error("Error: the model returned no text answer.");
      console.error(`Content blocks: [${listBlockTypes(response).join(", ")}]`);
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
    console.error(describeApiError(error));
    process.exit(1);
  }
}

// Safety net: any error that escapes main() still gets a clear message and exit code 1
main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
