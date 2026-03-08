/**
 * Text chunking utility for the Knowledge Bank processing pipeline.
 * Breaks documents into overlapping chunks for vector embedding.
 */

export interface TextChunk {
  text: string;
  startIndex: number;
  index: number;
}

export interface ChunkOptions {
  chunkSize?: number;   // ~800 chars per chunk
  chunkOverlap?: number; // 100 char overlap
}

/**
 * Split text into overlapping chunks, preferring sentence/paragraph boundaries.
 */
export function chunkText(
  text: string,
  options: ChunkOptions = {}
): TextChunk[] {
  const { chunkSize = 800, chunkOverlap = 100 } = options;

  // Normalize whitespace
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const chunks: TextChunk[] = [];
  let start = 0;
  let index = 0;

  while (start < normalized.length) {
    let end = start + chunkSize;

    if (end < normalized.length) {
      // Try to break at a paragraph boundary first
      const lastDoubleNewline = normalized.lastIndexOf("\n\n", end);
      if (lastDoubleNewline > start + chunkSize * 0.5) {
        end = lastDoubleNewline + 2;
      } else {
        // Fall back to sentence boundary
        const lastPeriod = normalized.lastIndexOf(". ", end);
        const lastNewline = normalized.lastIndexOf("\n", end);
        const breakPoint = Math.max(lastPeriod + 1, lastNewline);
        if (breakPoint > start + chunkSize * 0.4) {
          end = breakPoint + 1;
        }
      }
    }

    const chunkText = normalized.slice(start, end).trim();
    if (chunkText) {
      chunks.push({ text: chunkText, startIndex: start, index });
      index++;
    }

    start = end - chunkOverlap;
    if (start <= 0) start = end; // safety: no infinite loop
  }

  return chunks;
}
