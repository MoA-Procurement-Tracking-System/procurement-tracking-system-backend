# Database Migrations

## Prerequisites

- `DATABASE_URL` set in `.env` (local) or environment (production)
- Prisma CLI available: `npx prisma`

---

## Local development

```bash
# Apply all pending migrations and regenerate the client
npx prisma migrate dev

# Create a new migration after schema changes
npx prisma migrate dev --name <descriptive_name>

# Regenerate the Prisma client without running migrations
npx prisma generate

# Open Prisma Studio (GUI)
npx prisma studio
```

## Production / CI

```bash
# Apply pending migrations without prompts (safe for CI/CD)
npx prisma migrate deploy

# Regenerate client after deploy
npx prisma generate
```

> `migrate deploy` never creates new migrations — it only applies existing ones.
> Always run `migrate dev` locally and commit the generated migration files before deploying.

---

## Restore from backup

```bash
# Decompress and restore
gunzip -c backups/procurement_<timestamp>.sql.gz | psql "$DATABASE_URL"
```

---

## Backup

Run manually or schedule via cron:

```bash
# Manual
bash scripts/backup-db.sh

# Cron — daily at 02:00
0 2 * * * /bin/bash /path/to/scripts/backup-db.sh >> /var/log/procurement-backup.log 2>&1
```

Backups are stored in `backups/` and files older than 7 days are pruned automatically.
