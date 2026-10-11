# .ai/ARCHITECTURE.md

This document describes the actual architecture of the repository as verified from code, not as assumed from dependencies or product rumors.

## High-level shape
- Next.js App Router application
- TypeScript
- Tailwind CSS for styling
- Supabase for authentication and data
- Client-side Supabase browser client for data access
- Google Maps used by opening URLs from the browser, not through a server-side map service

## Routing and page structure
### Root layout
- `src/app/layout.tsx`
  - Sets site metadata with title `DropWay` and a Thai description
  - Loads the `Inter` font
  - Imports global styles from `src/app/globals.css`
  - Renders `Navbar` on every page
  - Renders `Toaster` from `react-hot-toast` with custom styling

### Pages
- `src/app/page.tsx`
  - Redirects to `/houses`
- `src/app/login/page.tsx`
  - Email/password login form
  - Uses `supabase.auth.signInWithPassword`
  - On success, shows a toast and navigates to `/houses`
- `src/app/register/page.tsx`
  - Email/password registration form
  - Uses `supabase.auth.signUp`
  - Sends `emailRedirectTo` to `/houses`
- `src/app/houses/page.tsx`
  - House catalog page
  - Loads `houses` table data
  - Supports search, filtering, pagination, add, edit, delete, CSV download, and map actions
- `src/app/navigation/page.tsx`
  - Navigation/driver workflow page
  - Loads `navigation_view`
  - Works with `user_navigation_houses` for user-specific delivery records

### Middleware
- `middleware.ts`
  - Defines public paths: `/`, `/login`, `/register`
  - For other paths, checks for `sb-access-token` and `sb-refresh-token` cookies
  - Redirects to `/login` if either cookie is missing
  - Configured with a matcher that excludes `api`, `_next/static`, `_next/image`, and `favicon.ico`

## Authentication and session flow
### Browser Supabase client
- `src/lib/supabase.ts` creates the browser Supabase client from:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

This is the client used by the UI pages for auth and data operations.

### Session protection layers
1. Edge/middleware layer
   - `middleware.ts` checks cookies before rendering protected routes
2. Client layer
   - `houses/page.tsx` and `navigation/page.tsx` call `supabase.auth.getSession()` and redirect to `/login` if no session is found

This means session validity is enforced both at the edge and inside the protected pages.

## Authorization and data ownership
### Houses
- `houses/page.tsx` directly creates and updates `houses` rows through the browser Supabase client.
- Deletion and updates are performed by matching `houses.id`.
- The current code does not show an explicit owner check in the UI layer beyond Supabase Auth session presence. Any stronger row-level ownership rules would need to be enforced in Supabase RLS policies or backend logic.

### Navigation
- The navigation workflow centers on `user_navigation_houses`, which appears to be the user-scoped table for delivery records.
- `navigation/page.tsx`:
  - Reads from `navigation_view`
  - Updates `user_navigation_houses` for driver notes and delivery actions
  - Deletes from `user_navigation_houses` when removing houses from navigation
- The `NavigationHouse` type includes `user_id` and `house_id`, which indicates user-scoped navigation rows.

### Important caution
- The current documentation can confirm that auth and user-scoped navigation records exist.
- It cannot confirm every ownership or RLS rule without inspecting Supabase policies, migrations, or any server-side code in this repo.
- Do not assume RLS is correctly configured just because the app uses Supabase. Verify policies when ownership or data isolation matters.

## Supabase integration and database operations
### Tables and views referenced
- `houses`
- `navigation_view`
- `user_navigation_houses`

### Common operation patterns
- Paginated range reads using `.range()` with large page sizes
- Insert into `houses`
- Update `houses` by `id`
- Delete `houses` by `id`
- Insert into `user_navigation_houses` with `house_id`
- Update `user_navigation_houses` by `id`
- Delete from `user_navigation_houses` by `id` or by `id in (...)`
- CSV export of `houses` via `supabase.from("houses").select(...)` followed by Papa Parse unparse

### Current Supabase client type
- The app uses the browser client from `@supabase/ssr`.
- There is no visible server-only Supabase server client or route handler API layer in the inspected tree.

## Important components and utilities
### Shared components
- `src/components/Navbar.tsx`
  - Global navigation bar rendered in the root layout

### Type definitions
- `src/types/house.ts`
  - `House` type matching `houses` fields
- `src/types/navigation.ts`
  - `NavigationHouse` type describing the navigation workflow shape

### UI utilities and patterns
- `react-hot-toast` for toast notifications
- `lucide-react` icons
- Custom address input helpers in both houses and navigation pages
- Client-side geolocation usage in the navigation page and house editing modal
- Google Maps URL construction for navigation and coordinate checking
- Haversine distance calculation and nearest-neighbor route ordering in the navigation page

## External integrations
### Supabase
- Authentication
- Data storage for `houses` and navigation-related tables/views

### Google Maps
- Navigation route launching
- Coordinate verification via map URLs

### CSV
- CSV export of house catalog data

### No verified server-side third-party services
- There is no verified evidence in the inspected files of other external API backends, payment integrations, email providers, or scheduled jobs.
- If such integrations exist, they should be verified before documenting them here.

## Environment configuration
### Verified environment variables
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

These are the environment variables used by the browser Supabase client in `src/lib/supabase.ts`.

### Config files
- `next.config.mjs`
  - Currently exports an empty `nextConfig` object
- `tsconfig.json`
  - Uses bundler module resolution
  - Includes path alias `@/*` mapped to `src/*`
- `tailwind.config.ts`
  - Scans `src/pages`, `src/components`, and `src/app`
  - Extends colors with `background` and `foreground` CSS variables
- `postcss.config.mjs`
  - Uses `tailwindcss` plugin
- `.eslintrc.json`
  - Extends `next/core-web-vitals` and `next/typescript`

## Deployment and build flow
### Build and run scripts
From `package.json`:
- `dev`: `next dev`
- `build`: `next build`
- `start`: `next start`
- `lint`: `next lint`

### Static/SSR assumptions
- This is a standard Next.js App Router application.
- The exact rendering strategy for each route should be confirmed from the route files and any relevant config.
- Since `next.config.mjs` currently contains no custom configuration, the app is built with Next.js defaults.

## Data flow summary
1. User opens a route
2. Middleware checks auth cookies for protected routes
3. Protected pages also confirm session client-side
4. Pages load data from Supabase through the browser client
5. User actions mutate `houses` or `user_navigation_houses`
6. UI reflects results through React state and toasts
7. Navigation features use geolocation and Google Maps URLs for routing assistance
