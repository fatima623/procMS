# Prisma migrations

## What's here

- `migration_lock.toml` — pinned to MySQL. Don't edit.
- `20261023000000_init/migration.sql` — baseline schema covering every table
  the app currently uses. Generated with `prisma migrate diff --from-empty`
  from the schema at tag of this commit.

## Day-to-day workflow

Instead of `prisma db push` (which was useful during early scaffolding),
use the migration flow:

```bash
# 1. Edit prisma/schema.prisma.
# 2. Generate a new migration (reviews + commits the .sql under prisma/migrations/):
npx prisma migrate dev --name <short_description>
# 3. Prisma applies it to your local DB and regenerates the client.
```

`prisma migrate dev` also runs `prisma generate` for you.

## Bootstrapping an environment that already has the schema (dev/demo)

If you've been running `prisma db push` so far, the DB has the tables but
no row in `_prisma_migrations`. Mark the baseline as already applied so
`migrate deploy` won't try to re-create tables:

```bash
npx prisma migrate resolve --applied 20261023000000_init
```

## Deploying to prod

```bash
npx prisma migrate deploy
```

This applies every pending migration in order and NEVER touches the schema
file. Run it as a one-shot pre-start job before the app boots.

## Rollback

Prisma doesn't ship "down" migrations. For a rollback:

1. Restore the DB to a snapshot taken before the migration (see
   `docs/BACKUP_AND_RESTORE.md`).
2. Revert the migration folder from git.
3. Re-run `npx prisma generate` so the client matches.

## Adding seed data as part of a deploy

The `prisma.seed` entry in `package.json` runs `prisma/seed.ts`. Prisma
calls it automatically after `migrate dev` in development; in production,
run `npm run seed` explicitly if you need to.
