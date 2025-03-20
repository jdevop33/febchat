/**
 * Bylaw Upsert Script
 *
 * Processes and indexes bylaw PDFs into Pinecone, with special handling
 * for amended/consolidated bylaws to ensure accurate citation of the newest content.
 *
 * Usage:
 * pnpm tsx scripts/bylaw-upsert.ts [pdf-directory or single-pdf-file]
 */

import fs from 'node:fs';
import path from 'node:path';
import { Pinecone } from '@pinecone-database/pinecone';
import pdfParse from 'pdf-parse';
import dotenv from 'dotenv';
import {
  getEmbeddingsModel,
  EmbeddingProvider,
} from '../lib/vector-search/embedding-models';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Configuration
const PDF_DIRECTORY =
  process.argv[2] || path.resolve(process.cwd(), 'public', 'pdfs');
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;
const UPSERT_BATCH_SIZE = 100;
const EMBEDDING_BATCH_SIZE = 5;
const NAMESPACE = 'bylaws'; // Default namespace

/**
 * Extract bylaw information from filename, with special handling for consolidated/amended bylaws
 */
function extractBylawInfo(filename: string): {
  number?: string;
  title?: string;
  consolidatedDate?: string;
  amendedBylaw?: string;
  isConsolidated: boolean;
} {
  console.log(`Extracting info from filename: ${filename}`);
  // Initialize result with default values
  const result: {
    number?: string;
    title?: string;
    consolidatedDate?: string;
    amendedBylaw?: string;
    isConsolidated: boolean;
  } = {
    isConsolidated: false,
  };

  // Remove file extension
  const basename = path.basename(filename, '.pdf');

  // Check if this is a consolidated version
  const consolidatedMatch = basename.match(
    /CONSOLIDATED|Consolidated|consolidated/,
  );
  result.isConsolidated = !!consolidatedMatch;

  // Extract consolidation date if available
  const datePatterns = [
    /to\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
    /to\s+(\d{1,2}\s+[A-Za-z]+,?\s+\d{4})/i,
    /to\s+(\d{4}-\d{2}-\d{2})/i,
    /to\s+([A-Za-z]+\s+\d{4})/i,
    /to\s+(\d{1,2}-\d{1,2}-\d{4})/i,
    /to\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,
  ];

  for (const pattern of datePatterns) {
    const match = basename.match(pattern);
    if (match) {
      result.consolidatedDate = match[1];
      break;
    }
  }

  // Extract amendment information
  const amendmentMatch = basename.match(/to\s+(\d+)/i);
  if (amendmentMatch) {
    result.amendedBylaw = amendmentMatch[1];
  }

  // Pattern 1: "bylaw-XXXX-title.pdf" format
  const organizedPattern = /^bylaw-(\d+)(?:-(.+))?$/i;
  const organizedMatch = basename.match(organizedPattern);

  if (organizedMatch) {
    result.number = organizedMatch[1];
    result.title = organizedMatch[2]?.replace(/-/g, ' ');
    return result;
  }

  // Pattern 2: "4747, Reserve Funds Bylaw, 2020 CONSOLIDATED" format
  const patternWithComma = /^(\d+)(?:,\s+)(.+)/;
  const commaMatch = basename.match(patternWithComma);

  if (commaMatch) {
    result.number = commaMatch[1];
    result.title = commaMatch[2];
    return result;
  }

  // Pattern 3: "4747 Reserve Funds Bylaw 2020 CONSOLIDATED" format
  const patternWithSpace = /^(\d+)(?:\s+)(.+)/;
  const spaceMatch = basename.match(patternWithSpace);

  if (spaceMatch) {
    result.number = spaceMatch[1];
    result.title = spaceMatch[2];
    return result;
  }

  // Pattern 4: Files that have the bylaw number in format "Bylaw No. 4861, 2024"
  const patternWithNo = /Bylaw No\.?\s+(\d+)(?:,|\s|$)/i;
  const noMatch = basename.match(patternWithNo);

  if (noMatch) {
    result.number = noMatch[1];
    return result;
  }

  return result;
}

