# Travel Log

A travel journal app: record trips, pin the places you visit on a map, attach photos, and track expenses. Built with Next.js, Prisma/SQLite, and Auth.js. Photos can optionally be auto-described via the Claude Vision API.

## Features

- Multi-user accounts (email + password)
- Trips with title, destination, dates, and notes
- Locations pinned on an interactive map (click to drop a pin) per trip
- Photo uploads per trip, with an optional "Recognize photo" action that asks Claude to describe/identify the subject
- Expense tracking per trip, grouped by currency

## Getting started

```bash
npm install
cp .env.example .env   # then edit values as needed
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

See `.env.example`:

- `DATABASE_URL` — SQLite file path (defaults to `file:./dev.db`)
- `AUTH_SECRET` — random secret used by Auth.js to sign sessions (`openssl rand -base64 32`)
- `ANTHROPIC_API_KEY` — optional; enables the "Recognize photo" feature. Without it, that button returns a clear "not configured" message instead of failing.

## Tech stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- [Prisma](https://www.prisma.io) + SQLite
- [Auth.js](https://authjs.dev) (NextAuth) with the Credentials provider
- [Leaflet](https://leafletjs.com) / react-leaflet for maps (OpenStreetMap tiles)
- [Anthropic SDK](https://github.com/anthropics/anthropic-sdk-typescript) for photo recognition

## Project structure

- `src/app` — pages and API routes (App Router)
- `src/components` — client components (map, photo upload, expenses, nav)
- `src/lib` — Prisma client, validation schemas, upload/auth helpers
- `prisma/schema.prisma` — data model (User, Trip, Location, Photo, Expense)

## Notes

- Uploaded photos are stored on local disk under `public/uploads/<tripId>/`. For a multi-instance or serverless deployment, swap this for object storage (e.g. S3).
- SQLite is used for simplicity; swap the Prisma datasource for Postgres/MySQL if you need concurrent multi-instance writes.
