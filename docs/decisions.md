# Architecture & Technical Decisions

## Milestone 1 Decisions

1. **Tailwind CSS Version**: The reference zip utilized Tailwind CSS v3 with specific `@tailwind base/components/utilities` directives in a massive 24KB `globals.css` file containing highly specific nested `.app-shell` and `.modal` classes. Upgrading to Tailwind v4 would break these patterns. **Decision**: Downgraded scaffolded project to Tailwind v3 to ensure perfect visual parity with the reference without a massive CSS rewrite.
2. **Prisma v8 Configuration**: Prisma v8 removes `url` and `directUrl` from the `datasource` block in `schema.prisma`. **Decision**: Created `prisma.config.ts` to handle the `DIRECT_URL` for CLI migrations, and passed the pooled `DATABASE_URL` directly into the `PrismaClient` constructor in `lib/db.ts`.
3. **Database Constraints (TODO for M2)**: Prisma cannot natively model PostgreSQL exclusion constraints (like checking for overlapping contract dates). **Decision**: Documented in `schema.prisma` that a raw SQL migration using `EXCLUDE USING gist` will be required in Milestone 2 when Contract CRUD is built.
4. **Authentication**: Implemented custom JWT auth using `bcrypt` and `jose` rather than NextAuth. **Decision**: The spec requires strict session rotation, Redis-backed JWT blacklisting on logout, and specific DB structures for refresh tokens. NextAuth makes this difficult to achieve cleanly.
5. **Session Management**: Both access (15m) and refresh (30d) tokens are stored in `httpOnly`, `Secure`, `SameSite=Strict` cookies. The client never sees the raw token.
6. **Security Headers**: Added standard security headers (CSP, HSTS, X-Frame-Options) in `middleware.ts` early to ensure compliance with Section 10.1 from day one.
