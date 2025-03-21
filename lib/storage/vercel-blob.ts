/**
 * Vercel Blob Storage integration for PDF storage
 * 
 * This file provides utilities for uploading and retrieving PDFs with Vercel Blob Storage.
 * For local development, it falls back to local file paths.
 */

import { put, list, del } from '@vercel/blob';
import fs from 'node:fs';
import path from 'node:path';
import { getFilenameForBylaw } from '../utils/bylaw-utils';

// Environment check
const isProduction = process.env.NODE_ENV === 'production';
const BLOB_STORE_ID = process.env.BLOB_STORE_ID || '';

/**
 * Upload a PDF to Vercel Blob Storage
 * 
 * @param bylawNumber Bylaw number
 * @param filePath Local path to the PDF file
 * @returns The URL of the uploaded file
 */
export async function uploadPdf(bylawNumber: string, filePath: string): Promise<string> {
  if (!isProduction) {
    console.log(`[Dev] Skipping upload for bylaw ${bylawNumber} in development mode`);
    return `/pdfs/${getFilenameForBylaw(bylawNumber)}`;
  }
  
  try {
    const fileName = getFilenameForBylaw(bylawNumber);
    const fileBuffer = fs.readFileSync(filePath);
    
    const { url } = await put(`bylaws/${fileName}`, fileBuffer, {
      access: 'public',
      addRandomSuffix: false, // Use exact filename for better caching
      contentType: 'application/pdf',
    });
    
    console.log(`Uploaded bylaw ${bylawNumber} to ${url}`);
    return url;
  } catch (error) {
    console.error(`Error uploading bylaw ${bylawNumber}:`, error);
    throw error;
  }
}

/**
 * Get the URL for a PDF in Vercel Blob Storage
 * 
 * @param bylawNumber Bylaw number
 * @returns The URL of the PDF
 */
export async function getBlobPdfUrl(bylawNumber: string): Promise<string> {
  if (!isProduction) {
    return `/pdfs/${getFilenameForBylaw(bylawNumber)}`;
  }
  
  try {
    const fileName = getFilenameForBylaw(bylawNumber);
    const { blobs } = await list({ prefix: `bylaws/${fileName}` });
    
    if (blobs.length > 0) {
      return blobs[0].url;
    }
    
    // Fallback to external URL if not found in Blob storage
    throw new Error(`Bylaw ${bylawNumber} not found in Blob storage`);
  } catch (error) {
    console.error(`Error getting URL for bylaw ${bylawNumber}:`, error);
    throw error;
  }
}

/**
 * Upload all PDFs from the public/pdfs directory to Vercel Blob Storage
 * 
 * @returns Array of uploaded URLs
 */
export async function uploadAllPdfs(): Promise<string[]> {
  if (!isProduction) {
    console.log('[Dev] Skipping bulk upload in development mode');
    return [];
  }
  
  const pdfDir = path.resolve(process.cwd(), 'public/pdfs');
  const files = fs.readdirSync(pdfDir);
  const uploadPromises: Promise<string>[] = [];
  
  console.log(`Uploading ${files.length} PDFs to Vercel Blob Storage...`);
  
  for (const file of files) {
    if (file.endsWith('.pdf')) {
      const filePath = path.join(pdfDir, file);
      const bylawNumber = file.split('.')[0].split('-')[0].split('_')[0].replace(/\D/g, '');
      
      if (bylawNumber) {
        uploadPromises.push(uploadPdf(bylawNumber, filePath));
      }
    }
  }
  
  const results = await Promise.allSettled(uploadPromises);
  const successUrls: string[] = [];
  
  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      successUrls.push(result.value);
    }
  });
  
  console.log(`Successfully uploaded ${successUrls.length} of ${files.length} PDFs`);
  return successUrls;
}

/**
 * Delete a PDF from Vercel Blob Storage
 * 
 * @param bylawNumber Bylaw number
 * @returns true if deletion was successful
 */
export async function deletePdf(bylawNumber: string): Promise<boolean> {
  if (!isProduction) {
    console.log(`[Dev] Skipping deletion for bylaw ${bylawNumber} in development mode`);
    return true;
  }
  
  try {
    const fileName = getFilenameForBylaw(bylawNumber);
    const { blobs } = await list({ prefix: `bylaws/${fileName}` });
    
    if (blobs.length > 0) {
      const url = blobs[0].url;
      await del(url);
      console.log(`Deleted bylaw ${bylawNumber} from ${url}`);
      return true;
    }
    
    console.warn(`Bylaw ${bylawNumber} not found in Blob storage`);
    return false;
  } catch (error) {
    console.error(`Error deleting bylaw ${bylawNumber}:`, error);
    return false;
  }
}