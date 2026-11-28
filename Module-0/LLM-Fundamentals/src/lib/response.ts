import type Anthropic from "@anthropic-ai/sdk";

// response.content is a list of blocks; keep only the text ones
export function extractText(message: Anthropic.Message): string {
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

// Useful for diagnosing empty answers (e.g. only a thinking block came back)
export function listBlockTypes(message: Anthropic.Message): string[] {
  return message.content.map((block) => block.type);
}
