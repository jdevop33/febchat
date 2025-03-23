# FitForGov Deployment Checklist

## Required Environment Variables

Set these variables in your Vercel project settings:

### Authentication
- `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
- `NEXTAUTH_URL` - Set to `https://app.fitforgov.com`
- `AUTH_SECRET` - Same as NEXTAUTH_SECRET

### Database
- `POSTGRES_URL` - Vercel Postgres or external database URL
- `DATABASE_URL` - Same as POSTGRES_URL
- `POSTGRES_PRISMA_URL` - Pooled connection URL (if using Vercel Postgres)
- `POSTGRES_URL_NON_POOLING` - Non-pooled connection URL (if using Vercel Postgres)

### AI APIs
- `ANTHROPIC_API_KEY` - Your Claude API key
- `EMBEDDING_PROVIDER` - Set to "openai" or "llamaindex" 
- `OPENAI_API_KEY` - If using OpenAI embeddings

### Vector DB
- `PINECONE_API_KEY` - Your Pinecone API key
- `PINECONE_ENVIRONMENT` - Pinecone environment (e.g., "us-east1-gcp")
- `PINECONE_INDEX` - Index name (e.g., "bylaws-v2")

### Storage
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob Storage token

## Deployment Steps

1. **Verify Local Build**
   - Run `pnpm build` locally to ensure it builds successfully

2. **Connect to GitHub**
   - Create/use a GitHub repository for the project
   - Connect it to Vercel

3. **Configure Vercel Project**
   - Ensure Project Name matches your desired subdomain
   - Set framework preset to Next.js
   - Set the correct Node.js version (18.x or higher)
   - Configure build command as `next build`
   - Add all environment variables listed above
   - Set the Production Domain to `app.fitforgov.com`

4. **Add Vercel Integrations**
   - Add Vercel Postgres if not using an external database
   - Add Vercel Blob Storage for file uploads

5. **Deploy**
   - Click "Deploy" and wait for the build to complete
   - Verify domain configuration is correct

## Domain Configuration

1. **Custom Domain Setup**
   - In Vercel project settings, go to "Domains"
   - Add `app.fitforgov.com` as your production domain
   - Follow Vercel's DNS configuration instructions

2. **DNS Settings**
   - Set up an A record pointing to Vercel's IP addresses
   - Add the required TXT verification record
   - Configure CNAME for www subdomain if needed

3. **SSL/HTTPS**
   - Ensure SSL is enabled (Vercel handles this automatically)
   - Check that HTTPS redirects are working

## Verify Deployment

Test these key features after deployment:

1. **Authentication**
   - Registration
   - Login (with proper redirect to app.fitforgov.com)
   - Session persistence

2. **Chat Functionality**
   - New chat creation
   - Message sending/receiving
   - Chat history

3. **Feature Testing**
   - AI response generation
   - PDF viewing
   - Search functionality

4. **Error Handling**
   - Network disconnection recovery
   - Error messages display correctly

## Troubleshooting

### Authentication Issues
- Verify NEXTAUTH_URL is exactly `https://app.fitforgov.com` (no trailing slash)
- Check Network tab in browser for auth-related requests
- Look for any CORS or cookie issues

### Database Issues
- Test database connection using Database tab in Vercel dashboard
- Verify schema migrations are running

### API Issues
- Check API logs in Vercel dashboard
- Verify API keys are correctly set
- Test endpoints directly using Postman/Insomnia

### Domain Issues
- Verify DNS propagation with tools like DNSChecker
- Check for domain verification in Vercel dashboard
- Ensure HTTPS is working correctly

## Rollback Plan

If deployment fails:
1. Go to Vercel project dashboard
2. Navigate to "Deployments" tab
3. Find the last successful deployment
4. Click "..." and select "Redeploy"
5. Choose "Redeploy from Production" 