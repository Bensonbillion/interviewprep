import Link from "next/link";
import type { BlogFrontmatter } from "@/lib/blog";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function BlogCard({
  frontmatter,
  featured = false,
}: {
  frontmatter: BlogFrontmatter;
  featured?: boolean;
}) {
  if (featured) {
    return (
      <Link
        href={`/blog/${frontmatter.slug}`}
        className="block bg-[#131C31] rounded-xl border border-gray-800 hover:border-blue-500/40
                   transition-colors overflow-hidden"
      >
        <div className="p-6 md:p-8">
          <span className="text-xs font-medium text-blue-400 uppercase tracking-wider">
            {frontmatter.category}
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-white mt-2 leading-tight">
            {frontmatter.title}
          </h2>
          <p className="text-gray-400 mt-3 leading-relaxed max-w-2xl">
            {frontmatter.description}
          </p>
          <p className="text-gray-500 text-sm mt-4">
            {formatDate(frontmatter.publishedAt)}
          </p>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/blog/${frontmatter.slug}`}
      className="block bg-[#131C31] rounded-xl border border-gray-800 hover:border-blue-500/40
                 transition-colors p-5"
    >
      <span className="text-xs font-medium text-blue-400 uppercase tracking-wider">
        {frontmatter.category}
      </span>
      <h3 className="text-lg font-semibold text-white mt-2 leading-snug">
        {frontmatter.title}
      </h3>
      <p className="text-gray-400 text-sm mt-2 line-clamp-2">
        {frontmatter.description}
      </p>
      <p className="text-gray-500 text-xs mt-3">
        {formatDate(frontmatter.publishedAt)}
      </p>
    </Link>
  );
}
