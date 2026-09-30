# Amresh Blood Bank System

A responsive donor directory branded for **Amresh Kumar Yadav**. Donors can register with explicit consent to share their phone number, and visitors can search the live directory by blood group and city.

## Features

- Donor registration with server-side validation and contact-sharing consent
- Blood group, city, and availability search
- Live directory totals and blood-group coverage
- PostgreSQL persistence through a PHP/PDO backend
- Responsive frontend with HTML-rendered React, CSS, and JavaScript

## Stack

- Frontend: React, Vite, HTML, CSS, JavaScript
- API: PHP 8.2 with PDO PostgreSQL
- Database: PostgreSQL; the schema is managed by Drizzle
- API gateway: the workspace server routes `/api/donors` and `/api/dashboard/summary` to the PHP service

## Development setup

Requirements: Node.js 24, pnpm, PHP 8.2 with `pdo_pgsql` and `mbstring`, and a PostgreSQL database.

1. Install workspace dependencies with `pnpm install`.
2. Provide `DATABASE_URL` through Replit Secrets or another secure environment-variable manager. Do not commit database credentials.
3. Apply the development schema with `pnpm --filter @workspace/db run push`.
4. Start the API gateway and PHP service with `pnpm --filter @workspace/api-server run dev`.
5. Start the frontend with `pnpm --filter @workspace/amresh-blood-bank run dev`.

The API gateway starts PHP on a private local port. The frontend calls the shared `/api` routes; it should not connect directly to PHP or PostgreSQL. `lib/api-spec/openapi.yaml` is the API contract, and `pnpm --filter @workspace/api-spec run codegen` regenerates the client hooks.

Run `pnpm run typecheck` to check the workspace.

## Privacy and use

The directory does not contain seeded or fabricated donors. A donor's phone number is only listed after they affirmatively consent during registration. This directory is not a substitute for medical advice or an emergency blood bank; confirm availability and donation eligibility with qualified local services.

## Source attribution

This implementation is adapted from the concept of [Blood Bank Management System](https://github.com/simranlotey/Blood-Bank-Management-System), originally published by Simranpreet Singh under the MIT License. The upstream license and notice are retained in `LICENSE`.