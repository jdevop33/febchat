# FitForGov Deployment Guide

This guide details the steps to deploy the FitForGov application to Vercel.

## Quick Start

We've added helper scripts to make deployment easier:

```bash
# Fix common deployment issues
pnpm run deploy:fix

# Fix issues, test build locally, then deploy
pnpm run deploy:prepare

# Validate a deployed site
pnpm run deploy:validate
```

## Deployment Process

1. **Fix Configuration**
   - Run `pnpm run deploy:fix` to ensure all settings are correct
   - This will update vercel.json, package.json, and .env files

2. **Deploy to Vercel**
   - Run `pnpm run deploy:prepare` to test locally and deploy
   - OR push to your GitHub repo to trigger auto-deployment

3. **Validate Deployment**
   - Run `pnpm run deploy:validate` to check deployment health
   - This tests critical endpoints and security settings

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

## Security Enhancements

We've added several security features to the deployment:

1. **Security Headers**
   - X-Content-Type-Options: nosniff
   - X-Frame-Options: DENY
   - X-XSS-Protection: 1; mode=block
   - Referrer-Policy: strict-origin-when-cross-origin

2. **Authentication Safeguards**
   - Fixed callback URL handling to prevent open redirects
   - Enforced use of the canonical domain
   - Implemented domain validation in middleware

3. **Rate Limiting**
   - API requests are limited to prevent abuse
   - Authentication endpoints have stricter limits

## Troubleshooting

### Login/Auth Issues

If you see redirects to `app.fitforgov.com` or other domains:

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

## Health Check Tool

The `deploy:validate` script performs the following checks:

- Verifies all critical endpoints are accessible
- Checks that authentication is working correctly
- Ensures security headers are properly set
- Validates domain configuration and redirects
- Tests that callback URL sanitization is working

If any issues are found, it provides specific recommendations for fixing them.

## Monitoring and Maintenance

After deployment:

1. Check Vercel Analytics for performance metrics
2. Monitor logs for any auth or API errors
3. Test all critical flows (login, chat, search)
4. Update API keys before they expire
5. Keep dependencies updated

## Reverting Deployments

If needed:
1. Go to Vercel dashboard → Deployments
2. Find the last working deployment
3. Click "..." → "Redeploy" → "Redeploy to Production"

## Maintenance

- Check for NextAuth.js updates regularly
- Update API keys if they expire
- Monitor database and vector search performance 