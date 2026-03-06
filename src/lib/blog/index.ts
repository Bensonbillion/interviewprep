import fs from "fs";
import path from "path";
import matter from "gray-matter";

const BLOG_DIR = path.join(process.cwd(), "src/content/blog");

export interface BlogFrontmatter {
  title: string;
  description: string;
  slug: string;
  publishedAt: string;
  updatedAt: string;
  author: string;
  category: string;
  tags: string[];
  featured: boolean;
}

export interface BlogPost {
  frontmatter: BlogFrontmatter;
  content: string;
}

export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(BLOG_DIR)) return [];

  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith(".mdx"));

  const posts = files
    .map((file) => {
      const raw = fs.readFileSync(path.join(BLOG_DIR, file), "utf-8");
      const { data, content } = matter(raw);
      return { frontmatter: data as BlogFrontmatter, content };
    })
    .sort(
      (a, b) =>
        new Date(b.frontmatter.publishedAt).getTime() -
        new Date(a.frontmatter.publishedAt).getTime(),
    );

  return posts;
}

export function getPostBySlug(slug: string): BlogPost | null {
  const posts = getAllPosts();
  return posts.find((p) => p.frontmatter.slug === slug) ?? null;
}

export function getPostsByCategory(category: string): BlogPost[] {
  return getAllPosts().filter((p) => p.frontmatter.category === category);
}

export function getAllCategories(): string[] {
  const posts = getAllPosts();
  return [...new Set(posts.map((p) => p.frontmatter.category))];
}

export function getRelatedPosts(
  currentSlug: string,
  limit = 3,
): BlogPost[] {
  const all = getAllPosts();
  const current = all.find((p) => p.frontmatter.slug === currentSlug);
  if (!current) return all.slice(0, limit);

  // Score by shared tags, then same category
  const scored = all
    .filter((p) => p.frontmatter.slug !== currentSlug)
    .map((p) => {
      const sharedTags = p.frontmatter.tags.filter((t) =>
        current.frontmatter.tags.includes(t),
      ).length;
      const sameCategory = p.frontmatter.category === current.frontmatter.category ? 2 : 0;
      return { post: p, score: sharedTags + sameCategory };
    })
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((s) => s.post);
}

/**
 * Extract headings from MDX content for table of contents.
 */
export function extractHeadings(
  content: string,
): { text: string; id: string; level: number }[] {
  const headingRegex = /^(#{2,3})\s+(.+)$/gm;
  const headings: { text: string; id: string; level: number }[] = [];
  let match;

  while ((match = headingRegex.exec(content)) !== null) {
    const text = match[2].trim();
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");
    headings.push({ text, id, level: match[1].length });
  }

  return headings;
}
