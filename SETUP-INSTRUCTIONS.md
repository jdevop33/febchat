# Oak Bay Bylaws Chatbot Setup Instructions

## 1. Environment Setup

### Set up Vercel Environment Variables

1. Log in to the [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to Settings > Environment Variables
4. Add the following variables:
   - `PINECONE_API_KEY` - Your Pinecone API key
   - `PINECONE_ENVIRONMENT` - Your Pinecone environment (e.g., us-west-1-gcp)
   - `PINECONE_INDEX` - `oak-bay-bylaws`
   - `OPENAI_API_KEY` - Your OpenAI API key
   - `AUTH_SECRET` - Generate with `openssl rand -base64 32`

### Pull Environment Variables Locally

```bash
# Install Vercel CLI if needed
npm install -g vercel

# Login
vercel login

# Pull environment variables
cd /path/to/febchat
vercel env pull .env.local
```

## 2. Pinecone Setup

1. Create account at [pinecone.io](https://www.pinecone.io)
2. Create a new index:
   - Name: `oak-bay-bylaws`
   - Dimensions: `1536`
   - Metric: `cosine`

## 3. Index Your Bylaws

### Prepare Your Bylaws
1. Organize your PDF files in `C:\Users\jesse\OneDrive\Documents\ob_bylaws`
2. Make sure file names contain the bylaw number if possible (e.g., `bylaw-4620-tree-protection.pdf`)

### Run the Indexing Script

```bash
# On Windows (PowerShell or Command Prompt)
cd C:\path\to\febchat
pnpm tsx scripts/index-bylaws.ts "C:\Users\jesse\OneDrive\Documents\ob_bylaws"

# On Linux/Mac
cd /path/to/febchat
pnpm tsx scripts/index-bylaws.ts "/path/to/bylaws"
```

The script will:
- Process each PDF file
- Extract text and metadata
- Generate embeddings
- Upload to Pinecone

## 4. Start the Development Server

```bash
cd /path/to/febchat
pnpm dev
```

Access your chatbot at http://localhost:3000

## 5. Deployment

### Deploy to Vercel

```bash
vercel
```

Or set up continuous deployment from your GitHub repository.

## Troubleshooting

### Invalid API Key
- Verify your API keys in Vercel and .env.local
- Ensure OPENAI_API_KEY has proper permissions

### Index Not Found
- Check that your Pinecone index is correctly created and initialized
- Verify PINECONE_INDEX matches the name of your index

### PDF Processing Issues
- Make sure PDF files are not corrupted
- Try with a smaller subset of PDFs to identify problematic files