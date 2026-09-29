# Nordic Getaways

Direct-booking site for two lakeside holiday homes on Stora Härsjön near
Gothenburg (https://nordic-getaways.com), plus self-service signup for other hosts.

- Frontend: Vite + React + TypeScript (`src/`), hosted on Cloudflare Pages.
  `.github/workflows/deploy.yml` runs `bun run build:prerender` and publishes
  `dist/` to the `cf-pages` branch on every push to `main` and nightly.
- Backend: Supabase project `bbuutvozqfzbsnllsiai` (Postgres with RLS, edge
  functions in `supabase/functions/`), Stripe Checkout with Connect.
- Scheduled jobs (pg_cron): calendar sync every 15 min, pre-check-in reminders,
  daily health check (mails support@mojjo.se when something needs a person).

## Develop

```sh
bun install
bun run dev        # http://localhost:8080
bun run test       # unit tests (vitest)
bun run build      # production build
```

Edge functions: `supabase functions deploy <name> --project-ref bbuutvozqfzbsnllsiai --use-api`.
Database changes: add a file `supabase/migrations/<yyyymmddhhmmss>_<name>.sql` and run
`supabase db push --linked` (the migration history matches the database since 2026-09-29).
