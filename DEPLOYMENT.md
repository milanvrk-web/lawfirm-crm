# Law Firm CRM — Deployment Guide

This ZIP contains the complete application source code, all database data, and setup instructions.

---

## Quick Start (New Host / Render / Railway / VPS)

### 1. Install dependencies
```bash
pnpm install
```

### 2. Set up environment variables
Copy the contents of `ENV_SETUP_README.md` into a `.env` file at the project root and fill in real values:
```bash
cp ENV_SETUP_README.md .env
# Then edit .env with your real credentials
```

### 3. Create the database schema
```bash
pnpm db:push
```
This creates all 17 tables in your database.

### 4. Import all data
```bash
mysql -h YOUR_DB_HOST -u YOUR_DB_USER -p YOUR_DB_NAME < database-dump.sql
```
This restores all leads, payments, follow-ups, notes, members, and pipeline data.

### 5. Start the server
```bash
# Development
pnpm dev

# Production build
pnpm build
node dist/index.js
```

---

## What's Included

| File / Folder | Purpose |
|---|---|
| `client/` | React 19 + Tailwind 4 frontend |
| `server/` | Express + tRPC backend |
| `drizzle/` | Database schema and migrations |
| `shared/` | Shared types and constants |
| `database-dump.sql` | **Complete data export** — all 17 tables |
| `ENV_SETUP_README.md` | Environment variable reference |
| `package.json` | Dependencies and scripts |

---

## Environment Variables Required

See `ENV_SETUP_README.md` for the full list. Key variables:

- `DATABASE_URL` — MySQL/TiDB connection string
- `JWT_SECRET` — Session cookie signing secret
- `ACCESS_CODE` — CRM access passphrase
- `VITE_APP_ID` — Manus OAuth app ID
- `BUILT_IN_FORGE_API_KEY` — Manus API key (for AI briefings)

---

## GitHub Setup

```bash
git init
git add .
git commit -m "Initial commit — Law Firm CRM"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

> **Important:** Add `.env` to `.gitignore` before pushing. Never commit real credentials.
> The `.gitignore` in this project already excludes `.env` files.
