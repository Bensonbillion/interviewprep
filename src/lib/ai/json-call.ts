import "server-only";
import type { z, ZodType } from "zod";
import { anthropic } from "@/lib/ai";

interface CallOpts<T> {
  model: string;
  system: string;
  user: string;
  maxTokens: number;
  schema: ZodType<T>;
  /** Used in logs to identify the caller. */
  label: string;
}

interface CallResult<T> {
  data: T;
  attempts: number;
}

/**
 * Single Claude call that returns parsed-and-validated JSON.
 *
 * Behaviour:
 *  - Extracts the first text block, strips ```json fences, isolates the
 *    outermost {…} object, JSON.parses, validates with the provided Zod
 *    schema.
 *  - On parse failure OR Zod failure: retries once with a corrective
 *    instruction appended to the user message.
 *  - On a second failure: throws. Callers apply their own fallback (the
 *    Positioning Engine's classifier degrades to a safe default; the
 *    research step degrades to research_depth: 'minimal').
 */
export async function callClaudeForJson<T>(
  opts: CallOpts<T>
): Promise<CallResult<T>> {
  const { model, system, maxTokens, schema, label } = opts;

  let lastError: string | null = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const userMessage =
      attempt === 1
        ? opts.user
        : `${opts.user}\n\nYour previous response was rejected: ${lastError}\nReturn ONLY valid JSON matching the schema. No preamble, no markdown fences.`;

    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userMessage }],
    });

    const block = response.content[0];
    if (!block || block.type !== "text") {
      lastError = "non-text response block";
      continue;
    }

    const cleaned = block.text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) {
      lastError = "no JSON object found in response";
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(match[0]);
    } catch (err) {
      lastError = `JSON.parse failed: ${err instanceof Error ? err.message : String(err)}`;
      continue;
    }

    const validation = schema.safeParse(parsed);
    if (!validation.success) {
      lastError = `schema validation failed: ${validation.error.issues
        .slice(0, 3)
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`;
      continue;
    }

    return { data: validation.data as T, attempts: attempt };
  }

  throw new Error(`[${label}] Claude JSON call failed after 2 attempts: ${lastError}`);
}

export type { ZodType };
export type Inferred<S extends ZodType> = z.infer<S>;
