# PDF Storage Options for FEBCHAT

## Current Implementation

Currently, PDF files are stored in the `/public/pdfs/` directory during development. The application has a flexible architecture that supports both local files and external URLs:

- `getLocalPdfPath`: Returns the path to a local PDF file
- `getExternalPdfUrl`: Returns a URL to an external PDF file
- `getBestPdfUrl`: Determines the best URL based on the environment (local for development, external for production)

## Storage Options for Production

### 1. Vercel Blob Storage (Recommended)

Since the app is already hosted on Vercel, using Vercel Blob Storage would be the simplest integration:

- **Setup**: 
  ```bash
  pnpm add @vercel/blob
  ```

- **Usage**:
  ```typescript
  import { put } from '@vercel/blob';

  // Upload a PDF
  const { url } = await put(`bylaws/${bylawNumber}.pdf`, blob, {
    access: 'public',
  });

  // Store URL in database or use directly
  ```

- **Benefits**:
  - Seamless integration with Vercel
  - Simple API
  - Good performance with global CDN
  - Reasonable pricing

### 2. Google Cloud Storage (Alternative)

If you prefer GCP:

- **Setup**:
  ```bash
  pnpm add @google-cloud/storage
  ```

- **Usage**:
  ```typescript
  import { Storage } from '@google-cloud/storage';
  
  const storage = new Storage();
  const bucket = storage.bucket('bylaws-bucket');

  // Upload a PDF
  await bucket.upload('path/to/local/file.pdf', {
    destination: `bylaws/${bylawNumber}.pdf`,
    metadata: {
      contentType: 'application/pdf',
      cacheControl: 'public, max-age=31536000',
    },
  });

  // Get URL
  const file = bucket.file(`bylaws/${bylawNumber}.pdf`);
  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: '03-01-2500',  // Far future
  });
  ```

- **Benefits**:
  - Excellent scaling
  - Can integrate with other GCP services
  - Robust security options

### 3. Amazon S3 (If needed)

Only if you need AWS-specific features:

- **Setup**:
  ```bash
  pnpm add @aws-sdk/client-s3
  ```

- **Usage**:
  ```typescript
  import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
  
  const client = new S3Client({ region: 'us-west-2' });
  
  // Upload a PDF
  await client.send(new PutObjectCommand({
    Bucket: 'bylaws-bucket',
    Key: `bylaws/${bylawNumber}.pdf`,
    Body: fileBuffer,
    ContentType: 'application/pdf',
    ACL: 'public-read',
  }));
  
  // URL structure
  const url = `https://bylaws-bucket.s3.amazonaws.com/bylaws/${bylawNumber}.pdf`;
  ```

- **Benefits**:
  - Extremely reliable
  - Robust ecosystem
  - Strong security controls

## Implementation Recommendations

1. **Modify the utility functions**:
   - Update `getExternalPdfUrl` to fetch from cloud storage
   - Keep the abstraction layer as-is for flexibility

2. **Consider a caching strategy**:
   - Cache PDF metadata and common details
   - Avoid redundant storage API calls

3. **Optimize PDF display**:
   - Implement lazy loading
   - Consider maintaining multiple versions (thumbnail, optimized)

4. **Migration path**:
   - Upload existing PDFs to the chosen storage solution
   - Update database references if needed
   - Test thoroughly before switching in production

## PDF Processing Enhancements

We've implemented an `EnhancedMarkdown` component that automatically:
1. Detects bylaw references in AI-generated text
2. Converts them to interactive `BylawCitation` components
3. Links directly to the relevant PDF files

This functionality allows previously plain text references like "Building and Plumbing Bylaw (No. 4742)" to become clickable links that open the PDF viewer modal.