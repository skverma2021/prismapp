# H-04 — Vercel Deployment

## Slide 1 of 3 — Connecting the Repository

### How Vercel deployment works

Vercel watches your GitHub repository. When you push to a branch:

- **Push to `main`** → triggers a production deployment
- **Push to any other branch, or open a PR** → triggers a preview deployment (unique URL)

You connect the repository once. After that, every push deploys automatically.

---

### Import project steps

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Add New → Project**
3. Select **Import Git Repository** and choose your PrismApp fork
4. Vercel detects Next.js automatically
5. **Do not click Deploy yet** — you must set environment variables first

---

### Framework detection

Vercel detects Next.js and sets:

| Setting | Auto-detected value |
|---------|-------------------|
| Framework Preset | Next.js |
| Build Command | `next build` (overridden by `vercel.json`) |
| Output Directory | `.next` |
| Install Command | `npm install` |

Because `vercel.json` already sets `buildCommand: "prisma generate && next build"`, the auto-detected build command is replaced. You do not need to change anything in the Vercel build settings.

---

### Root directory

Leave **Root Directory** blank. The `vercel.json`, `package.json`, and `prisma/schema.prisma` are all at the project root. Vercel will find them.

---

## Slide 2 of 3 — Environment Variables in Vercel Dashboard

### Where to set environment variables

In the Vercel project → **Settings** → **Environment Variables**.

Add each variable as a key-value pair. You can mark each variable for:
- **Production** — only live on the `main`/production deployment
- **Preview** — available on PR preview deployments
- **Development** — available when running `vercel dev` locally

For most variables, check all three environments.

---

### Required variables for production

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | Your Neon/Supabase connection string | Required — app cannot start without it |
| `AUTH_SECRET` | Output of `openssl rand -base64 32` | Required — use a long random value |
| `NEXTAUTH_URL` | `https://your-domain.vercel.app` | Set to your production URL |

---

### Optional variables

| Variable | Value | When to add |
|----------|-------|------------|
| `GOOGLE_CLIENT_ID` | From Google Cloud Console | Only if enabling Google login |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console | Paired with `GOOGLE_CLIENT_ID` |
| `AZURE_AD_CLIENT_ID` | From Azure portal | Only if enabling Azure AD login |
| `AZURE_AD_CLIENT_SECRET` | From Azure portal | Paired with `AZURE_AD_CLIENT_ID` |
| `NEXT_PUBLIC_SENTRY_DSN` | From Sentry project settings | For error capture in production |
| `SENTRY_ORG` | Your Sentry org slug | For source map upload at build |
| `SENTRY_PROJECT` | Your Sentry project slug | For source map upload at build |
| `SENTRY_AUTH_TOKEN` | From Sentry → Settings → Auth Tokens | Build-time only; mark as sensitive |

---

### Sensitive variables

Vercel allows you to mark a variable as sensitive (encrypted, write-only). Do this for:
- `AUTH_SECRET`
- `DATABASE_URL`
- `GOOGLE_CLIENT_SECRET`
- `AZURE_AD_CLIENT_SECRET`
- `SENTRY_AUTH_TOKEN`

Once marked sensitive, the value is not shown in the dashboard again. Keep a secure copy in a password manager.

---

## Slide 3 of 3 — Preview Deployments and NEXTAUTH_URL

### The preview deployment URL problem

Every Vercel preview deployment gets a unique URL like:

```
https://prismapp-git-feature-branch-yourname.vercel.app
```

This URL changes per PR. But `NEXTAUTH_URL` is a static string in your environment variables. If `NEXTAUTH_URL` points to your production domain, next-auth will redirect callback URLs to production even when you are testing a preview deployment.

---

### Two solutions

#### Solution 1 — `AUTH_TRUST_HOST` (recommended)

Add this environment variable in Vercel for **Preview** and **Development** environments:

```
AUTH_TRUST_HOST=1
```

When this is set, next-auth trusts the `X-Forwarded-Host` header that Vercel sets automatically. It uses the actual request URL as the origin instead of reading `NEXTAUTH_URL`.

This means OAuth callbacks work correctly on every preview deployment without any per-deployment configuration.

**Set `NEXTAUTH_URL` only for Production.** Leave it unset for Preview and Development when `AUTH_TRUST_HOST=1`.

---

#### Solution 2 — Vercel system variables

Vercel automatically sets `VERCEL_URL` to the deployment's unique hostname. next-auth v4 falls back to `VERCEL_URL` when `NEXTAUTH_URL` is not set. This works for the domain matching but does not solve OAuth provider callback URL configuration — your OAuth provider's allowed redirect URIs still need to include the preview URL, which changes per deployment.

For this reason, `AUTH_TRUST_HOST=1` is simpler and more practical.

---

### Domain configuration (custom domain)

To use a custom domain instead of `*.vercel.app`:

1. Vercel project → **Settings** → **Domains**
2. Add your domain and follow DNS instructions
3. Update `NEXTAUTH_URL` to your custom domain

```
NEXTAUTH_URL=https://society.yourdomain.com
```

OAuth providers must also have the new domain added to their allowed redirect URI list.

---

### Production deployment vs preview deployment summary

| Aspect | Production | Preview |
|--------|-----------|---------|
| Trigger | Push to `main` | Push to any branch / PR |
| URL | Custom domain or `projectname.vercel.app` | `projectname-git-branch-username.vercel.app` |
| `DATABASE_URL` | Production database | Same production database (be careful) or a staging database |
| `NEXTAUTH_URL` | Set to production URL | Omit; use `AUTH_TRUST_HOST=1` |
| `NODE_ENV` | `production` | `production` |

> **Important:** By default, preview deployments connect to the same database as production. For a society management app this is usually fine in early stages. As the project matures, consider a separate staging database.

---

### Takeaway

> Connect GitHub to Vercel once. Set environment variables in the Vercel dashboard before the first build. Use `AUTH_TRUST_HOST=1` for preview deployments. Deploy to production by merging to `main`.
