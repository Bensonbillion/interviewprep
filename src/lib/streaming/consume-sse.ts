import type { AnswerStreamEvent } from "@/lib/ai/streaming";

interface AnswerStreamHandlers {
  onText: (chunk: string) => void;
  onDone: (meta: { answerId: string; model: string }) => void;
  onError: (message: string) => void;
}

/**
 * Read a Server-Sent Events response body produced by /api/generate-answer
 * or /api/regenerate-answer (streaming branch) and dispatch each event to
 * the matching handler.
 *
 * Resolves when the stream closes. Does NOT throw — errors surface via
 * onError so callers don't need a separate try/catch around the consumer.
 */
export async function consumeAnswerStream(
  response: Response,
  handlers: AnswerStreamHandlers,
): Promise<void> {
  if (!response.ok) {
    handlers.onError(`HTTP ${response.status}`);
    return;
  }
  const reader = response.body?.getReader();
  if (!reader) {
    handlers.onError("No response body");
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE framing: each event is `data: <json>\n\n`. Keep any trailing
      // partial event in the buffer for the next read.
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";

      for (const raw of events) {
        const line = raw.trim();
        if (!line.startsWith("data: ")) continue;
        try {
          const event = JSON.parse(line.slice(6)) as AnswerStreamEvent;
          if (event.type === "text") handlers.onText(event.text);
          else if (event.type === "done") handlers.onDone({ answerId: event.answerId, model: event.model });
          else if (event.type === "error") handlers.onError(event.message);
        } catch {
          // Partial chunk inside a multi-byte boundary — ignore; next read will complete it.
        }
      }
    }
  } catch (err) {
    handlers.onError(err instanceof Error ? err.message : "Stream read error");
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* already released */
    }
  }
}
