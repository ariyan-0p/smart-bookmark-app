# SmartMark – Smart Bookmark App

A full-stack bookmark manager built with Next.js, Supabase, and Tailwind CSS.

🔗 **Live URL:** https://smart-bookmark-app-nine-jade.vercel.app

---

## Features

- Google OAuth login (no email/password)
- Add bookmarks with title, URL, and category
- Bookmarks are private to each user
- Real-time updates across tabs without page refresh
- Delete bookmarks with a confirmation modal
- Fully deployed on Vercel

---

## Tech Stack

- **Next.js 15** (App Router)
- **Supabase** (Auth, PostgreSQL Database, Realtime)
- **Tailwind CSS v4**
- **Vercel** (Deployment)

---

## Problems I Ran Into & How I Solved Them

### 1. Tailwind CSS v4 Compatibility
My project was using Tailwind v4 but the config was written for v3. In v4, `tailwind.config.ts` is no longer used and `@tailwind base/components/utilities` is replaced with `@import "tailwindcss"`. I rewrote `globals.css` using the v4 `@import` and `@theme {}` syntax and deleted the old config file.

### 2. CSS `@import` Must Come First
I placed the Google Fonts `@import` after the `@tailwind` directives, which caused a CSS parse error in Turbopack. The fix was to move `@import` to the very top of the file. Later I switched to `next/font/google` entirely which is the proper Next.js way and avoids the issue completely.

### 3. Arbitrary Font Classes Breaking with Turbopack
Using `font-[family-name:var(--font-syne)]` as a Tailwind arbitrary value caused styles to not apply with Turbopack. I registered the fonts properly in `tailwind.config.ts` as `font-syne` and `font-body` utility classes instead.

### 4. Real-Time Updates Not Working
The initial version used Next.js server actions with `revalidatePath()` which requires a full page reload. To meet the real-time requirement, I switched to a client component using Supabase's `postgres_changes` subscription. I also ran `ALTER TABLE bookmarks REPLICA IDENTITY FULL` so DELETE events carry the full row data for the other tab to identify which bookmark to remove.

### 5. Vercel Deployment Failing
The build failed on Vercel with `@supabase/ssr: Your project's URL and API key are required`. The fix was adding `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to Vercel's Environment Variables settings and redeploying.

### 6. OAuth Redirecting to Localhost After Deployment
After deploying, Google login was redirecting back to `localhost:3000` instead of the live Vercel URL. I fixed this by updating the **Site URL** and **Redirect URLs** in Supabase → Authentication → URL Configuration to point to the Vercel domain, and adding the Supabase callback URL to Google Cloud Console's authorized redirect URIs.

---

## Setup Instructions

### 1. Clone the repo
```bash
git clone https://github.com/your-username/smart-bookmark-app.git
cd smart-bookmark-app
npm install
```

### 2. Set up Supabase
Create a project at [supabase.com](https://supabase.com) and run this SQL:

```sql
create table bookmarks (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  user_id uuid references auth.users(id) on delete cascade not null,
  url text not null,
  title text,
  category text default 'General'
);

alter table bookmarks enable row level security;

create policy "Users can manage their own bookmarks"
  on bookmarks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter publication supabase_realtime add table bookmarks;
alter table bookmarks replica identity full;
```

### 3. Add environment variables
Create a `.env.local` file:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run locally
```bash
npm run dev
```

---

## Database Schema

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| created_at | timestamptz | Timestamp |
| user_id | uuid | References auth.users |
| url | text | Bookmark URL |
| title | text | Bookmark name |
| category | text | General / Dev / Design / Personal |
