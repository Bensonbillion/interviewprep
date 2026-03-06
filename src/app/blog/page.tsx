import type { Metadata } from "next";
import { getAllPosts, getAllCategories } from "@/lib/blog";
import { BlogCard } from "@/components/blog/BlogCard";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/seo/structured-data";
import { BlogCategoryFilter } from "./CategoryFilter";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://salesprep.ai";

export const metadata: Metadata = {
  title: "Sales Interview Prep Blog",
  description:
    "Expert guides, interview questions, and tips for SDR, BDR, and AE candidates. Level up your tech sales interview game.",
  alternates: { canonical: `${BASE_URL}/blog` },
  openGraph: {
    title: "Sales Interview Prep Blog | SalesPrep AI",
    description:
      "Expert guides, interview questions, and tips for tech sales candidates.",
    url: `${BASE_URL}/blog`,
  },
};

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const allPosts = getAllPosts();
  const categories = getAllCategories();

  const filteredPosts = category
    ? allPosts.filter((p) => p.frontmatter.category === category)
    : allPosts;

  const featuredPost = !category
    ? allPosts.find((p) => p.frontmatter.featured)
    : undefined;

  const gridPosts = featuredPost
    ? filteredPosts.filter((p) => p.frontmatter.slug !== featuredPost.frontmatter.slug)
    : filteredPosts;

  const breadcrumbs = [
    { name: "Home", url: BASE_URL },
    { name: "Blog", url: `${BASE_URL}/blog` },
  ];

  return (
    <main className="bg-[#0B1120] min-h-screen text-gray-100">
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />

      <div className="max-w-5xl mx-auto px-5 py-12">
        <h1 className="text-3xl md:text-4xl font-bold text-white">
          Sales Interview Prep Blog
        </h1>
        <p className="text-gray-400 mt-3 max-w-2xl">
          Expert guides, interview questions, and tips to help you land your
          next tech sales role.
        </p>

        {/* Category filters */}
        {categories.length > 0 && (
          <BlogCategoryFilter
            categories={categories}
            activeCategory={category}
          />
        )}

        {/* Featured post */}
        {featuredPost && (
          <div className="mt-8">
            <BlogCard frontmatter={featuredPost.frontmatter} featured />
          </div>
        )}

        {/* Post grid */}
        {gridPosts.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 mt-8">
            {gridPosts.map((post) => (
              <BlogCard
                key={post.frontmatter.slug}
                frontmatter={post.frontmatter}
              />
            ))}
          </div>
        ) : (
          <p className="text-gray-500 mt-12 text-center">
            No posts yet. Check back soon!
          </p>
        )}
      </div>
    </main>
  );
}
