"use client";

import Link from "next/link";

export function BlogCategoryFilter({
  categories,
  activeCategory,
}: {
  categories: string[];
  activeCategory?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2 mt-6">
      <Link
        href="/blog"
        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
          !activeCategory
            ? "bg-blue-600 text-white"
            : "bg-[#131C31] text-gray-400 hover:text-white border border-gray-800"
        }`}
      >
        All
      </Link>
      {categories.map((cat) => (
        <Link
          key={cat}
          href={`/blog?category=${encodeURIComponent(cat)}`}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            activeCategory === cat
              ? "bg-blue-600 text-white"
              : "bg-[#131C31] text-gray-400 hover:text-white border border-gray-800"
          }`}
        >
          {cat}
        </Link>
      ))}
    </div>
  );
}
