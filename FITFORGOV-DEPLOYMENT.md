# FitForGov Deployment Guide

This guide details the steps to deploy the FitForGov application to Vercel.

## Quick Start

We've added helper scripts to make deployment easier:

```bash
# Fix common deployment issues
pnpm run deploy:fix

# Fix issues, test build locally, then deploy
pnpm run deploy:prepare
```

## Domain Configuration

The application is configured to use `https://app.fitforgov.com` as the primary domain.

### DNS Configuration

1. In your domain registrar, set up:
   - A record pointing to Vercel's IP addresses
   - TXT verification record as provided by Vercel

2. In Vercel:
   - Go to Project Settings → Domains
   - Add `app.fitforgov.com` as your production domain
   - Complete domain verification

## Required Environment Variables

Set these in the Vercel dashboard:

### Authentication
| Variable | Description | Example |
|----------|-------------|---------|
| `NEXTAUTH_SECRET` | Secret for auth sessions | Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Production URL | `https://app.fitforgov.com` (no trailing slash) |
| `AUTH_SECRET` | Same as NEXTAUTH_SECRET | Same value as above |

### Database
| Variable | Description |
|----------|-------------|
| `POSTGRES_URL` | Database connection string |
| `DATABASE_URL` | Same as POSTGRES_URL |
| `POSTGRES_PRISMA_URL` | Pooled connection (if using Vercel Postgres) |
| `POSTGRES_URL_NON_POOLING` | Non-pooled connection (if using Vercel Postgres) |

### AI and Services
| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Your Claude API key |
| `EMBEDDING_PROVIDER` | `openai` or `llamaindex` |
| `PINECONE_API_KEY` | Vector database API key |
| `PINECONE_ENVIRONMENT` | Pinecone environment |
| `PINECONE_INDEX` | Vector index name |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob Storage token |

## Troubleshooting

### Login/Auth Issues

If you see redirects to `juche.org` or other domains:

1. Check that `NEXTAUTH_URL` is set exactly to `https://app.fitforgov.com` 
2. Ensure the middleware is deployed correctly
3. Clear browser cookies and try again

### Missing Environment Variables

The app will fail to start if critical environment variables are missing. Minimum required:

- `NEXTAUTH_SECRET` 
- `NEXTAUTH_URL`
- `ANTHROPIC_API_KEY`
- Database connection strings

### Build Failures

Common causes:
- Missing dependencies
- TypeScript errors
- Database connection issues

Solution:
1. Run `pnpm run deploy:fix` to fix configuration
2. If persisting, check Vercel build logs

## Monitoring

After deployment:

1. Check Vercel Analytics for performance metrics
2. Monitor logs for any auth or API errors
3. Test all critical flows (login, chat, search)

## Reverting Deployments

If needed:
1. Go to Vercel dashboard → Deployments
2. Find the last working deployment
3. Click "..." → "Redeploy" → "Redeploy to Production"

## Maintenance

- Check for NextAuth.js updates regularly
- Update API keys if they expire
- Monitor database and vector search performance 