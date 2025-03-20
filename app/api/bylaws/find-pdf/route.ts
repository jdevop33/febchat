/**
 * API endpoint to find a PDF file for a bylaw number
 */

import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bylawNumber = searchParams.get('bylawNumber');

    if (!bylawNumber) {
      return NextResponse.json(
        { error: 'Bylaw number is required' },
        { status: 400 },
      );
    }

    // Directory where PDF files are stored
    const pdfDir = path.join(process.cwd(), 'public', 'pdfs');

    // Get list of all PDF files in the directory
    const files = fs
      .readdirSync(pdfDir)
      .filter((file) => file.endsWith('.pdf'));

    // Patterns to search for in filenames
    const patterns = [
      new RegExp(`^${bylawNumber}\\.pdf$`, 'i'), // Exact match (e.g., "3152.pdf")
      new RegExp(`^${bylawNumber}[\\s_-]`, 'i'), // Starts with bylaw number (e.g., "3152 - Something.pdf", "3152_Something.pdf")
      new RegExp(`^${bylawNumber},`, 'i'), // Comma after bylaw number (e.g., "3152, Something.pdf")
      new RegExp(`Bylaw[\\s_-]+(?:No\\.?[\\s_-]+)?${bylawNumber}`, 'i'), // "Bylaw No. 3152" pattern
    ];

    // Search for matching file
    let matchedFile = null;

    for (const file of files) {
      for (const pattern of patterns) {
        if (pattern.test(file)) {
          matchedFile = file;
          break;
        }
      }
      if (matchedFile) break;
    }

    if (matchedFile) {
      return NextResponse.json({
        found: true,
        url: `/pdfs/${matchedFile}`,
      });
    } else {
      return NextResponse.json({
        found: false,
        message: `No PDF found for bylaw number: ${bylawNumber}`,
      });
    }
  } catch (error) {
    console.error('Error in find-pdf API:', error);
    return NextResponse.json(
      {
        error: 'Server error while searching for PDF file',
      },
      {
        status: 500,
      },
    );
  }
}
