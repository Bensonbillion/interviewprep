import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePrettyCode from "rehype-pretty-code";
import {
  getAllPosts,
  getPostBySlug,
  getRelatedPosts,
  extractHeadings,
} from "@/lib/blog";
import { mdxComponents } from "@/components/blog/MDXComponents";
import { TableOfContents } from "@/components/blog/TableOfContents";
import { BlogCard } from "@/components/blog/BlogCard";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  breadcrumbSchema,
  faqPageSchema,
  type FAQItem,
} from "@/lib/seo/structured-data";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://salesprep.ai";

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.frontmatter.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  const { frontmatter: fm } = post;
  const url = `${BASE_URL}/blog/${fm.slug}`;

  return {
    title: fm.title,
    description: fm.description,
    alternates: { canonical: url },
    openGraph: {
      title: fm.title,
      description: fm.description,
      url,
      type: "article",
      publishedTime: fm.publishedAt,
      modifiedTime: fm.updatedAt,
      authors: [fm.author],
      tags: fm.tags,
      images: [
        {
          url: `/og?title=${encodeURIComponent(fm.title)}&subtitle=${encodeURIComponent(fm.category)}`,
          width: 1200,
          height: 630,
        },
      ],
    },
  };
}

/**
 * Extract FAQ items from MDX content that uses <FAQ question="..."> components.
 */
function extractFAQs(content: string): FAQItem[] {
  const faqRegex = /<FAQ\s+question="([^"]+)">\s*([\s\S]*?)\s*<\/FAQ>/g;
  const faqs: FAQItem[] = [];
  let match;
  while ((match = faqRegex.exec(content)) !== null) {
    faqs.push({ question: match[1], answer: match[2].trim() });
  }
  return faqs;
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const { frontmatter: fm, content } = post;
  const headings = extractHeadings(content);
  const related = getRelatedPosts(fm.slug, 3);
  const faqs = extractFAQs(content);

  const breadcrumbs = [
    { name: "Home", url: BASE_URL },
    { name: "Blog", url: `${BASE_URL}/blog` },
    { name: fm.title, url: `${BASE_URL}/blog/${fm.slug}` },
  ];

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: fm.title,
    description: fm.description,
    datePublished: fm.publishedAt,
    dateModified: fm.updatedAt,
    author: { "@type": "Organization", name: fm.author },
    publisher: {
      "@type": "Organization",
      name: "SalesPrep AI",
      url: BASE_URL,
    },
    mainEntityOfPage: `${BASE_URL}/blog/${fm.slug}`,
  };

  return (
    <main className="bg-[#0B1120] min-h-screen text-gray-100">
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <JsonLd data={articleSchema} />
      {faqs.length > 0 && <JsonLd data={faqPageSchema(faqs)} />}

      <article className="max-w-3xl mx-auto px-5 py-12">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-sm text-gray-400">
            <li>
              <Link href="/" className="hover:text-white transition-colors">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/blog" className="hover:text-white transition-colors">
                Blog
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-gray-200 truncate" aria-current="page">
              {fm.title}
            </li>
          </ol>
        </nav>

        {/* Header */}
        <header className="mt-8">
          <span className="text-xs font-medium text-blue-400 uppercase tracking-wider">
            {fm.category}
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-white mt-2 leading-tight">
            {fm.title}
          </h1>
          <p className="text-gray-400 mt-3">{fm.description}</p>
          <div className="flex items-center gap-3 mt-4 text-sm text-gray-500">
            <span>{fm.author}</span>
            <span>&middot;</span>
            <time dateTime={fm.publishedAt}>
              {new Date(fm.publishedAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </time>
          </div>
        </header>

        {/* Table of contents */}
        <TableOfContents headings={headings} />

        {/* MDX Content */}
        <div
          className="prose prose-invert prose-blue max-w-none mt-8
                     prose-headings:text-white prose-headings:font-bold
                     prose-p:text-gray-300 prose-p:leading-relaxed
                     prose-li:text-gray-300 prose-strong:text-white
                     prose-code:text-blue-300 prose-code:bg-[#131C31] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                     prose-pre:bg-[#0d1425] prose-pre:border prose-pre:border-gray-800
                     prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
                     prose-blockquote:border-blue-500 prose-blockquote:text-gray-400
                     prose-hr:border-gray-800"
        >
          <MDXRemote
            source={content}
            components={mdxComponents}
            options={{
              mdxOptions: {
                rehypePlugins: [
                  rehypeSlug,
                  [rehypeAutolinkHeadings, { behavior: "wrap" }],
                  [rehypePrettyCode, { theme: "github-dark-dimmed", keepBackground: false }],
                ],
              },
            }}
          />
        </div>

        {/* End CTA */}
        <div className="mt-12 bg-gradient-to-br from-[#1E3A5F] to-[#4A7AFF] rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white">
            Ready to ace your interview?
          </h2>
          <p className="text-blue-200 mt-2">
            Get a personalized prep kit with answers tailored to your target
            company. Takes 5 minutes.
          </p>
          <Link
            href="/get-started"
            className="inline-block mt-6 bg-white text-[#1E3A5F] hover:bg-blue-50
                       font-semibold px-8 py-3 rounded-full text-lg
                       shadow-[0_4px_20px_rgba(0,0,0,0.15)] transition-all duration-200"
          >
            Create your free prep kit &rarr;
          </Link>
        </div>

        {/* Tags */}
        {fm.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-8">
            {fm.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs bg-[#131C31] text-gray-400 px-3 py-1 rounded-full border border-gray-800"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </article>

      {/* Related posts */}
      {related.length > 0 && (
        <section className="max-w-5xl mx-auto px-5 pb-16">
          <h2 className="text-xl font-bold text-white mb-6">
            Related articles
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <BlogCard key={r.frontmatter.slug} frontmatter={r.frontmatter} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
