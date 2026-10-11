# .ai/PROJECT_CONTEXT.md

This document records the verified context of the repository. It deliberately separates what is verified from what is only assumed, planned, or not yet confirmed.

## Verified identity
- Repository URL: `https://github.com/MnsEn2001/drop-way.git`
- Default branch: `main`
- Package name in `package.json`: `dropway-final`
- This is a Next.js application using the App Router.

## Verified stack
- Framework: Next.js `14.2.15`
- Language: TypeScript
- Styling: Tailwind CSS `3.4.1`, with PostCSS
- Backend/data access: Supabase client libraries `@supabase/supabase-js` and `@supabase/ssr`
- Auth pattern: Supabase Auth with cookie-based session checks in middleware
- Icons: `lucide-react`
- Toast notifications: `react-hot-toast`
- CSV handling: `papaparse`, `csv-parse`, `csv-stringify`
- QR/code utilities present in dependencies: `html5-qrcode`, `tesseract.js`

These dependencies are verified from `package.json`. Whether every dependency is actively used in the current code is a separate question and should be checked per file.

## Verified app structure
Root files:
- `middleware.ts`
- `next.config.mjs`
- `package.json`
- `postcss.config.mjs`
- `tailwind.config.ts`
- `tsconfig.json`
- `.eslintrc.json`
- `.gitignore`
- `README.md`

Source tree:
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/login/page.tsx`
- `src/app/register/page.tsx`
- `src/app/houses/page.tsx`
- `src/app/navigation/page.tsx`
- `src/components/Navbar.tsx`
- `src/lib/supabase.ts`
- `src/types/house.ts`
- `src/types/navigation.ts`
- `src/app/globals.css`
- `src/app/fonts/*`
- `src/app/favicon.ico`

There is no `src/app/api` routing tree visible in the repository at the time of inspection.

## Verified routes
- `/` redirects to `/houses` via `src/app/page.tsx`
- `/login` is the login page
- `/register` is the registration page
- `/houses` is the house catalog page
- `/navigation` is the navigation/driver workflow page

Public paths allowed without authentication in `middleware.ts`:
- `/`
- `/login`
- `/register`

All other paths require Supabase cookie session tokens according to `middleware.ts`.

## Verified authentication and session flow
- The browser Supabase client is created in `src/lib/supabase.ts` using:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `middleware.ts` checks for `sb-access-token` and `sb-refresh-token` cookies and redirects to `/login` when they are missing.
- The protected pages `houses/page.tsx` and `navigation/page.tsx` also check the Supabase session client-side and redirect to `/login` if no session is present.

So session protection is implemented in two places:
- Edge/middleware cookie check
- Client-side session check inside the protected pages

## Verified data model
### `houses`
The `House` type in `src/types/house.ts` represents rows in the `houses` table with these fields:
- `id`
- `full_name`
- `phone`
- `address`
- `lat`
- `lng`
- `note`
- `quantity`
- `created_at`
- `updated_at`

`houses/page.tsx` reads and writes the `houses` table directly through the Supabase browser client.

### `navigation_view` and `user_navigation_houses`
The navigation page uses:
- `navigation_view` for querying navigation list data
- `user_navigation_houses` for user-specific delivery status, notes, comments, and deletions

The `NavigationHouse` type in `src/types/navigation.ts` documents the fields used by the navigation workflow, including:
- `nav_id`
- `user_id`
- `house_id`
- `nav_note`
- `nav_priority`
- joined house fields
- delivery status fields
- `driver_note`
- call-tracking fields that appear to be planned or partially used

## Verified functionality
- User registration and login via Supabase Auth email/password
- Protected route gating through middleware and client-side session checks
- House catalog with search, filtering, pagination, add/edit/delete, CSV download, and geolocation helper actions
- Navigation workflow with:
  - loading and filtering navigation houses
  - GPS-based current position or fixed start position
  - sorting by road-ordered nearest-neighbor route or straight-line distance
  - delivery status handling for pending, delivered, QR-pending, and reported items
  - driver notes and comment editing on `user_navigation_houses`
  - removal of houses from the user's navigation list
  - Google Maps route launching for navigation
  - address input helpers for Thai administrative location formatting

## Partially implemented or unclear
- Some parts of the navigation page are large and may contain unfinished UI or unreachable code paths. This should be confirmed by inspecting the file end-to-end.
- The `call_count` and `call_note` fields in `NavigationHouse` suggest planned call-tracking behavior, but whether those features are actively wired in the UI should be verified rather than assumed.
- The repository may include further intended features not yet fully implemented. Those should be recorded as "planned or unverified" until confirmed.

## Planned but not implemented
- This documentation system itself is being created now.
- Any feature that is not visible in the current source tree should be treated as not verified.

## Unknown or not yet verified
- Full intended product specification beyond what the UI and code currently show
- Whether there are additional backend-only routes, migrations, or Supabase Edge functions not visible in this checkout
- Whether any scheduled jobs, webhooks, or external provider integrations exist beyond the Supabase and Google Maps usage already visible
- Complete test strategy, since no test files were found in the inspected tree

## Important dependencies and integrations
- Supabase is the main external service for auth and data.
- Google Maps URLs are used for navigation and coordinate verification. This is a client-side integration through URL opening.
- CSV export is a verified feature on the houses page.

## Environment variables that are relevant
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

These variable names are documented because they are part of the verified Supabase browser client setup in `src/lib/supabase.ts`. Values must not be stored or shared in this documentation.

## Local development entry points
- Development server: `next dev`
- Build: `next build`
- Start: `next start`
- Lint: `next lint`

These scripts are taken from `package.json`. There were no test scripts found in `package.json` at the time of inspection.

## Conventions observed
- Thai-language UI strings are used throughout the app
- Tailwind utility classes are used directly in components
- `lucide-react` icons are used extensively
- `react-hot-toast` is configured in the root layout with custom per-toast styles
- Address input helpers reflect local Thai administrative structure (village, subdistrict, district, province)
