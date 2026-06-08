# Environment Variables — Railway Deployment

Set these in your Railway project dashboard under **Variables**.

## Required Variables

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | MySQL connection string (Railway provides this automatically when you add a MySQL plugin) | `mysql://user:pass@host:3306/db` |
| `JWT_SECRET` | Secret key for signing session cookies — any long random string | `openssl rand -base64 32` |
| `ACCESS_CODE` | The passphrase your team types on the lock screen to enter the CRM | `YourTeamPassword123` |
| `GROQ_API_KEY` | Free Groq API key for AI briefings and lead analysis | `gsk_xxxxxxxxxxxx` |

## How to Get Your Groq API Key (Free)

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up for free (no credit card needed)
3. Click **API Keys** → **Create API Key**
4. Copy the key (starts with `gsk_`)
5. Paste it as the `GROQ_API_KEY` variable in Railway

## How to Set Up on Railway

1. Create a new Railway project
2. Add a **MySQL** plugin (Railway provides the `DATABASE_URL` automatically)
3. Connect your GitHub repo
4. Go to **Variables** and add the 4 variables above
5. Railway will auto-deploy on every push to your main branch

## After Deployment

Run the database migration to create all tables:
```bash
# In Railway shell or locally with the DATABASE_URL set:
pnpm db:push
```

Then import your data:
```bash
mysql -h HOST -u USER -p DATABASE < database-dump.sql
```
