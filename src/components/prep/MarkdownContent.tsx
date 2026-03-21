"use client";

import ReactMarkdown from "react-markdown";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

/**
 * Renders markdown-formatted AI content with Tailwind Typography.
 *
 * Uses react-markdown + @tailwindcss/typography's `prose` class
 * to convert raw markdown (##, **, -, etc.) into properly styled HTML.
 * Eliminates visible markdown syntax instantly.
 */
export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div
      className={`prose prose-sm prose-stone dark:prose-invert max-w-none
        prose-headings:text-[var(--text-primary)] prose-headings:font-semibold
        prose-h2:text-base prose-h2:mt-4 prose-h2:mb-2
        prose-h3:text-sm prose-h3:mt-3 prose-h3:mb-1.5
        prose-p:text-[15px] prose-p:leading-relaxed prose-p:text-[var(--text-secondary)] prose-p:my-2
        prose-li:text-[15px] prose-li:text-[var(--text-secondary)] prose-li:my-0.5
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
