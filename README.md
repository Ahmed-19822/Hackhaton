# MaintainIQ — Track B (Batch 18)

AI-powered QR Maintenance & Asset History Platform, built with **React (JSX) + Vite**, **react-router-dom**, and **Supabase**.

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run the whole `supabase_schema.sql` file from this folder.
3. Go to **Project Settings → API** and copy your **Project URL** and **anon public key**.

## 2. Configure the app

```bash
cp .env.example .env
```

Fill in `.env`:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

## 3. Run it

```bash
npm i
npm run dev
```

Open the printed local URL (default `http://localhost:5173`).

## 4. Create your first admin account

1. Go to `/signup`, create an account, and pick **Administrator** as the role.
2. If email confirmation is enabled in your Supabase Auth settings, confirm the email, then sign in at `/login`.
3. Create technician accounts the same way (role: **Technician**) — assign them to assets/issues from the app.

## Routes

| Route | Access | Purpose |
|---|---|---|
| `/login`, `/signup` | Public | Staff auth |
| `/dashboard` | Staff | Summary cards + recent issues |
| `/assets` | Staff | Search, filter, register assets |
| `/assets/:id` | Staff | Edit asset, QR code, assign technician, history |
| `/issues/:id` | Staff | Assignment, status workflow, maintenance records |
| `/asset/:code` | Public (QR target) | Safe asset info + "Report an issue" |
| `/report/:code` | Public | Issue reporting form with rule-based AI triage review |

## AI Issue Triage

`src/lib/aiTriage.js` implements a **rule-based classifier** (keyword matching → category, priority, possible causes, initial checks) — no API key needed, nothing to leak. This satisfies the brief's allowance for Track B: *"a rule-based issue classifier is acceptable."*

To upgrade to real GenAI later: replace the body of `triageComplaint()` with a call to a **Supabase Edge Function** that holds your AI provider key server-side — never put it in this frontend's `.env`.

## Notes

- Row Level Security is enabled on every table (see `supabase_schema.sql`). Public visitors can only read via `public_asset_view` / `public_issue_status_view` and insert into `issues`.
- Asset status auto-syncs when issue status changes (trigger-driven), and every meaningful action writes an `asset_history` row automatically.
- An issue cannot be marked `Resolved` without at least one maintenance record (enforced by a DB trigger, not just the UI).
