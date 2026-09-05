# PayCore Runbook

This guide covers setup, database migrations, and operational commands for the PayCore platform.

## 1. Local Development Setup

### Prerequisites
- Node.js 20 LTS
- `pnpm` (latest)
- PostgreSQL (or Neon DB)
- Upstash Redis

### Initial Setup
1. Copy the environment variables:
   ```bash
   cp .env.example .env
   ```
2. Fill in the `.env` values, specifically `DATABASE_URL` and `UPSTASH_REDIS_REST_URL`.
3. Install dependencies:
   ```bash
   pnpm install
   ```
4. Push the schema to the database (for initial prototyping):
   ```bash
   pnpm prisma db push
   ```
5. Seed the database with the default roles and users (Requires `prisma/seed.ts`, coming in M2):
   ```bash
   pnpm prisma db seed
   ```
6. Start the development server:
   ```bash
   pnpm dev
   ```

## 2. Database Management (Prisma)

### Migrations
For production-ready schema changes, create a migration:
```bash
pnpm prisma migrate dev --name your_migration_name
```

### Studio
To view the database contents locally:
```bash
pnpm prisma studio
```

## 3. Deployment (Vercel)

1. Connect the repository to Vercel.
2. Set the `Node.js Version` to `20.x` in Project Settings.
3. Configure the Build Command: `pnpm build`.
4. Ensure all environment variables from `.env` are set in the Vercel dashboard.
5. In the Build process, `prisma generate` will run automatically due to the `postinstall` script in `package.json`.

## 4. Troubleshooting

- **Token Expiry Errors:** If you constantly see `Unauthorized`, verify your system clock is accurate (tokens are time-sensitive) and `JWT_ACCESS_SECRET` is set correctly.
- **Prisma Client Issues:** If types are out of date, run `pnpm prisma generate`.