/**
 * Extract amendment references from text content
 */
function extractAmendmentReferences(text: string): {
  amendedBylaws: string[];
  enactmentDate?: string;
  lastAmendmentDate?: string;
} {
  const result = {
    amendedBylaws: [] as string[],
    enactmentDate: undefined as string | undefined,
    lastAmendmentDate: undefined as string | undefined,
  };

  // Look for amendment references like "amended by Bylaw No. 4XXX"
  const amendmentRegex =
    /amended\s+by\s+(?:Bylaw|bylaw)(?:\s+No\.?)?(?:\s+#?)?\s+(\d+)/gi;
  let match: RegExpExecArray | null;
  let amendmentResult: RegExpExecArray | null = amendmentRegex.exec(text);

  while (amendmentResult !== null) {
    match = amendmentResult;
    result.amendedBylaws.push(match[1]);
    amendmentResult = amendmentRegex.exec(text);
  }

  // Extract enactment date
  const enactmentRegex =
    /(?:enacted|adopted|passed)(?:\s+on)?\s+(?:the\s+)?(\d{1,2}(?:st|nd|rd|th)?[\s,]+(?:day\s+of\s+)?[A-Za-z]+[\s,]+\d{4})/i;
  const enactmentMatch = text.match(enactmentRegex);

  if (enactmentMatch) {
    result.enactmentDate = enactmentMatch[1];
  }

  // Extract latest amendment date
  const amendmentDateRegex =
    /(?:last\s+amended|amended\s+on)(?:\s+the\s+)?(\d{1,2}(?:st|nd|rd|th)?[\s,]+(?:day\s+of\s+)?[A-Za-z]+[\s,]+\d{4})/i;
  const amendmentDateMatch = text.match(amendmentDateRegex);

  if (amendmentDateMatch) {
    result.lastAmendmentDate = amendmentDateMatch[1];
  }

  return result;
}

/**
 * Extract section info from text chunk
 */
function extractSectionInfo(text: string): {
  section?: string;
  title?: string;
} {
  const result: { section?: string; title?: string } = {};

  // Look for common section patterns
  const sectionPatterns = [
    // Number with dot: "1. Title"
    /^\s*(\d+(?:\.\d+)*)\.\s+([^\n.]+)/m,
    // Section word: "Section 1: Title" or "SECTION 1 - TITLE"
    /(?:^|\n)\s*(?:Section|SECTION)\s+(\d+(?:\.\d+)*)(?::|[-\s]+)([^\n.]+)/m,
    // Part pattern: "PART 1 - TITLE" or "Part I: Title"
    /(?:^|\n)\s*(?:Part|PART)\s+([IVXivx\d]+)(?::|[-\s]+)([^\n.]+)/m,
    // Division pattern: "Division 1 - Title"
    /(?:^|\n)\s*(?:Division|DIVISION)\s+([IVXivx\d]+)(?::|[-\s]+)([^\n.]+)/m,
    // Schedule pattern: "Schedule A - Title"
    /(?:^|\n)\s*(?:Schedule|SCHEDULE)\s+([A-Za-z\d]+)(?::|[-\s]+)([^\n.]+)/m,
  ];

  for (const pattern of sectionPatterns) {
    const match = text.match(pattern);
    if (match) {
      result.section = match[1];
      result.title = match[2].trim();
      break;
    }
  }

  // If still no section, look for numbered headings
  if (!result.section) {
    const numberHeadingMatch = text.match(/^\s*(\d+(?:\.\d+)*)\s+([^\n.]+)/m);
    if (numberHeadingMatch) {
      result.section = numberHeadingMatch[1];
      result.title = numberHeadingMatch[2].trim();
    }
  }

  return result;
}

/**
 * Custom text chunking function with overlap
 */
function chunkText(
  text: string,
  chunkSize: number,
  chunkOverlap: number,
): { pageContent: string; metadata: any }[] {
  const chunks: { pageContent: string; metadata: any }[] = [];

  // Split text by paragraphs to avoid cutting in the middle of sentences if possible
  const paragraphs = text.split(/\n\s*\n/);

  let currentChunk = '';

  for (const paragraph of paragraphs) {
    // If adding this paragraph would exceed the chunk size,
    // save the current chunk and start a new one with overlap
    if (
      currentChunk.length + paragraph.length > chunkSize &&
      currentChunk.length > 0
    ) {
      // Save current chunk
      chunks.push({
        pageContent: currentChunk,
        metadata: { length: currentChunk.length },
      });

      // Start new chunk with overlap
      const words = currentChunk.split(/\s+/);
      const overlapWords = words.slice(-Math.floor(chunkOverlap / 7)); // Approximate words in overlap

      currentChunk = `${overlapWords.join(' ')}\n\n${paragraph}`;
    } else {
      // Add paragraph to current chunk
      if (currentChunk.length > 0) {
        currentChunk += '\n\n';
      }
      currentChunk += paragraph;
    }
  }

  // Add the last chunk if it has content
  if (currentChunk.length > 0) {
    chunks.push({
      pageContent: currentChunk,
      metadata: { length: currentChunk.length },
    });
  }

  return chunks;
}

/**
 * Determine bylaw category from title and content
 */
function determineCategory(title: string, text: string): string {
  const titleLower = title.toLowerCase();
  const textLower = text.toLowerCase();

  // Check for common categories in title or text
  const categories = [
    {
      name: 'zoning',
      keywords: ['zoning', 'zone', 'land use', 'residential', 'commercial'],
    },
    {
      name: 'building',
      keywords: ['building', 'construction', 'structure', 'permit'],
    },
    {
      name: 'traffic',
      keywords: ['traffic', 'parking', 'vehicle', 'street', 'road'],
    },
    {
      name: 'utilities',
      keywords: ['utilities', 'water', 'sewer', 'drainage', 'waste'],
    },
    {
      name: 'finance',
      keywords: ['finance', 'tax', 'fee', 'budget', 'revenue'],
    },
    { name: 'parks', keywords: ['park', 'recreation', 'beach', 'playground'] },
    {
      name: 'governance',
      keywords: ['council', 'committee', 'procedure', 'election'],
    },
    {
      name: 'licensing',
      keywords: ['license', 'permit', 'business', 'application'],
    },
  ];

  for (const category of categories) {
    if (
      category.keywords.some((keyword) => titleLower.includes(keyword)) ||
      category.keywords.some((keyword) => textLower.includes(keyword))
    ) {
      return category.name;
    }
  }

  return 'general';
}

/**
 * Process a PDF file and prepare it for upsert
 */
async function processPDF(filePath: string): Promise<{
  chunks: any[];
  vectors: any[];
  metadata: any;
}> {
  console.log(`\nProcessing ${path.basename(filePath)}...`);

  // Extract metadata from filename
  const fileInfo = extractBylawInfo(path.basename(filePath));
  console.log('File info extracted:', fileInfo);

  try {
    // Load the PDF
    console.log('Loading PDF content...');
    const pdfBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(pdfBuffer);
    const pdfText = pdfData.text;

    console.log(`PDF loaded. Content length: ${pdfText.length} characters`);

    // Extract amendment references and dates from content
    const amendmentInfo = extractAmendmentReferences(pdfText);
    console.log('Amendment info extracted:', amendmentInfo);

    // Split into chunks with custom implementation
    console.log('Splitting content into chunks...');

    // Simple chunking with overlap
    const chunks = chunkText(pdfText, CHUNK_SIZE, CHUNK_OVERLAP);
    console.log(
      `Created ${chunks.length} chunks with size ${CHUNK_SIZE} and overlap ${CHUNK_OVERLAP}`,
    );

    // Create base metadata
    const stats = fs.statSync(filePath);
    const metadata = {
      bylawNumber: fileInfo.number,
      title: fileInfo.title || path.basename(filePath, '.pdf'),
      filename: path.basename(filePath),
      fileSize: stats.size,
      lastModified: stats.mtime.toISOString(),
      source: 'oak-bay-bylaws',
      isConsolidated: fileInfo.isConsolidated,
      consolidatedDate: fileInfo.consolidatedDate,
      amendedBylaw: fileInfo.amendedBylaw,
      amendmentReferences: amendmentInfo.amendedBylaws,
      enactmentDate: amendmentInfo.enactmentDate,
      lastAmendmentDate: amendmentInfo.lastAmendmentDate,
      processingDate: new Date().toISOString(),
    };

    console.log('Base metadata created:', metadata);

    // Generate embeddings
    console.log('Generating embeddings...');
    const embeddings = getEmbeddingsModel(
      process.env.EMBEDDING_PROVIDER === 'openai'
        ? EmbeddingProvider.OPENAI
        : EmbeddingProvider.LLAMAINDEX,
    );

    // Process chunks in batches to generate vectors
    const vectors = [];
    const texts = chunks.map((chunk) => chunk.pageContent);

    console.log(
      `Preparing to generate ${texts.length} embeddings in batches of ${EMBEDDING_BATCH_SIZE}...`,
    );

    for (let i = 0; i < texts.length; i += EMBEDDING_BATCH_SIZE) {
      console.log(
        `Processing batch ${Math.floor(i / EMBEDDING_BATCH_SIZE) + 1}/${Math.ceil(texts.length / EMBEDDING_BATCH_SIZE)}`,
      );

      const batchTexts = texts.slice(i, i + EMBEDDING_BATCH_SIZE);
      const batchEmbeddings = await embeddings.embedDocuments(batchTexts);

      for (let j = 0; j < batchTexts.length; j++) {
        const chunkIndex = i + j;
        const chunk = chunks[chunkIndex];

        // Extract section info for this chunk
        const sectionInfo = extractSectionInfo(chunk.pageContent);

        // Create metadata for this chunk
        const chunkMetadata = {
          ...metadata,
          text: chunk.pageContent,
          chunk: chunkIndex,
          page: chunk.metadata?.page,
          section: sectionInfo.section || `chunk-${chunkIndex}`,
          sectionTitle: sectionInfo.title,
          category: determineCategory(metadata.title || '', chunk.pageContent),
        };

        // Create vector record
        vectors.push({
          id: `bylaw-${metadata.bylawNumber || 'unknown'}-${chunkIndex}`,
          values: batchEmbeddings[j],
          metadata: chunkMetadata,
        });
      }
    }

    console.log(`Generated ${vectors.length} vectors`);

    return { chunks, vectors, metadata };
  } catch (error) {
    console.error(`Error processing ${path.basename(filePath)}:`, error);
    throw error;
  }
}

/**
 * Upsert vectors to Pinecone
 */
async function upsertVectors(vectors: any[]): Promise<void> {
  try {
    // Get config
    const apiKey = process.env.PINECONE_API_KEY;
    const indexName = process.env.PINECONE_INDEX || 'oak-bay-bylaws-v2';

    if (!apiKey) {
      throw new Error('PINECONE_API_KEY is required');
    }

    console.log(
      `Upserting ${vectors.length} vectors to Pinecone index '${indexName}'...`,
    );

    // Initialize Pinecone client
    const pinecone = new Pinecone({
      apiKey,
    });

    // Get index
    console.log(`Connecting to Pinecone index: ${indexName}`);
    const index = pinecone.index(indexName);

    // Upsert in batches with retry logic
    const totalBatches = Math.ceil(vectors.length / UPSERT_BATCH_SIZE);

    for (let i = 0; i < vectors.length; i += UPSERT_BATCH_SIZE) {
      const batch = vectors.slice(i, i + UPSERT_BATCH_SIZE);
      const batchNumber = Math.floor(i / UPSERT_BATCH_SIZE) + 1;

      console.log(
        `Upserting batch ${batchNumber}/${totalBatches} (${batch.length} vectors)...`,
      );

      // Retry logic with exponential backoff
      let retryCount = 0;
      const maxRetries = 3;
      let success = false;

      while (!success && retryCount <= maxRetries) {
        try {
          await index.upsert(batch);
          console.log(
            `✅ Batch ${batchNumber}/${totalBatches} upserted successfully`,
          );
          success = true;
        } catch (error) {
          retryCount++;
          const waitTime = Math.pow(2, retryCount) * 1000; // Exponential backoff

          if (retryCount <= maxRetries) {
            console.warn(
              `Retrying batch ${batchNumber} after ${waitTime}ms (attempt ${retryCount}/${maxRetries})...`,
            );
            await new Promise((resolve) => setTimeout(resolve, waitTime));
          } else {
            console.error(
              `❌ Failed to upsert batch ${batchNumber} after ${maxRetries} attempts:`,
              error,
            );
            throw error;
          }
        }
      }
    }

    console.log(`✅ All vectors upserted successfully to index '${indexName}'`);
  } catch (error) {
    console.error('Error upserting vectors to Pinecone:', error);
    throw error;
  }
}

/**
 * Process all PDF files in a directory
 */
async function processDirectory(dirPath: string): Promise<void> {
  try {
    console.log(`Processing directory: ${dirPath}`);

    // Check if directory exists
    if (!fs.existsSync(dirPath)) {
      throw new Error(`Directory not found: ${dirPath}`);
    }

    // Get list of PDF files
    const files = fs
      .readdirSync(dirPath)
      .filter((file) => file.toLowerCase().endsWith('.pdf'))
      .map((file) => path.join(dirPath, file));

    console.log(`Found ${files.length} PDF files to process`);

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(
        `\nProcessing file ${i + 1}/${files.length}: ${path.basename(file)}`,
      );

      try {
        // Process PDF and upsert to Pinecone
        const { vectors } = await processPDF(file);
        await upsertVectors(vectors);

        console.log(`✅ Successfully processed ${path.basename(file)}`);
      } catch (error) {
        console.error(`❌ Error processing ${path.basename(file)}:`, error);
        // Continue with next file
      }
    }

    console.log('\n✅ All files processed');
  } catch (error) {
    console.error('Error processing directory:', error);
    throw error;
  }
}

