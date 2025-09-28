#!/usr/bin/env node

/**
 * Setup script for Artillery load testing with Google OAuth
 * This script helps extract session tokens for authenticated testing
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Artillery Load Test Setup for TranscribeAI');
console.log('===============================================\n');

console.log('Since your app uses Google OAuth, you need to manually authenticate users and extract session tokens.\n');

console.log('📋 Steps to set up authenticated load testing:\n');

console.log('1. 📁 Create test audio files:');
console.log('   mkdir -p test-files');
console.log('   # Add 5 sample audio files: sample-audio-1.mp3, sample-audio-2.mp3, etc.\n');

console.log('2. 🔐 Extract session tokens:');
console.log('   a) Open your app in 10 different browser profiles/incognito windows');
console.log('   b) Sign in with different Google accounts in each');
console.log('   c) Open Developer Tools > Application > Cookies');
console.log('   d) Find the session cookie (usually "next-auth.session-token" or similar)');
console.log('   e) Copy the token value\n');

console.log('3. 📝 Update test-sessions.csv:');
console.log('   Replace the example tokens with real ones from step 2\n');

console.log('4. 🎯 Install Artillery (if not already installed):');
console.log('   npm install -g artillery\n');

console.log('5. 🏃 Run the load test:');
console.log('   artillery run load-test-config.yml\n');

console.log('⚠️  Alternative approaches for Google OAuth testing:\n');

console.log('🔧 Option 1: Create test accounts');
console.log('   - Create 10 Google accounts specifically for testing');
console.log('   - Use a tool like Puppeteer to automate the OAuth flow');
console.log('   - Extract tokens programmatically\n');

console.log('🔧 Option 2: Mock authentication for testing');
console.log('   - Create a test environment with bypassed OAuth');
console.log('   - Use environment variables to enable "test mode"');
console.log('   - Generate mock session tokens\n');

console.log('🔧 Option 3: Use Artillery with Playwright');
console.log('   - Install artillery-engine-playwright');
console.log('   - Automate the full OAuth flow including Google login\n');

// Create test directories
const testFilesDir = path.join(__dirname, 'test-files');
if (!fs.existsSync(testFilesDir)) {
  fs.mkdirSync(testFilesDir);
  console.log('✅ Created test-files directory');
}

// Check if package.json exists to suggest Artillery installation
const packageJsonPath = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  console.log('\n📦 To add Artillery to your project dependencies:');
  console.log('   npm install --save-dev artillery');
  console.log('   # Then run: npx artillery run load-test-config.yml');
}

console.log('\n🎉 Setup complete! Follow the steps above to run your load test.');
console.log('\n💡 Pro tip: Start with a smaller number of users (2-3) to test your setup first.');

// Create a sample Puppeteer script for OAuth automation
const puppeteerScript = `
// Example Puppeteer script for automating Google OAuth (advanced)
const puppeteer = require('puppeteer');

async function extractSessionTokens() {
  const browser = await puppeteer.launch({ headless: false });
  const tokens = [];
  
  for (let i = 0; i < 10; i++) {
    const page = await browser.newPage();
    
    // Navigate to your app
    await page.goto('http://localhost:3000');
    
    // Click sign in with Google
    await page.click('[data-testid="google-signin"]'); // Adjust selector
    
    // Handle Google OAuth flow
    // ... (implement OAuth steps)
    
    // Extract session token
    const cookies = await page.cookies();
    const sessionCookie = cookies.find(c => c.name.includes('session'));
    
    if (sessionCookie) {
      tokens.push({
        sessionToken: sessionCookie.value,
        userId: \`user-\${i + 1}\`
      });
    }
    
    await page.close();
  }
  
  // Write to CSV
  const csv = 'sessionToken,userId\\n' + 
    tokens.map(t => \`\${t.sessionToken},\${t.userId}\`).join('\\n');
  
  require('fs').writeFileSync('test-sessions.csv', csv);
  
  await browser.close();
}

// Uncomment to run:
// extractSessionTokens();
`;

fs.writeFileSync(path.join(__dirname, 'extract-tokens-example.js'), puppeteerScript);
console.log('\n📄 Created extract-tokens-example.js for reference');