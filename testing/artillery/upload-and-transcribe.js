#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const { default: fetch } = require('node-fetch');

// Configuration
const BASE_URL = 'http://localhost:3000';
const SESSION_TOKEN = process.env.SESSION_TOKEN;
const USER_ID = process.env.USER_ID;
const TEST_FILE = path.join(__dirname, 'test-files', 'test.m4a');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  console.log(`\n${colors.blue}${colors.bold}📍 ${step}${colors.reset}`);
  console.log(`${colors.yellow}⏰ ${new Date().toISOString()}${colors.reset}`);
  if (message) console.log(`${message}`);
}

async function checkAuth() {
  logStep('AUTHENTICATION CHECK', 'Verifying session token and user ID...');
  
  if (!SESSION_TOKEN || !USER_ID) {
    log('❌ Missing SESSION_TOKEN or USER_ID environment variables!', 'red');
    log('Please set them using:', 'yellow');
    log('export SESSION_TOKEN="your_session_token"', 'yellow');
    log('export USER_ID="your_user_id"', 'yellow');
    process.exit(1);
  }
  
  log(`✅ Session Token: ${SESSION_TOKEN.substring(0, 20)}...`, 'green');
  log(`✅ User ID: ${USER_ID}`, 'green');
}

async function checkFile() {
  logStep('FILE CHECK', 'Verifying test file exists...');
  
  if (!fs.existsSync(TEST_FILE)) {
    log(`❌ Test file not found: ${TEST_FILE}`, 'red');
    log('Please make sure the test file exists in the test-files directory', 'yellow');
    process.exit(1);
  }
  
  const stats = fs.statSync(TEST_FILE);
  log(`✅ File found: ${TEST_FILE}`, 'green');
  log(`📁 File size: ${(stats.size / 1024).toFixed(2)} KB`, 'blue');
}

async function uploadFile() {
  logStep('FILE UPLOAD', 'Uploading file to server...');
  
  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(TEST_FILE));
    form.append('userId', USER_ID);
    console.log(`📝 Form Data`);
    const response = await fetch(`${BASE_URL}/api/upload`, {
      method: 'POST',
      headers: {
        'Cookie': `sb-access-token=${SESSION_TOKEN}`,
        ...form.getHeaders()
      },
      body: form
    });
    
    log(`📤 Upload Response Status: ${response.status}`, response.status === 200 ? 'green' : 'red');
    
    const responseText = await response.text();
    log(`📄 Response Body: ${responseText}`, 'blue');
    
    if (response.status !== 200) {
      log('❌ Upload failed!', 'red');
      return null;
    }
    
    try {
      const responseData = JSON.parse(responseText);
      if (responseData.fileId) {
        log(`✅ File uploaded successfully! File ID: ${responseData.fileId}`, 'green');
        return responseData.fileId;
      } else {
        log('⚠️ No fileId in response', 'yellow');
        return null;
      }
    } catch (e) {
      log(`❌ Failed to parse JSON response: ${e.message}`, 'red');
      return null;
    }
    
  } catch (error) {
    log(`❌ Upload error: ${error.message}`, 'red');
    return null;
  }
}

async function checkTranscriptionStatus(fileId) {
  logStep('TRANSCRIPTION CHECK', `Checking transcription status for file: ${fileId}`);
  
  try {
    const response = await fetch(`${BASE_URL}/api/transcriptions/${fileId}`, {
      headers: {
        'Cookie': `sb-access-token=${SESSION_TOKEN}`
      }
    });
    
    log(`📝 Transcription Status Response: ${response.status}`, response.status === 200 ? 'green' : 'red');
    
    const responseText = await response.text();
    log(`📄 Response: ${responseText}`, 'blue');
    
    if (response.status === 200) {
      try {
        const data = JSON.parse(responseText);
        log(`✅ Transcription data retrieved successfully`, 'green');
        return data;
      } catch (e) {
        log(`❌ Failed to parse transcription response: ${e.message}`, 'red');
      }
    }
    
    return null;
  } catch (error) {
    log(`❌ Transcription check error: ${error.message}`, 'red');
    return null;
  }
}

async function listFiles() {
  logStep('FILES LIST', 'Retrieving all files from server...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/files`, {
      headers: {
        'Cookie': `sb-access-token=${SESSION_TOKEN}`
      }
    });
    
    log(`📁 Files List Response: ${response.status}`, response.status === 200 ? 'green' : 'red');
    
    const responseText = await response.text();
    
    if (response.status === 200) {
      try {
        const files = JSON.parse(responseText);
        log(`✅ Found ${files.length} files`, 'green');
        
        if (files.length > 0) {
          log('📋 Recent files:', 'blue');
          files.slice(0, 5).forEach((file, index) => {
            log(`  ${index + 1}. ${file.filename || file.name || 'Unknown'} (ID: ${file.id})`, 'blue');
          });
        }
        
        return files;
      } catch (e) {
        log(`❌ Failed to parse files response: ${e.message}`, 'red');
      }
    } else {
      log(`📄 Response: ${responseText}`, 'blue');
    }
    
    return [];
  } catch (error) {
    log(`❌ Files list error: ${error.message}`, 'red');
    return [];
  }
}

async function main() {
  log(`${colors.bold}🚀 Starting Upload and Transcribe Test${colors.reset}`, 'green');
  
  // Step 1: Check authentication
  await checkAuth();
  
  // Step 2: Check test file
  await checkFile();
  
  // Step 3: Upload file
  const fileId = await uploadFile();
  
  if (!fileId) {
    log('❌ Upload failed, stopping test', 'red');
    process.exit(1);
  }
  
  // Step 4: Wait a bit for processing
  logStep('WAITING', 'Waiting 3 seconds for initial processing...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Step 5: Check transcription status
  await checkTranscriptionStatus(fileId);
  
  // Step 6: List all files to verify
  await listFiles();
  
  log(`\n${colors.bold}✅ Test completed!${colors.reset}`, 'green');
  log('Check your Supabase dashboard and Replicate logs to verify the upload and processing.', 'blue');
}

// Handle errors
process.on('unhandledRejection', (error) => {
  log(`❌ Unhandled error: ${error.message}`, 'red');
  process.exit(1);
});

// Run the script
main().catch(error => {
  log(`❌ Script error: ${error.message}`, 'red');
  process.exit(1);
});