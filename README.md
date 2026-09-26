# CreatorConnect — Creator–Brand Marketplace

Hyderabad-first marketplace connecting brands with creators for paid and
barter collaborations. Next.js (App Router, TypeScript) + Tailwind +
PostgreSQL/Prisma + NextAuth.

## Documentation

Start here before writing backend or frontend code against this project:

- [`docs/database-schema.md`](docs/database-schema.md) — every entity, field,
  type, constraint and index
- [`docs/api.md`](docs/api.md) — REST endpoint contract (method, auth,
  request/response) for the MVP
- [`docs/architecture.md`](docs/architecture.md) — stack, auth model, ER
  diagram, and the assumptions/decisions behind the schema

`prisma/schema.prisma` is the authoritative source for the data model; the
docs above describe it in prose and should never disagree with it.

## Local setup

1. Copy the env template and fill in your own values:
   ```bash
   cp .env.example .env
   ```
   - `DATABASE_URL`: your PostgreSQL connection string
   - `NEXTAUTH_SECRET`: generate with `npx auth secret` or `openssl rand -base64 32`

2. Install dependencies:
   ```bash
   npm install
   ```

3. Generate the Prisma client and run migrations against your database:
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```

4. Start the dev server:
   ```bash
   npm run dev
   ```
   App runs at http://localhost:3000.

## Project status

Day 0: project scaffold, auth (signup/login/session/role-based route
protection).
Day 1: full Prisma schema (Users, Creators, Brands, Social Accounts,
Campaigns, Applications, Invitations, Deliverables, Payments, Verification)
and API documentation — **schema and docs only, API routes for these
entities are not implemented yet.** See `docs/` for what's built vs. planned.
