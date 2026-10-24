# Backup & Restore — Procurement System

> Covers the live data (MySQL) and the attachment blobs on the filesystem.
> Keep both in step: a MySQL snapshot without its matching attachment
> directory is a half-restore.

## 1. Scope of a "complete" backup

| Component       | Where it lives (dev)                           | Where it lives (prod)                              |
| --------------- | ---------------------------------------------- | -------------------------------------------------- |
| Relational data | MySQL 8, DB `procurement`                      | Managed MySQL, DB per environment                  |
| Attachments     | `./storage/attachments/`                       | S3-compatible bucket (via alternate storage adapter) |
| Secrets         | `.env` (never committed)                       | Secret manager (Vault / AWS SM / k8s secret)       |
| Code            | git                                            | git                                                |

A production restore needs items 1 + 2 at a **matching point in time**; code and
secrets come from their own sources.

## 2. Backup cadence (recommended)

| Tier                  | DB                                | Attachments                           | Retention       |
| --------------------- | --------------------------------- | ------------------------------------- | --------------- |
| Daily full            | `mysqldump --single-transaction` | `rsync -a --link-dest` (hard-linked)  | 30 days         |
| 15-minute PITR        | Binlog shipping                   | Not needed (immutable blobs)          | 7 days          |
| Weekly off-site copy  | Encrypted, versioned bucket upload| Same bucket                           | 1 year          |
| Pre-migration ad-hoc  | Full dump before every `prisma migrate deploy` | Snapshot of attachment root  | Until the next full dump |

## 3. Taking a backup

### 3.1 Local / demo (Windows, your laptop)

```bash
# From the repo root, with the DATABASE_URL already in your shell:
mkdir -p backups
DATE=$(date -u +%Y%m%dT%H%M%SZ)

# 3.1a Dump the database (schema + data, consistent snapshot).
mysqldump --single-transaction --routines --triggers --quick \
  -h 127.0.0.1 -P 3306 -u root procurement \
  > "backups/db-${DATE}.sql"

# 3.1b Snapshot the attachment store (fast, deduped if you keep the previous dir).
tar -czf "backups/attachments-${DATE}.tgz" storage/attachments

# 3.1c Record the schema version so a restore can validate before replaying migrations.
echo "{\"schemaHash\":\"$(git rev-parse HEAD:prisma/schema.prisma)\"}" > "backups/meta-${DATE}.json"
```

### 3.2 Production (any OS)

Use the operating environment's native tool:

- **AWS RDS / Aurora**: enable automated snapshots + binary-log retention; cross-region snapshot copy for DR.
- **Google Cloud SQL**: automated daily backups + PITR; retain 35 days.
- **Self-hosted**: `xtrabackup` for hot backups, binlog streaming to object storage.

For attachments, prefer the object store's own versioning + lifecycle rules
rather than rolling your own `rsync` chain. See `src/infrastructure/storage/`
for how to swap the local-fs adapter for S3.

## 4. Restoring

### 4.1 Local

```bash
# 1. Stop the app.
pm2 stop fcn   # or ctrl+c on `npm run dev`

# 2. Restore the DB (destructive — resets the schema).
mysql -h 127.0.0.1 -P 3306 -u root -e "DROP DATABASE IF EXISTS procurement; CREATE DATABASE procurement;"
mysql -h 127.0.0.1 -P 3306 -u root procurement < backups/db-<timestamp>.sql

# 3. Restore attachments to the configured root.
rm -rf storage/attachments
tar -xzf backups/attachments-<timestamp>.tgz

# 4. Reconcile the Prisma client with whatever schema the dump brought in.
npx prisma generate

# 5. Smoke test.
npm run build && npm run start
curl -fsS http://localhost:3000/api/health | jq .
```

### 4.2 Production

- Restore the DB from the managed service's point-in-time recovery UI, then
  verify `SELECT COUNT(*) FROM Indent` matches expectations.
- Restore attachments by rolling the bucket back to the matching version
  marker (if using versioning), or by replaying the daily snapshot into a
  fresh prefix and flipping the storage root in config.
- Apply schema migrations only if the dump pre-dates them:
  `npx prisma migrate deploy`.

## 5. Point-in-time recovery (PITR) model

The relational layer PITR is binlog-based. The attachment layer is immutable
by convention (keys are ULID-sharded and never overwritten — see
`LocalFsAttachmentStorage.put`), so a DB rollback to time `T` combined with
the current attachment directory is still internally consistent **provided**
you haven't physically deleted attachment files for the data you rolled
forward past.

## 6. Rehearsal schedule

- Monthly: restore the previous day's dump into a scratch MySQL instance and
  run the smoke-test script in `docs/runbooks/smoke.md` (TBD).
- Quarterly: full DR exercise — restore to a different region, run the
  Playwright E2E against it, measure RTO/RPO and record in
  `docs/runbooks/dr-log.md` (TBD).

## 7. What a "half-restore" looks like, and how to avoid it

If the DB rolls back but attachments don't:

- Rows in `Attachment` reference `storageKey`s that no longer exist → 404 on
  `GET /api/attachments/:id/download`.
- Rows for attachments created *after* the DB cut-off exist on disk but have
  no row → orphan blobs; harmless, flagged by the weekly orphan-sweep job.

The reverse (attachments present, DB rows missing) only produces orphan
blobs. Neither state is dangerous, but the audit log will show gaps — hence
the rule: snapshot both at the same timestamp, restore both at the same
timestamp.
