# common-gwd

Shared database schema and migration tooling for the quiz app.

## What it does

Manages the MySQL schema across local and production environments using a simple numbered migration system. Any service that depends on the database schema (scraper, API) relies on migrations defined here.

## Repo structure

common-gwd/
  migrations/
    001_init.sql    # Initial schema — games, answers, questions, migrations tables
  migrate.js        # Migration runner — tracks and applies pending migrations
  .env.example      # Template for required env vars
  .env.local        # Local dev credentials (gitignored)

## Environment variables

| Variable | Description |
| -------- | ----------- |
| `DB_HOST` | DB hostname. Set to `127.0.0.1` for local. Omit for Cloud Run (uses socket). |
| `DB_PORT` | DB port. `3307` for local Docker. |
| `DB_USER` | MySQL username |
| `DB_PASSWORD` | MySQL password |
| `DB_NAME` | Database name |

Copy `.env.example` to `.env.local` and fill in your local values.

## How migrations work

Each file in `migrations/` is a numbered SQL file (e.g. `001_init.sql`, `002_add_column.sql`). The runner tracks which files have already been applied in a `migrations` table in the database. On each run it skips already-applied files and runs any new ones in order.

This means migrations are safe to run repeatedly — they won't re-apply anything that's already been run.

## npm scripts

| Script | Description |
| ------ | ----------- |
| `npm run migrate` | Runs pending migrations (uses env vars from environment) |
| `npm run migrate:dev` | Runs pending migrations against local Docker DB |

## Local development

Requires the local Docker DB to be running from `gwd-project`.

**Start the local database:**

```bash
cd ../gwd-project
docker compose up -d db
```

**Run migrations against local DB:**

```bash
npm run migrate:dev
```

Run this whenever you pull new changes to this repo or after a fresh Docker DB setup.

## Adding a new migration

1. Add a new SQL file to `migrations/` with the next number in sequence (e.g. `002_your_change.sql`)
2. Test it locally with `npm run migrate:dev`
3. Push to `main` — CI will automatically run it against production

Never modify existing migration files. Always add a new numbered file for schema changes.

## CI/CD

On push to `main`, GitHub Actions:

1. Installs the Cloud SQL proxy
2. Starts the proxy connected to the production Cloud SQL instance
3. Runs `npm run migrate` against production

This means any schema changes merged to `main` are automatically applied to the production database.

## Database connection logic

`migrate.js` determines the connection method based on environment:

- **`DB_HOST` is set** → connects via TCP (local development)
- **`DB_HOST` is not set** → connects via Unix socket at `/tmp/cloudsql/quizgame-491018:us-west1:quizgame` (CI/production)
