-- Programmatic SEO pages for company x role landing pages
create table company_seo_pages (
  id uuid primary key default gen_random_uuid(),

  -- URL structure
  company_slug text not null,
  role_slug text not null,

  -- Display info
  company_name text not null,
  role_title text not null,

  -- SEO meta
  meta_title text not null,
  meta_description text not null,
  h1_title text not null,

  -- Page content (structured)
  company_overview text not null,
  interview_process jsonb,
  questions jsonb not null,
  preparation_tips text[],
  company_values text[],
  salary_data jsonb,

  -- FAQ for schema markup
  faqs jsonb,

  -- Status
  is_published boolean default false,

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique(company_slug, role_slug)
);

create index idx_seo_pages_published
  on company_seo_pages(is_published) where is_published = true;

-- Allow public read access for published pages (no auth required)
alter table company_seo_pages enable row level security;

create policy "Published pages are publicly readable"
  on company_seo_pages for select
  using (is_published = true);

create policy "Service role full access"
  on company_seo_pages for all
  using (true)
  with check (true);
