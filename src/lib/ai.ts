import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Model routing per PRD:
// - Claude Sonnet 4:  generation (prep kits, company research) — quality-critical
// - Claude Haiku 4.5: resume parsing, cross-referencing, auto-tagging — fast + cheap
export const SONNET = "claude-sonnet-4-6";
export const HAIKU = "claude-haiku-4-5-20251001";

// Firecrawl API key (optional — graceful fallback to raw fetch if not set)
export const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY ?? "";
