import Link from "next/link";
import type { ReactNode } from "react";

function BlogCTA() {
  return (
    <div className="my-8 bg-gradient-to-br from-[#1E3A5F] to-[#4A7AFF] rounded-xl p-6 text-center">
      <p className="text-lg font-semibold text-white">
        Ready to practice?
      </p>
      <p className="text-blue-200 text-sm mt-1">
        Get a personalized prep kit with answers tailored to your target company.
      </p>
      <Link
        href="/get-started"
        className="inline-block mt-4 bg-white text-[#1E3A5F] hover:bg-blue-50
                   font-semibold px-6 py-2.5 rounded-full text-sm
                   shadow-[0_4px_20px_rgba(0,0,0,0.15)] transition-all duration-200"
      >
        Create your free prep kit &rarr;
      </Link>
    </div>
  );
}

function Tip({ children }: { children: ReactNode }) {
  return (
    <div className="my-6 rounded-lg border border-blue-500/30 bg-blue-950/30 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-2">
        Pro tip
      </p>
      <div className="text-gray-300 text-sm [&>p]:m-0">{children}</div>
    </div>
  );
}

function FAQ({
  question,
  children,
}: {
  question: string;
  children: ReactNode;
}) {
  return (
    <details className="group my-4 rounded-lg bg-[#131C31] border border-gray-800">
      <summary className="cursor-pointer list-none px-4 py-3 font-semibold text-white text-sm flex items-center justify-between">
        {question}
        <span className="text-gray-400 group-open:rotate-180 transition-transform">
          &#9662;
        </span>
      </summary>
      <div className="px-4 pb-4 text-gray-300 text-sm [&>p]:m-0">
        {children}
      </div>
    </details>
  );
}

/**
 * Custom MDX components used in blog posts.
 */
export const mdxComponents = {
  BlogCTA,
  Tip,
  FAQ,
  a: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    if (href?.startsWith("/")) {
      return (
        <Link href={href} className="text-blue-400 hover:text-blue-300 underline" {...props}>
          {children}
        </Link>
      );
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 hover:text-blue-300 underline"
        {...props}
      >
        {children}
      </a>
    );
  },
};
