import ReactMarkdown from "react-markdown";
import { Footer } from "@/components/landing/Footer";

interface LegalPageProps {
  content: string;
}

export function LegalPage({ content }: LegalPageProps) {
  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] flex flex-col">
      <main className="flex-1 px-6 py-16 sm:py-20">
        <article
          className="
            mx-auto max-w-[720px]
            font-sans
            prose prose-stone dark:prose-invert
            prose-headings:font-semibold prose-headings:text-[var(--text-primary)]
            prose-h1:text-3xl sm:prose-h1:text-4xl prose-h1:mb-2 prose-h1:mt-0
            prose-h2:text-xl sm:prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4
            prose-h3:text-base sm:prose-h3:text-lg prose-h3:mt-8 prose-h3:mb-3
            prose-p:text-[15px] sm:prose-p:text-base prose-p:leading-[1.75] prose-p:text-[var(--text-secondary)]
            prose-li:text-[15px] sm:prose-li:text-base prose-li:leading-[1.75] prose-li:text-[var(--text-secondary)]
            prose-li:my-1
            prose-strong:text-[var(--text-primary)] prose-strong:font-semibold
            prose-a:text-[#E8735A] prose-a:no-underline hover:prose-a:underline
            prose-blockquote:border-l-4 prose-blockquote:border-[#E8735A]
            prose-blockquote:bg-[var(--bg-card)] prose-blockquote:rounded-r-lg
            prose-blockquote:py-3 prose-blockquote:px-5 prose-blockquote:my-6
            prose-blockquote:not-italic prose-blockquote:text-[var(--text-primary)]
            prose-hr:my-10 prose-hr:border-[var(--color-border-secondary,#E8E4DF)]
          "
        >
          <ReactMarkdown>{content}</ReactMarkdown>
        </article>
      </main>
      <Footer />
    </div>
  );
}
