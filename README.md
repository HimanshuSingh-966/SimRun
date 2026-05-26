# SimRun

This project is the **SimRun** Nursing Learning Management System (LMS) frontend, built with Next.js and React. It serves as the primary user interface for students, faculty, and administrators. The application was recently migrated from Vite/React to Next.js, preserving the existing UI design and React component structure while leveraging Next.js for improved performance and routing.

## 🚀 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Library**: React 19 + TypeScript
- **Backend & Auth**: Supabase (Auth + PostgreSQL)
- **Styling**: CSS Modules + Global CSS variables
- **Routing**: Client-side routing with `react-router-dom` (maintained for design preservation)

## ✨ Features Implemented

- **Next.js Migration**: Seamlessly transitioned app runtime and build processes from Vite to Next.js.
- **Hybrid Routing**: Implemented a catch-all app route (`/[...slug]`) to keep existing client routes (`/admin`, `/faculty`, `/student`, etc.) fully functional.
- **Preserved Design**: Maintained the current `react-router-dom` routing and dashboard layouts to preserve the original design.
- **Supabase Integration**: Updated Supabase environment variable usage to Next.js public variables.
- **Admin Capabilities**: Wired admin approval actions to update user statuses (`profiles.status`: `approved` / `rejected`).
- **Resilience**: Added retry/backoff handling for transient profile fetch network timeouts within the auth context.
- **Responsive Dashboard**: Replaced placeholder dashboard routes with reusable module pages and improved responsiveness for tablet and mobile breakpoints.
- **Student Dashboard**: Now utilizes logged-in user data and displays live enrollment metrics.
- **Course Flow**: 
  - **Faculty**: Faculty members can create batch-targeted courses (`Faculty -> Create Course`). Course mappings are securely saved in the database.
  - **Students**: Batch-targeted course discovery and joining flow implemented. Students only see and join courses mapped to their specific batch. Notifications panel alerts students to newly available courses.

## 🗄️ Database Changes & Migrations

To support the new features, specific database migrations have been added. Ensure you run these in your Supabase SQL Editor or migration workflow.

### 1. Course Batches
**Migration File**: `supabase/migrations/20260407173000_course_batches.sql`
- Creates the `public.course_batches` table.
- Implements Row Level Security (RLS) policies for secure select/insert/delete operations based on user role and ownership.

### 2. Course Materials & Assignments
**Migration File**: `supabase/migrations/20260408120000_course_materials_and_assignment_questions.sql`
- Creates `public.course_materials` (supports readings, video/link resources, and text lessons).
- Creates `public.assignment_questions` (supports MCQ, MSQ, short answer, and long answer formats).

#### Content Access Flows:
- **Faculty UI**: `My Courses -> Manage materials & assignments` (`/faculty/my-courses/:courseId/content`). Faculty own the create/update/delete rights for their courses.
- **Student UI**: `My Courses -> Open course content` (`/student/courses/:courseId/learn`). Students have read access based on enrollment RLS.
- **Admin UI**: `Course registry -> View materials & assignments` (`/admin/courses/:courseId/view`). Admins have read-only preview access.

## ⚙️ Environment Variables

Create a `.env` file in the root directory and configure the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Auth Session Behavior
Supabase stores the session in the browser (defaulting to `localStorage`). This restores the last session upon app load. Restarting the dev server (`npm run dev`) does not clear browser storage.

**Optional Overrides:**
```env
# Set to "false" to require sign-in after every full reload.
NEXT_PUBLIC_SUPABASE_AUTH_PERSIST=false

# Set to "session" to use sessionStorage (clears session when browser tab closes).
NEXT_PUBLIC_SUPABASE_AUTH_STORAGE=session
```
*Note: Production should generally keep the default persisted session.*

## 🛠️ Scripts

- `npm run dev` - Start local development server
- `npm run build` - Create a production build
- `npm run start` - Run the production server
- `npm run lint` - Run ESLint checks
- `npm run preview` - Preview the production build locally

## 🚀 Deployment (Vercel)

The easiest way to deploy this Next.js application is through [Vercel](https://vercel.com/):

1. **Push your code** to a Git repository (GitHub, GitLab, or Bitbucket).
2. **Log in to Vercel** and click **"Add New Project"**.
3. **Import your repository**.
4. **Configure Environment Variables**: In the Vercel dashboard deployment settings, add the following variables (matching your `.env` file):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. **Deploy**: Click "Deploy". Vercel will automatically detect that it's a Next.js app and build it.

*Note: Since Vercel automatically detects Next.js, no custom build commands are needed.*

## 🐛 Troubleshooting

### `TypeError: Failed to fetch` (Supabase)
This error indicates a network failure when connecting to your Supabase project (e.g., DNS issues, VPN, firewall, ad-blockers, or a paused project), not an application routing bug.

**Resolution Steps**:
1. The client auto-retries transient failures. If it persists, test in an incognito window without extensions.
2. Verify `NEXT_PUBLIC_SUPABASE_URL` in your `.env` file.
3. Check the Supabase dashboard to ensure your project is active and running.

## 📝 Notes

- Current routes are primarily served through Next.js via a catch-all page, which hands over routing logic to `react-router-dom` for client-side navigation.
- The build process passes successfully with all implemented changes.
