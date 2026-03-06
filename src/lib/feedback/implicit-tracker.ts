import type { EditType } from "@/types/feedback";

interface InteractionData {
  session_id: string;
  answer_id: string | null;
  user_id: string | null;
  answer_type: string;
  original_text: string | null;
  edited_text: string | null;
  edit_distance_chars: number | null;
  edit_distance_words: number | null;
  edit_type: EditType | null;
  time_on_card_seconds: number | null;
  card_expanded: boolean;
  card_collapsed_without_reading: boolean;
  copied_to_clipboard: boolean;
  regeneration_count: number;
  regeneration_with_prompt_change: boolean | null;
}

const FLUSH_INTERVAL_MS = 30_000;
const MIN_VIEW_SECONDS = 2;

function scheduleIdle(fn: () => void) {
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(fn);
  } else {
    setTimeout(fn, 0);
  }
}

function levenshteinWords(a: string[], b: string[]): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

function classifyEdit(
  original: string,
  edited: string
): { chars: number; words: number; type: EditType } {
  if (original === edited) return { chars: 0, words: 0, type: "none" };

  const origWords = original.split(/\s+/).filter(Boolean);
  const editWords = edited.split(/\s+/).filter(Boolean);
  const wordDist = levenshteinWords(origWords, editWords);
  const charDist = Math.abs(original.length - edited.length) +
    Math.min(original.length, edited.length) -
    commonPrefixLen(original, edited) -
    commonSuffixLen(original, edited, commonPrefixLen(original, edited));

  const origLen = origWords.length || 1;
  const ratio = wordDist / origLen;

  let type: EditType;
  if (ratio === 0) {
    type = "none";
  } else if (ratio < 0.1) {
    type = "minor_rewording";
  } else if (ratio < 0.3) {
    type = "significant_edit";
  } else if (ratio >= 0.7) {
    type = "complete_rewrite";
  } else if (editWords.length > origLen * 1.2) {
    type = "addition";
  } else if (editWords.length < origLen * 0.8) {
    type = "deletion";
  } else {
    type = "significant_edit";
  }

  return { chars: charDist, words: wordDist, type };
}

function commonPrefixLen(a: string, b: string): number {
  const max = Math.min(a.length, b.length);
  let i = 0;
  while (i < max && a[i] === b[i]) i++;
  return i;
}

function commonSuffixLen(a: string, b: string, prefixLen: number): number {
  const max = Math.min(a.length, b.length) - prefixLen;
  let i = 0;
  while (i < max && a[a.length - 1 - i] === b[b.length - 1 - i]) i++;
  return i;
}

class ImplicitTracker {
  private buffer = new Map<string, InteractionData>();
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private viewStartTimes = new Map<string, number>();
  private expandStartTimes = new Map<string, number>();
  private editOriginals = new Map<string, string>();
  private sessionId: string | null = null;
  private userId: string | null = null;
  private disposed = false;
  private boundBeforeUnload: (() => void) | null = null;

