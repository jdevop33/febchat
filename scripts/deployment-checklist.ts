/**
 * Deployment Checklist
 * 
 * This script checks if all necessary steps are completed for deployment.
 * 
 * Usage:
 * pnpm tsx scripts/deployment-checklist.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { Pinecone } from '@pinecone-database/pinecone';
import { PrismaClient } from '@prisma/client';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Prisma client
const prisma = new PrismaClient();

// Checklist items
interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
}

async function runChecklist() {
  console.log('Running deployment checklist...');
  const results: CheckResult[] = [];
  
  // Check 1: Verify environment variables
  results.push(await checkEnvironmentVariables());
  
  // Check 2: Verify Pinecone connection
  results.push(await checkPineconeConnection());
  
  // Check 3: Verify database connection
  results.push(await checkDatabaseConnection());
  
  // Check 4: Verify PDF files
  results.push(await checkPdfFiles());
  
  // Check 5: Verify verification database
  results.push(await checkVerificationDatabase());
  
  // Check 6: Verify vector database
  results.push(await checkVectorDatabase());
  
  // Display results
  console.log('\nDeployment Checklist Results:');
  console.log('=============================');
  
  let passCount = 0;
  let warningCount = 0;
  let failCount = 0;
  
  results.forEach((result, index) => {
    const icon = result.status === 'pass' ? '✅' : 
                 result.status === 'warning' ? '⚠️' : '❌';
    
    console.log(`${index + 1}. ${icon} ${result.name}: ${result.message}`);
    
    if (result.status === 'pass') passCount++;
    else if (result.status === 'warning') warningCount++;
    else failCount++;
  });
  
  console.log('\nSummary:');
  console.log(`- ${passCount} checks passed`);
  console.log(`- ${warningCount} warnings`);
  console.log(`- ${failCount} failures`);
  
  if (failCount > 0) {
    console.log('\n❌ Deployment not ready. Please fix the issues above before deploying.');
    process.exit(1);
  } else if (warningCount > 0) {
    console.log('\n⚠️ Deployment ready with warnings. Consider addressing the warnings before deploying.');
  } else {
    console.log('\n✅ Deployment ready! All checks passed.');
  }
}

// Check 1: Verify environment variables
async function checkEnvironmentVariables(): Promise<CheckResult> {
  const requiredVars = [
    'PINECONE_API_KEY',
    'PINECONE_INDEX',
    'OPENAI_API_KEY',
    'DATABASE_URL',
    'AUTH_SECRET'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    return {
      name: 'Environment Variables',
      status: 'fail',
      message: `Missing required variables: ${missingVars.join(', ')}`
    };
  }
  
  return {
    name: 'Environment Variables',
    status: 'pass',
    message: 'All required environment variables are present'
  };
}

// Check 2: Verify Pinecone connection
async function checkPineconeConnection(): Promise<CheckResult> {
  try {
    const apiKey = process.env.PINECONE_API_KEY;
    const indexName = process.env.PINECONE_INDEX || 'oak-bay-bylaws-v2';
    
    if (!apiKey) {
      return {
        name: 'Pinecone Connection',
        status: 'fail',
        message: 'PINECONE_API_KEY is not set'
      };
    }
    
    const pinecone = new Pinecone({ apiKey });
    const index = pinecone.index(indexName);
    
    // Test connection by getting index stats
    const stats = await index.describeIndexStats();
    
    if (stats.totalRecordCount === 0) {
      return {
        name: 'Pinecone Connection',
        status: 'warning',
        message: `Connected to index ${indexName} but it has 0 vectors`
      };
    }
    
    return {
      name: 'Pinecone Connection',
      status: 'pass',
      message: `Connected to index ${indexName} with ${stats.totalRecordCount} vectors`
    };
  } catch (error) {
    return {
      name: 'Pinecone Connection',
      status: 'fail',
      message: `Failed to connect to Pinecone: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// Check 3: Verify database connection
async function checkDatabaseConnection(): Promise<CheckResult> {
  try {
    // Test connection by running a simple query
    await prisma.$queryRaw`SELECT 1`;
    
    return {
      name: 'Database Connection',
      status: 'pass',
      message: 'Connected to database successfully'
    };
  } catch (error) {
    return {
      name: 'Database Connection',
      status: 'fail',
      message: `Failed to connect to database: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// Check 4: Verify PDF files
async function checkPdfFiles(): Promise<CheckResult> {
  try {
    const pdfDir = path.join(process.cwd(), 'public', 'pdfs');
    
    if (!fs.existsSync(pdfDir)) {
      return {
        name: 'PDF Files',
        status: 'fail',
        message: 'PDF directory does not exist'
      };
    }
    
    const files = fs.readdirSync(pdfDir);
    const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));
    
    if (pdfFiles.length === 0) {
      return {
        name: 'PDF Files',
        status: 'fail',
        message: 'No PDF files found in the PDF directory'
      };
    }
    
    // Check for key bylaws (Anti-Noise Bylaw)
    const antiNoiseBylaw = pdfFiles.find(file => file.includes('3210'));
    
    if (!antiNoiseBylaw) {
      return {
        name: 'PDF Files',
        status: 'warning',
        message: `Found ${pdfFiles.length} PDF files, but missing key bylaws (e.g., Anti-Noise Bylaw 3210)`
      };
    }
    
    return {
      name: 'PDF Files',
      status: 'pass',
      message: `Found ${pdfFiles.length} PDF files, including key bylaws`
    };
  } catch (error) {
    return {
      name: 'PDF Files',
      status: 'fail',
      message: `Failed to check PDF files: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// Check 5: Verify verification database
async function checkVerificationDatabase(): Promise<CheckResult> {
  try {
    // Check if bylaw table exists and has data
    const bylawCount = await prisma.bylaw.count();
    
    if (bylawCount === 0) {
      return {
        name: 'Verification Database',
        status: 'warning',
        message: 'Verification database is empty, run initialization script'
      };
    }
    
    // Check for key bylaws (Anti-Noise Bylaw)
    const antiNoiseBylaw = await prisma.bylaw.findUnique({
      where: { bylawNumber: '3210' },
      include: { sections: true }
    });
    
    if (!antiNoiseBylaw) {
      return {
        name: 'Verification Database',
        status: 'warning',
        message: `Found ${bylawCount} bylaws in verification database, but missing key bylaws (e.g., Anti-Noise Bylaw 3210)`
      };
    }
    
    if (antiNoiseBylaw.sections.length === 0) {
      return {
        name: 'Verification Database',
        status: 'warning',
        message: 'Anti-Noise Bylaw found, but has no sections'
      };
    }
    
    return {
      name: 'Verification Database',
      status: 'pass',
      message: `Found ${bylawCount} bylaws in verification database, including key bylaws with sections`
    };
  } catch (error) {
    return {
      name: 'Verification Database',
      status: 'fail',
      message: `Failed to check verification database: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// Check 6: Verify vector database has data for key bylaws
async function checkVectorDatabase(): Promise<CheckResult> {
  try {
    const apiKey = process.env.PINECONE_API_KEY;
    const indexName = process.env.PINECONE_INDEX || 'oak-bay-bylaws-v2';
    
    if (!apiKey) {
      return {
        name: 'Vector Database',
        status: 'fail',
        message: 'PINECONE_API_KEY is not set'
      };
    }
    
    const pinecone = new Pinecone({ apiKey });
    const index = pinecone.index(indexName);
    
    // Check if there are vectors for the Anti-Noise Bylaw
    const query = await index.query({
      filter: { bylawNumber: { $eq: '3210' } },
      topK: 1,
      includeMetadata: true,
    });
    
    if (!query.matches || query.matches.length === 0) {
      return {
        name: 'Vector Database',
        status: 'warning',
        message: 'No vectors found for key bylaws (e.g., Anti-Noise Bylaw 3210)'
      };
    }
    
    return {
      name: 'Vector Database',
      status: 'pass',
      message: 'Vector database contains data for key bylaws'
    };
  } catch (error) {
    return {
      name: 'Vector Database',
      status: 'fail',
      message: `Failed to check vector database: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// Run checklist
runChecklist().finally(async () => {
  await prisma.$disconnect();
});