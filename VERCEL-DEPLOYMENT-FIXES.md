# Vercel Deployment Configuration Guide

## Critical Environment Variables

Add these environment variables in your Vercel project settings to ensure proper authentication and API functionality:

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `NEXTAUTH_SECRET` | Secret key for NextAuth.js sessions | Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Production URL of your application | `https://your-app-name.vercel.app` |
| `AUTH_SECRET` | Alternative auth secret (should match NEXTAUTH_SECRET) | Same as NEXTAUTH_SECRET |

## Authentication Configuration

1. Go to your Vercel dashboard and select your project
2. Navigate to "Settings" > "Environment Variables"
3. Add the following variables:

```
NEXTAUTH_SECRET=<generated-secret-key>
NEXTAUTH_URL=https://your-deployed-app-url.vercel.app
AUTH_SECRET=<same-as-nextauth-secret>
```

For local development, you should add these to your `.env.local` file as well.

## How to Generate a Secure Secret

Run this command to generate a secure random string:

```bash
openssl rand -base64 32
```

## Rate Limiting Configuration (Optional)

If you want to adjust rate limiting for the API:

```
RATE_LIMIT_MAX=50
RATE_LIMIT_WINDOW_MS=60000
```

## Testing Authentication

After setting these variables and redeploying:

1. Try to register a new account
2. Test logging in with those credentials
3. Verify that you stay logged in between page refreshes
4. Try accessing a protected route to ensure it's properly guarded

## Troubleshooting

If authentication still fails:

1. Check browser console for any errors
2. Verify that cookies are being set (should see a `.session-token` cookie)
3. Check server logs for any auth-related errors

## Common Issues

1. **Session not persisting**: Ensure NEXTAUTH_SECRET is properly set
2. **Redirect loops**: Check that NEXTAUTH_URL is correct
3. **API routes failing**: Check that server-side authentication validation is working

## Logging and Monitoring

For better diagnostics, enable enhanced logging:

```
AUTH_DEBUG=true
```

Remember to turn this off in production once issues are resolved.