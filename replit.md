# Amresh Blood Bank System

_Replace the heading above with the project's name, and this line with one sentence describing what this app does for users._

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API gateway and PHP donor API (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Donor API: PHP 8.2 + PDO PostgreSQL behind the shared Express 5 API gateway
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/amresh-blood-bank` — donor directory and registration frontend
- `artifacts/api-server/php/public/index.php` — PHP API and PostgreSQL queries
- `artifacts/api-server/src/lib/php-backend.ts` — starts the private PHP process
- `lib/api-spec/openapi.yaml` — API contract used to generate frontend hooks
- `lib/db/src/schema/blood-donors.ts` — PostgreSQL donor schema

## Architecture decisions

- Donor records are not seeded with fictional names or contact details.
- A donor's phone number is listed only after they explicitly consent during registration.
- The shared Node API service is a gateway; donor reads, writes, and summary logic execute in PHP.
- The upstream MIT license and copyright notice are retained in `LICENSE`.

## Product

Visitors can search consenting donors by blood group and city; volunteers can register, and live totals update from PostgreSQL.

## User preferences

- Brand the app for Amresh Kumar Yadav.
- Use a PHP backend with an HTML/CSS/JavaScript frontend.

## Gotchas

- Restart `artifacts/api-server: API Server` after changes to the PHP service or its Node gateway.
- Keep `/api/donors` and `/api/dashboard/summary` aligned with the OpenAPI contract.
- Never expose donor contact details without the stored consent flag.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
