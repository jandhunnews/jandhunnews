# JanDhun News — Next.js frontend

This app is a static-export Next.js frontend designed for the existing GitHub Pages project URL:

`https://jandhunnews.github.io/jandhunnews/`

## Stack

- Next.js App Router + TypeScript
- Static export (no Node server required at runtime)
- Supabase JS client for published news
- GitHub Actions + GitHub Pages deployment

## Local development

1. Copy `.env.example` to `.env.local`.
2. Add the Supabase project URL and the public publishable/anon key.
3. Run:

```bash
npm install
npm run dev
```

## GitHub Pages deployment

1. In repository Settings → Secrets and variables → Actions → Variables, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. In repository Settings → Pages, set Build and deployment source to **GitHub Actions**.
3. Merge this upgrade branch into `main`. The workflow builds `next-site/out` and deploys it to GitHub Pages.

The workflow deliberately uses repository Actions **Variables** for public Supabase configuration. A publishable/anon key is intended for browser use; never put a Supabase service-role key or database password in frontend code or Actions variables.

## Supabase data

The initial page reads only rows where `articles.status = 'published'`. It uses the existing `supabase/schema.sql` table and its Row Level Security policies. The public page does not expose drafts or review items.

## Important hosting boundary

GitHub Pages serves static files only. This project therefore uses Next.js static export and Supabase as the hosted data/auth service. Next.js API routes, server actions, server-side rendering, and private server secrets cannot run on GitHub Pages. Use a separate server host if those become required.

## Rollout

The existing root-level HTML site and CMS are preserved during this migration. The new frontend is built in `next-site/`; the newsroom route temporarily links to the existing CMS. Complete and verify the new MFA-enabled newsroom before retiring the legacy CMS.