  init(sessionId: string, userId?: string | null) {
    this.sessionId = sessionId;
    this.userId = userId ?? null;
    this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL_MS);
    this.boundBeforeUnload = () => this.flush();
    window.addEventListener("beforeunload", this.boundBeforeUnload);
  }

  dispose() {
    this.disposed = true;
    this.flush();
    if (this.flushTimer) clearInterval(this.flushTimer);
    if (this.boundBeforeUnload) {
      window.removeEventListener("beforeunload", this.boundBeforeUnload);
    }
    this.buffer.clear();
    this.viewStartTimes.clear();
    this.expandStartTimes.clear();
    this.editOriginals.clear();
  }

  trackCardView(answerType: string, answerId?: string) {
    if (this.disposed) return;
    this.viewStartTimes.set(answerType, Date.now());
    this.ensureEntry(answerType, answerId);
  }

  trackCardHide(answerType: string) {
    if (this.disposed) return;
    const start = this.viewStartTimes.get(answerType);
    if (!start) return;
    const seconds = Math.round((Date.now() - start) / 1000);
    this.viewStartTimes.delete(answerType);
    if (seconds < MIN_VIEW_SECONDS) return;
    const entry = this.buffer.get(answerType);
    if (entry) {
      entry.time_on_card_seconds = (entry.time_on_card_seconds ?? 0) + seconds;
    }
  }

  trackEditStart(answerType: string, originalText: string) {
    if (this.disposed) return;
    this.editOriginals.set(answerType, originalText);
  }

  trackEditEnd(answerType: string, editedText: string) {
    if (this.disposed) return;
    const original = this.editOriginals.get(answerType);
    this.editOriginals.delete(answerType);
    if (!original || original === editedText) return;

    const entry = this.buffer.get(answerType);
    if (!entry) return;

    scheduleIdle(() => {
      const result = classifyEdit(original, editedText);
      entry.original_text = original;
      entry.edited_text = editedText;
      entry.edit_distance_chars = result.chars;
      entry.edit_distance_words = result.words;
      entry.edit_type = result.type;
    });
  }

  trackRegeneration(answerType: string, promptChanged: boolean) {
    if (this.disposed) return;
    const entry = this.buffer.get(answerType);
    if (!entry) return;
    entry.regeneration_count += 1;
    if (promptChanged) entry.regeneration_with_prompt_change = true;
  }

  trackCopy(answerType: string) {
    if (this.disposed) return;
    const entry = this.buffer.get(answerType);
    if (entry) entry.copied_to_clipboard = true;
  }

  trackExpand(answerType: string) {
    if (this.disposed) return;
    const entry = this.buffer.get(answerType);
    if (entry) entry.card_expanded = true;
    this.expandStartTimes.set(answerType, Date.now());
  }

  trackCollapse(answerType: string) {
    if (this.disposed) return;
    const start = this.expandStartTimes.get(answerType);
    this.expandStartTimes.delete(answerType);
    if (start) {
      const seconds = (Date.now() - start) / 1000;
      const entry = this.buffer.get(answerType);
      if (entry && seconds < 3) {
        entry.card_collapsed_without_reading = true;
      }
    }
  }

  private ensureEntry(answerType: string, answerId?: string): InteractionData {
    let entry = this.buffer.get(answerType);
    if (!entry) {
      entry = {
        session_id: this.sessionId ?? "",
        answer_id: answerId ?? null,
        user_id: this.userId,
        answer_type: answerType,
        original_text: null,
        edited_text: null,
        edit_distance_chars: null,
        edit_distance_words: null,
        edit_type: null,
        time_on_card_seconds: null,
        card_expanded: false,
        card_collapsed_without_reading: false,
        copied_to_clipboard: false,
        regeneration_count: 0,
        regeneration_with_prompt_change: null,
      };
      this.buffer.set(answerType, entry);
    }
    if (answerId && !entry.answer_id) entry.answer_id = answerId;
    return entry;
  }

  private flush() {
    if (this.buffer.size === 0) return;

    // Finalize any in-progress view times
    for (const [answerType, start] of this.viewStartTimes) {
      const seconds = Math.round((Date.now() - start) / 1000);
      if (seconds >= MIN_VIEW_SECONDS) {
        const entry = this.buffer.get(answerType);
        if (entry) {
          entry.time_on_card_seconds = (entry.time_on_card_seconds ?? 0) + seconds;
        }
      }
      // Reset start time to now so we don't double-count
      this.viewStartTimes.set(answerType, Date.now());
    }

    const batch = Array.from(this.buffer.values());
    this.buffer.clear();

    // Fire-and-forget: use sendBeacon on unload, fetch otherwise
    const payload = JSON.stringify({ interactions: batch });

    if (this.disposed && typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon(
        "/api/feedback/interaction",
        new Blob([payload], { type: "application/json" })
      );
      return;
    }

    fetch("/api/feedback/interaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {
      // Implicit signals are statistical — dropping occasional batches is fine
    });
  }
}

export const tracker = new ImplicitTracker();