/**
 * Process a single PDF file
 */
async function processFile(filePath: string): Promise<void> {
  try {
    console.log(`Processing file: ${filePath}`);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Process PDF and upsert to Pinecone
    const { vectors } = await processPDF(filePath);
    await upsertVectors(vectors);

    console.log(`✅ Successfully processed ${path.basename(filePath)}`);
  } catch (error) {
    console.error(`❌ Error processing ${path.basename(filePath)}:`, error);
    throw error;
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    // Validate environment variables
    if (!process.env.PINECONE_API_KEY) {
      throw new Error('PINECONE_API_KEY is required');
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required');
    }

    console.log('Starting bylaw upsert process...');
    console.log(
      `Using Pinecone index: ${process.env.PINECONE_INDEX || 'oak-bay-bylaws-v2'}`,
    );
    console.log(
      `Using embedding provider: ${process.env.EMBEDDING_PROVIDER || 'llamaindex'}`,
    );

    // Get input path
    const inputPath = PDF_DIRECTORY;
    console.log(`Using input path: ${inputPath}`);

    // Process based on type (directory or file)
    const stats = fs.statSync(inputPath);

    if (stats.isDirectory()) {
      await processDirectory(inputPath);
    } else if (stats.isFile() && inputPath.toLowerCase().endsWith('.pdf')) {
      await processFile(inputPath);
    } else {
      throw new Error('Input path must be a directory or a PDF file');
    }

    console.log('\n✅ Bylaw upsert process completed successfully');
  } catch (error) {
    console.error('\n❌ Bylaw upsert process failed:', error);
    process.exit(1);
  }
}

// Run the script
main();
