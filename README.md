# SIR MV PU College Campus ERP

Campus management for SIR MV PU College: attendance, timetable, exams and board marks, hostel and outpass,
admissions, calendar, leaderboard, notices, and Parent Connect (parent and student voice calls).
Installable as a PWA with push notifications.

## Stack

- Client: React 19, TypeScript, Vite, Tailwind CSS v4 (`client/`)
- Server: Express 5, TypeScript, run with `tsx` (`server/`)
- Database: PostgreSQL (Neon in production), accessed through `server/src/database/pgDb.ts`
- Hosting: Vercel (static client and serverless API)

## Setup

```bash
npm install
cd client && npm install && cd ..
cp .env.example .env        # DATABASE_URL, JWT_SECRET
npx tsx server/src/database/postgres-seed.ts   # demo data
npx tsx server/src/index.ts                    # API on :5000
cd client && npm run dev                       # app on :3000, proxies /api to :5000
```

Demo logins use `@sirmv.edu.in` addresses, for example `admin@sirmv.edu.in` and `parent@sirmv.edu.in`.
The seed password is `Demo@12345`. Change it before real use.

## Client scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server with API proxy |
| `npm run build` | Type-check and production build |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | oxlint (React, TypeScript, jsx-a11y rules) |
| `npm run format` / `format:check` | Prettier |

## Environment variables

Server: `DATABASE_URL`, `JWT_SECRET`, optional VAPID keys for push.

Client build (optional, used for SEO tags): `VITE_SITE_URL` (canonical, og:url, og:image, sitemap.xml and
JSON-LD are emitted only when this is set), `VITE_ORG_PHONE`, `VITE_ORG_ADDRESS`,
`VITE_ORG_SOCIAL` (comma-separated profile URLs).

## Structure

```
client/src
  academic/     role-based screens (students, staff, exams, hostel, parent connect)
  components/   shared UI (navbar, sidebar, call overlay, error boundaries)
  context/      auth and call state
  pages/        standalone pages and modules
  services/     API clients
  utils/        helpers (rbac, portraits, effects)
  sw.ts         service worker (precache, push, image cache)
server/src
  routes/       REST endpoints (Parent Connect is /api/parent-connect)
  middleware/   JWT auth and role checks
  database/     Postgres helpers, schema and seed
*.sql           optional schema patches, safe to re-run
```

## Deployment

Push to `main`; Vercel builds `client/` and serves `/api` from `server/`. After changing schema, run the
matching `*.sql` file against the Neon database. Parent Connect creates its own tables on first use.
