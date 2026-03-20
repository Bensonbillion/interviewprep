"use client";

import { renderInlineFormatting } from "@/components/prep/content-renderers";

interface MarkdownContentProps {
  content: string;
  isSpoken?: boolean;
  className?: string;
}

/**
 * Renders markdown-formatted text with proper typography.
 *
 * Handles: ## and ### headings, **bold**, *italic*, bullet lists,
 * numbered lists, blockquotes (>), horizontal rules (---), paragraphs.
 *
 * Used by the progressive disclosure rendering in AnswerCard for
 * spoken answer sections (30-second, full answer, dig deeper).
 */
export function MarkdownContent({ content, isSpoken, className }: MarkdownContentProps) {
  const blocks = content.split(/\n\n+/).filter((b) => b.trim());

  return (
    <div className={`space-y-3 max-w-prose ${className ?? ""}`}>
      {blocks.map((block, i) => {
        const trimmed = block.trim();

        // Headings
        if (trimmed.startsWith("### ")) {
          return (
            <h4 key={i} className="text-sm font-semibold text-[var(--text-primary)] mt-2 first:mt-0">
              {renderInlineFormatting(trimmed.slice(4))}
            </h4>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h3 key={i} className="text-base font-semibold text-[var(--text-primary)] mt-3 first:mt-0">
              {renderInlineFormatting(trimmed.slice(3))}
            </h3>
          );
        }

        // Horizontal rule
        if (trimmed === "---" || trimmed === "***") {
          return <hr key={i} className="border-stone-200 dark:border-white/10 my-2" />;
        }

        // Blockquote
        const lines = trimmed.split("\n");
        if (lines.every((l) => l.startsWith("> ") || l === ">")) {
          const quoteLines = lines.map((l) => l.replace(/^>\s?/, ""));
          return (
            <blockquote
              key={i}
              className="border-l-[3px] border-stone-300 dark:border-white/20 pl-3 text-[var(--text-secondary)] italic text-[15px] sm:text-base leading-relaxed"
            >
              {quoteLines.map((line, j) => (
                <span key={j}>
                  {j > 0 && <br />}
                  {renderInlineFormatting(line)}
                </span>
              ))}
            </blockquote>
          );
        }

        // Bullet list
        const isBulletList = lines.every((l) => /^\s*[-•*]\s/.test(l));
        if (isBulletList) {
          return (
            <ul key={i} className="space-y-1.5">
              {lines.map((line, j) => {
                const text = line.trim().replace(/^[-•*]\s+/, "");
                return (
                  <li key={j} className="flex gap-2 text-[15px] sm:text-base text-[var(--text-secondary)] leading-relaxed">
                    <span className="text-[var(--text-tertiary)] mt-0.5 flex-shrink-0">•</span>
                    <span>{renderInlineFormatting(text)}</span>
                  </li>
                );
              })}
            </ul>
          );
        }

        // Numbered list
        const isNumberedList = lines.every((l) => /^\s*\d+[\.\)]\s/.test(l));
        if (isNumberedList) {
          return (
            <ol key={i} className="space-y-1.5">
              {lines.map((line, j) => {
                const text = line.trim().replace(/^\d+[\.\)]\s+/, "");
                return (
                  <li key={j} className="flex gap-2 text-[15px] sm:text-base text-[var(--text-secondary)] leading-relaxed">
                    <span className="text-[var(--text-tertiary)] mt-0.5 flex-shrink-0 tabular-nums text-xs font-medium w-4 text-right">
                      {j + 1}.
                    </span>
                    <span>{renderInlineFormatting(text)}</span>
                  </li>
                );
              })}
            </ol>
          );
        }

        // Paragraph
        return (
          <p
            key={i}
            className={`text-[15px] sm:text-base leading-relaxed ${
              i === 0 && isSpoken
                ? "text-[var(--text-primary)] font-medium"
                : "text-[var(--text-secondary)]"
            }`}
          >
            {lines.map((line, j) => (
              <span key={j}>
                {j > 0 && <br />}
                {renderInlineFormatting(line)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
