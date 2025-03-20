/**
 * API endpoint to handle PDF viewing with page and scale parameters
 */

import { type NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const urlParam = searchParams.get('url');
    const page = searchParams.get('page') || '1';
    const scale = searchParams.get('scale') || '1';

    if (!urlParam) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 },
      );
    }

    // Validate that the URL is a local PDF path
    if (!urlParam.startsWith('/pdfs/') || !urlParam.endsWith('.pdf')) {
      return NextResponse.json({ error: 'Invalid PDF URL' }, { status: 400 });
    }

    // Extract the filename from the URL
    const pdfFilename = urlParam.replace('/pdfs/', '');

    // Construct the absolute path to the PDF file
    const pdfPath = path.join(process.cwd(), 'public', 'pdfs', pdfFilename);

    // Check if the file exists
    if (!fs.existsSync(pdfPath)) {
      return NextResponse.json(
        { error: 'PDF file not found' },
        { status: 404 },
      );
    }

    // Since we don't have PDF.js installed in public/libs,
    // we'll just use the direct URL approach
    const directUrl = `/pdfs/${encodeURIComponent(pdfFilename)}#page=${page}&zoom=${scale}`;

    // Return information about the PDF and viewing URL
    return NextResponse.json({
      filename: pdfFilename,
      page: Number.parseInt(page),
      scale: Number.parseFloat(scale),
      url: directUrl,
      fileSize: fs.statSync(pdfPath).size,
    });
  } catch (error) {
    console.error('Error in view-pdf API:', error);
    return NextResponse.json(
      {
        error: 'Server error while processing PDF viewing request',
      },
      {
        status: 500,
      },
    );
  }
}
