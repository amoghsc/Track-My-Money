# Track My Money

Shared expense & income tracker (Spendee-style PWA) for two people, backed by Supabase.

- `npm run dev` — local dev server
- `npm run build` — production build to `dist/`
- Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`.

`.env` contains only the Supabase *publishable* key; data access is enforced by row-level security on the `xp_*` tables.
