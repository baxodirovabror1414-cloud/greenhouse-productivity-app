# Forest Greenhouse

A React app scaffolded for Vite with Supabase persistence.

## What was added

- `supabaseClient.js` for Supabase client setup using environment variables
- `ForestGreenhouse.jsx` updated to load/save app state from Supabase
- `package.json` with React, Vite, Lucide, Recharts, and Supabase dependencies
- `index.html`, `src/main.jsx`, and `src/index.css` for a minimal Vite app entry
- `.gitignore` and `.env.example`

## Environment variables

Set these in Vercel or in a local `.env` file (not committed):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Supabase table schema

Run this SQL in Supabase to create the state table:

```sql
create table forest_greenhouse_states (
  client_id text primary key,
  state jsonb not null,
  updated_at timestamptz default now()
);
```

## Local setup

On a system with Node.js installed:

```bash
cd "c:\Users\Abror\Downloads"
npm install
npm run dev
```

## Git / GitHub

After installing Git, initialize the repo and make the first commit:

```bash
git init
git add .
git commit -m "Initial commit: Forest Greenhouse with Supabase persistence"
```

Then add your GitHub remote and push:

```bash
git remote add origin https://github.com/<your-user>/<your-repo>.git
git branch -M main
git push -u origin main
```

## Vercel

- Create a new Vercel project from the GitHub repo
- Add the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars
- Deploy
