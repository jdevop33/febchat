#!/usr/bin/env node

/**
 * FitForGov Deployment Fix Script
 * 
 * This script checks for common deployment issues and fixes them automatically.
 * Run this before deploying to Vercel to avoid common pitfalls.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Get current directory in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CORRECT_DOMAIN = 'https://app.fitforgov.com';
const REQUIRE_DOMAIN_FIX = true;

console.log('🔍 Starting FitForGov deployment fix checks...');

// Check and fix vercel.json
function checkVercelConfig() {
  const vercelPath = path.join(process.cwd(), 'vercel.json');
  
  if (!fs.existsSync(vercelPath)) {
    console.log('❌ vercel.json not found! Creating it...');
    const defaultConfig = {
      version: 2,
      buildCommand: "pnpm build",
      framework: "nextjs",
      installCommand: "pnpm install",
      env: {
        NEXTAUTH_URL: CORRECT_DOMAIN
      },
      ignoreCommand: "echo skipping linting checks for deployment!"
    };
    
    fs.writeFileSync(vercelPath, JSON.stringify(defaultConfig, null, 2));
    console.log('✅ Created vercel.json with correct configuration');
    return;
  }
  
  // Read and verify existing configuration
  try {
    const vercelConfig = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
    let needsUpdate = false;
    
    // Check NEXTAUTH_URL
    if (!vercelConfig.env) {
      vercelConfig.env = {};
      needsUpdate = true;
    }
    
    if (vercelConfig.env.NEXTAUTH_URL !== CORRECT_DOMAIN) {
      console.log(`⚠️ Incorrect NEXTAUTH_URL: ${vercelConfig.env.NEXTAUTH_URL || 'missing'}`);
      vercelConfig.env.NEXTAUTH_URL = CORRECT_DOMAIN;
      needsUpdate = true;
    }
    
    // Check build command
    if (vercelConfig.buildCommand?.includes('build-with-db.sh')) {
      console.log('⚠️ Found potentially problematic build command using shell script');
      vercelConfig.buildCommand = "pnpm build";
      needsUpdate = true;
    }
    
    // Update if needed
    if (needsUpdate) {
      fs.writeFileSync(vercelPath, JSON.stringify(vercelConfig, null, 2));
      console.log('✅ Updated vercel.json with correct configuration');
    } else {
      console.log('✅ vercel.json has correct configuration');
    }
  } catch (error) {
    console.error('❌ Error checking vercel.json:', error.message);
  }
}

// Check package.json build script
function checkPackageJson() {
  const packagePath = path.join(process.cwd(), 'package.json');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    let needsUpdate = false;
    
    // Check build script
    if (packageJson.scripts.build?.includes('build-with-db.sh')) {
      console.log('⚠️ Found potentially problematic build script in package.json');
      packageJson.scripts.build = "next build";
      needsUpdate = true;
    }
    
    // Update if needed
    if (needsUpdate) {
      fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
      console.log('✅ Updated package.json build script');
    } else {
      console.log('✅ package.json build script is correct');
    }
  } catch (error) {
    console.error('❌ Error checking package.json:', error.message);
  }
}

// Check .env file for correct configuration
function checkEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  const envLocalPath = path.join(process.cwd(), '.env.local');
  const targetPath = fs.existsSync(envLocalPath) ? envLocalPath : envPath;
  
  // Read existing env file or create new one
  let envContent = '';
  if (fs.existsSync(targetPath)) {
    envContent = fs.readFileSync(targetPath, 'utf8');
  }
  
  // Check for NEXTAUTH_URL
  if (!envContent.includes('NEXTAUTH_URL=')) {
    console.log('⚠️ NEXTAUTH_URL not found in env file');
    envContent += `\nNEXTAUTH_URL=${CORRECT_DOMAIN}\n`;
  } else if (REQUIRE_DOMAIN_FIX) {
    // Replace existing NEXTAUTH_URL with correct one
    envContent = envContent.replace(
      /NEXTAUTH_URL=.*/g,
      `NEXTAUTH_URL=${CORRECT_DOMAIN}`
    );
  }
  
  // Ensure AUTH_SECRET is set to same as NEXTAUTH_SECRET if possible
  if (envContent.includes('NEXTAUTH_SECRET=') && !envContent.includes('AUTH_SECRET=')) {
    const secretMatch = envContent.match(/NEXTAUTH_SECRET=([^\n]*)/);
    if (secretMatch && secretMatch[1]) {
      envContent += `\nAUTH_SECRET=${secretMatch[1]}\n`;
    }
  }
  
  // Write updated env file
  fs.writeFileSync(targetPath, envContent);
  console.log(`✅ Updated ${path.basename(targetPath)} with correct configuration`);
}

// Test build to ensure it works
function testBuild() {
  console.log('🔧 Testing build process locally...');
  
  try {
    execSync('next build --no-lint', { stdio: 'inherit' });
    console.log('✅ Build successful!');
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    console.log('Please fix the build issues before deploying.');
    process.exit(1);
  }
}

// Run checks
checkVercelConfig();
checkPackageJson();
checkEnvFile();

console.log('\n✨ All deployment configuration checks complete!');
console.log('Run the following command to deploy to Vercel:');
console.log('  pnpm run deploy');

// Optional: test build
if (process.argv.includes('--build')) {
  testBuild();
} 