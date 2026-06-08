# Environment Variables — Law Firm CRM

Rename this file's contents to `.env` in the project root and fill in real values before running the app.
**Never commit the real `.env` file to version control.**

```
# ── Application ──────────────────────────────────────────────────────────────
NODE_ENV=development
PORT=3000
ACCESS_CODE=your-strong-access-code-here

# ── Database ─────────────────────────────────────────────────────────────────
# MySQL / TiDB connection string
DATABASE_URL=mysql://user:password@host:4000/dbname?ssl={"rejectUnauthorized":true}

# ── Authentication (Manus OAuth) ─────────────────────────────────────────────
JWT_SECRET=replace-with-a-long-random-secret-string
VITE_APP_ID=your-manus-app-id
OAUTH_SERVER_URL=https://oauth.manus.im
VITE_OAUTH_PORTAL_URL=https://manus.im/oauth/authorize

# ── Owner Identity ────────────────────────────────────────────────────────────
OWNER_OPEN_ID=your-manus-open-id
OWNER_NAME=Your Name

# ── Manus Built-in APIs (LLM, Storage, Notifications) ────────────────────────
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=your-server-side-forge-api-key
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im
VITE_FRONTEND_FORGE_API_KEY=your-frontend-forge-api-key

# ── Analytics (optional) ─────────────────────────────────────────────────────
VITE_ANALYTICS_ENDPOINT=
VITE_ANALYTICS_WEBSITE_ID=

# ── App Branding ──────────────────────────────────────────────────────────────
VITE_APP_TITLE=Law Firm CRM
VITE_APP_LOGO=
```

## Variable Descriptions

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | Yes | `development` or `production` |
| `PORT` | No | Server port (default: 3000) |
| `ACCESS_CODE` | Yes | Passphrase to unlock the CRM app |
| `DATABASE_URL` | Yes | MySQL/TiDB connection string |
| `JWT_SECRET` | Yes | Secret for signing session cookies (32+ random chars) |
| `VITE_APP_ID` | Yes | Manus OAuth application ID |
| `OAUTH_SERVER_URL` | Yes | Manus OAuth backend base URL |
| `VITE_OAUTH_PORTAL_URL` | Yes | Manus login portal URL (frontend redirect) |
| `OWNER_OPEN_ID` | Yes | Manus Open ID of the project owner |
| `OWNER_NAME` | Yes | Display name of the project owner |
| `BUILT_IN_FORGE_API_URL` | Yes | Manus Forge API base URL (server-side) |
| `BUILT_IN_FORGE_API_KEY` | Yes | Manus Forge API bearer token (server-side, keep secret) |
| `VITE_FRONTEND_FORGE_API_URL` | Yes | Manus Forge API base URL (frontend) |
| `VITE_FRONTEND_FORGE_API_KEY` | Yes | Manus Forge API bearer token (frontend) |
| `VITE_ANALYTICS_ENDPOINT` | No | Analytics endpoint URL |
| `VITE_ANALYTICS_WEBSITE_ID` | No | Analytics website ID |
| `VITE_APP_TITLE` | No | App title shown in browser tab |
| `VITE_APP_LOGO` | No | URL to app logo image |
