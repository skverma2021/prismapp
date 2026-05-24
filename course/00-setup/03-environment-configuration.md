# Slide Script — 00-03: Environment Configuration

---

## Slide 1 — The `.env` File

**Type:** `Code`

**Headline:**
> The app reads configuration from `.env`. This file is never committed.

**Visual / layout:**
Side-by-side: left panel shows `.env.example` with placeholder values, right panel shows `.env` with real values filled in. The `.env` panel has a "🔒 gitignored" badge.

**Narration:**
The repository contains a file called `.env.example`. It lists every variable the app needs, with placeholder values and explanatory comments.

Your first configuration step is to copy this file:

```bash
# Windows PowerShell
Copy-Item .env.example .env

# macOS / Linux
cp .env.example .env
```

Then open `.env` in VS Code and fill in the real values. The `.env` file is listed in `.gitignore` — it will never be committed to your repository. This is intentional. Real credentials never belong in version control.

**On-screen action / demo:**
Run the copy command in the terminal. Open both `.env.example` and `.env` side-by-side in VS Code. Show that `.env.example` has `postgres://USER:PASSWORD@...` and `.env` is where you will enter the real string.

**Key takeaway:**
Copy `.env.example` → `.env`. Fill in real values. Never commit `.env`.

---

## Slide 2 — Configuring `DATABASE_URL`

**Type:** `Code`

**Headline:**
> `DATABASE_URL` is the most important variable. Get this right first.

**Visual / layout:**
Two tabbed panels: "Option A — Local PostgreSQL" and "Option B — Neon". Each shows the connection string format with the variable parts highlighted in a different colour.

**Narration:**
`DATABASE_URL` tells Prisma how to connect to your PostgreSQL database. The format is a connection URI.

---

**Option A — Local PostgreSQL:**

If you installed PostgreSQL locally, the connection string follows this pattern:

```
DATABASE_URL="postgres://postgres:YOUR_PASSWORD@localhost:5432/prismapp?sslmode=disable"
```

Replace `YOUR_PASSWORD` with the password you set during PostgreSQL installation.

You also need to create the database. In `psql` or pgAdmin, run:

```sql
CREATE DATABASE prismapp;
```

Or from the command line:

```bash
createdb -U postgres prismapp
```

Note: local PostgreSQL usually does not have TLS enabled, so use `sslmode=disable`. Do not use `sslmode=disable` in production.

---

**Option B — Neon:**

In your Neon project dashboard:
1. Click **Connection Details**
2. Select **Prisma** from the dropdown
3. Copy the connection string — it ends with `?sslmode=verify-full`

Paste it directly into `DATABASE_URL` in your `.env`.

**On-screen action / demo:**
Show filling in `DATABASE_URL` in `.env` for whichever option is being demonstrated.

**Key takeaway:**
Local: use `localhost`, create the database manually, use `sslmode=disable`. Neon: copy the Prisma-mode connection string directly.

---

## Slide 3 — Remaining Variables

**Type:** `Code`

**Headline:**
> Two more variables are required before the app can start.

**Visual / layout:**
Two variable blocks highlighted in the `.env` file. Below each: a short explanation and the command to generate the value.

**Narration:**
With `DATABASE_URL` set, two more variables are required.

---

**`AUTH_SECRET`**

This is a secret key used to sign and encrypt session tokens. Generate a secure value:

```bash
# macOS / Linux
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

Copy the output and paste it as the value of `AUTH_SECRET`:

```
AUTH_SECRET="paste-your-generated-value-here"
```

Never reuse a secret from a tutorial, a blog post, or another project. Always generate fresh.

---

**`NEXTAUTH_URL`**

This tells next-auth what the base URL of the app is:

```
NEXTAUTH_URL="http://localhost:3000"
```

For local development, `http://localhost:3000` is the correct value. Do not change this unless you are running the dev server on a different port.

---

**Everything else in `.env.example`**

The OAuth variables (`GOOGLE_CLIENT_ID`, `AZURE_AD_*`) are commented out. Leave them commented — the app works without them. The Sentry variables are also optional for local development.

`AUTH_SEED_PASSWORD` sets the password for seeded demo accounts. The default value `ChangeMe123!` is fine for local development.

**On-screen action / demo:**
Show `.env` with all three required variables filled in: `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`.

**Key takeaway:**
Three variables are required: `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`. Everything else is optional for local dev.
