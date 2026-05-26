# LMS Frontend (Next.js + React + Supabase)

This project is a Nursing LMS frontend migrated from Vite/React to Next.js while preserving the existing UI design and React component structure.

## Tech Stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- Supabase (Auth + Postgres)
- CSS Modules + global CSS variables

## Implemented So Far

- Migrated app runtime/build from Vite to Next.js.
- Added catch-all app route (`/[...slug]`) so existing client routes (`/admin`, `/faculty`, `/student`, etc.) keep working.
- Kept current `react-router-dom` routing and dashboard layouts intact to preserve design.
- Updated Supabase env usage to Next public variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Wired admin approval actions to update `profiles.status` (`approved` / `rejected`).
- Added retry/backoff handling for transient profile fetch network timeouts in auth context.
- Replaced placeholder dashboard route pages with reusable module pages.
- Improved dashboard responsiveness for tablet/mobile breakpoints.
- Student dashboard now uses logged-in user data and live enrollment metrics.
- Implemented batch-targeted course discovery + join flow for students.
- Added faculty course creation page with batch targeting support.

## New Batch-Based Course Flow

### Faculty

- Faculty can create a course from `Faculty -> Create Course`.
- While creating, faculty selects one or more batches.
- Course is saved in `courses`, and batch mappings are saved in `course_batches`.

### Student

- Student dashboard reads student batch from `student_profiles.batch_id`.
- Only courses mapped to that batch are shown under `Join Course`.
- Student can join a course directly, which inserts into `enrollments`.
- Notifications panel shows new batch-targeted course availability.

## Database Changes

A new migration was added:

- `supabase/migrations/20260407173000_course_batches.sql`

This migration creates:

- `public.course_batches`
- RLS policies for select/insert/delete based on role and ownership

Run this migration in Supabase SQL Editor (or your migration workflow) before using the batch-targeted join feature.

### Course materials & assignment questions (Coursera-style content)

Migration:

- `supabase/migrations/20260408120000_course_materials_and_assignment_questions.sql`

Creates:

- `public.course_materials` — readings, video/link resources, text lessons (`material_type`: reading, video, link, file).
- `public.assignment_questions` — questions per assignment with types: **mcq** (single correct), **msq** (multiple correct), **short_answer**, **long_answer**; options and correct answers stored as JSONB.

**Faculty UI:** open **My Courses → Manage materials & assignments** on a course. Route: `/faculty/my-courses/:courseId/content`.

**Student UI:** from **My Courses**, use **Open course content** → `/student/courses/:courseId/learn` (materials + assignment list; submission UI can follow).

**Admin UI:** from **Course registry**, **View materials & assignments** → `/admin/courses/:courseId/view` (read-only preview).

Enrolled students can **read** materials and assignment headers per RLS; faculty **owns** create/update/delete for their courses.

## Environment Variables

Set in `.env`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Auth session behavior (why you stay “logged in” on localhost)

Supabase stores the session in the browser (by default `localStorage`). That is **not** automatic login with your password — it **restores** the last session when the app loads. Restarting `npm run dev` does not clear browser storage, so you still look signed in until you **log out** or clear site data for `localhost`.

Optional overrides:

```env
# Set to "false" to stop saving the session in the browser (you must sign in again after every full reload).
NEXT_PUBLIC_SUPABASE_AUTH_PERSIST=false

# Set to "session" to use sessionStorage instead of localStorage (closing the browser tab clears the session).
NEXT_PUBLIC_SUPABASE_AUTH_STORAGE=session
```

Production should keep the default (persisted session) unless you have a specific reason to change it.

### Troubleshooting: `TypeError: Failed to fetch` (Supabase)

That message means the browser could not complete the HTTP request to your Supabase project (network/DNS, VPN, firewall, ad-blockers, or a paused Supabase project). It is not an application routing bug.

The Supabase client is configured to **retry transient network failures** a few times automatically. If errors persist, test in an incognito window (no extensions), confirm `NEXT_PUBLIC_SUPABASE_URL` in `.env`, and check the Supabase dashboard that the project is running.

## Scripts

- `npm run dev` - start local development server
- `npm run build` - create production build
- `npm run start` - run production server
- `npm run lint` - run lint checks

## Notes

- Current routes are served through Next + a catch-all page and then handled by `react-router-dom`.
- Build currently passes successfully with the implemented changes.
