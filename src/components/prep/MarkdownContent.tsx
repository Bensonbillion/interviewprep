"use client";

import ReactMarkdown from "react-markdown";

interface MarkdownContentProps {
  content: string;
  /** Additional prose overrides */
  className?: string;
  /** Teleprompter mode: larger text, narrower column, more line height */
  teleprompter?: boolean;
}

/**
 * Renders markdown-formatted AI content with Tailwind Typography.
 *
 * Typography hierarchy (from UX spec):
 * - Main answer body: 16px / Regular 400 / 1.5× line height / #374151
 * - Supporting body: 14px / Regular 400 / 1.57× line height / #4B5563
 * - Headings: Semibold 600 (weight contrast > size jumps)
 * - Max content width: 680px (65–75 chars)
 *
 * Teleprompter mode: 24–28px, 1.8× line height, max 45 chars/line,
 * optimized for spoken rehearsal.
 */
export function MarkdownContent({ content, className, teleprompter }: MarkdownContentProps) {
  if (teleprompter) {
    return (
      <div
        className={`prose prose-lg prose-stone dark:prose-invert
          max-w-[45ch]
          prose-headings:text-[var(--text-primary)] prose-headings:font-semibold
          prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-3
          prose-h3:text-lg prose-h3:mt-4 prose-h3:mb-2
          prose-p:text-[24px] sm:prose-p:text-[28px] prose-p:leading-[1.8] prose-p:text-[var(--text-primary)] prose-p:my-4
          prose-li:text-[24px] sm:prose-li:text-[28px] prose-li:text-[var(--text-primary)] prose-li:my-1
          prose-strong:text-white prose-strong:font-semibold
          prose-em:text-[var(--text-secondary)]
          prose-hr:border-white/20 prose-hr:my-4
          ${className ?? ""}`}
      >
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    );
  }

  return (
    <div
      className={`prose prose-sm prose-stone dark:prose-invert
        max-w-[680px]
        prose-headings:text-[var(--text-primary)] prose-headings:font-semibold
        prose-h2:text-base prose-h2:mt-4 prose-h2:mb-2
        prose-h3:text-sm prose-h3:mt-3 prose-h3:mb-1.5
        prose-p:text-[16px] prose-p:leading-[1.5] prose-p:text-[#374151] dark:prose-p:text-[var(--text-secondary)] prose-p:my-2
        prose-li:text-[16px] prose-li:text-[#374151] dark:prose-li:text-[var(--text-secondary)] prose-li:my-0.5
        prose-strong:text-[var(--text-primary)] prose-strong:font-semibold
        prose-em:text-[var(--text-secondary)]
        prose-hr:border-stone-200 dark:prose-hr:border-white/10 prose-hr:my-3
        prose-blockquote:border-stone-300 dark:prose-blockquote:border-white/20
        prose-blockquote:text-[var(--text-secondary)] prose-blockquote:not-italic
        ${className ?? ""}`}
    >
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
