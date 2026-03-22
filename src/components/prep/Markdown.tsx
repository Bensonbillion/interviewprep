"use client";

import ReactMarkdown from "react-markdown";

interface MarkdownProps {
  content: string;
  className?: string;
}

/**
 * Safe markdown rendering using react-markdown with Tailwind Typography.
 * Used everywhere answer content appears — never render raw content as {text} in JSX.
 */
export function Markdown({ content, className }: MarkdownProps) {
  return (
    <div
      className={`prose prose-sm sm:prose-base max-w-none
        prose-p:my-2 prose-p:leading-relaxed prose-p:text-[var(--text-primary)]
        prose-strong:font-semibold prose-strong:text-[var(--text-primary)]
        prose-li:text-[var(--text-primary)] prose-li:my-0.5
        prose-ul:my-2 prose-ol:my-2
        prose-headings:font-medium prose-headings:text-[var(--text-primary)]
        prose-h2:text-base prose-h2:mt-4 prose-h2:mb-2
        prose-h3:text-sm prose-h3:mt-3 prose-h3:mb-1.5
        prose-hr:border-cream-300 prose-hr:my-3
        prose-blockquote:border-cream-300 prose-blockquote:text-[var(--text-secondary)] prose-blockquote:not-italic
        ${className ?? ""}`}
    >
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
