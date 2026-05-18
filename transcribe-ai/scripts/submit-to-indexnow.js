#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const config = {
  host: 'www.transcriu.com',
  key: '68fd4f4da6604a77b32b1619ef99e221',
  keyLocation: 'https://www.transcriu.com/68fd4f4da6604a77b32b1619ef99e221.txt',
  baseUrl: 'https://www.transcriu.com',
  batchSize: 100 // IndexNow supports up to 10,000 URLs per request, but we'll use smaller batches
};

// Load landings data
const landingsPath = path.join(__dirname, '../src/app/logopedia/landings.json');
const landingsData = JSON.parse(fs.readFileSync(landingsPath, 'utf8'));

// Static pages to submit
const staticPages = [
  '',
  '/transcribe',
  '/pricing',
  '/help',
  '/privacy',
  '/terms',
  '/tutorials',
  '/profiles'
];

// Generate all URLs
function generateAllUrls() {
  const urls = [];
  
  // Add static pages
  staticPages.forEach(page => {
    urls.push(`${config.baseUrl}${page}`);
  });
  
  // Add landing pages
  const landingSlugs = Object.keys(landingsData);
  landingSlugs.forEach(slug => {
    urls.push(`${config.baseUrl}/logopedia/${slug}`);
  });
  
  return urls;
}

// Submit URLs to IndexNow API
function submitToIndexNow(urlList) {
  return new Promise((resolve, reject) => {
    const payload = {
      host: config.host,
      key: config.key,
      keyLocation: config.keyLocation,
      urlList: urlList
    };
    
    const postData = JSON.stringify(payload);
    
    const options = {
      hostname: 'api.indexnow.org',
      port: 443,
      path: '/IndexNow',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({
            success: true,
            statusCode: res.statusCode,
            data: data,
            urlCount: urlList.length
          });
        } else {
          reject({
            success: false,
            statusCode: res.statusCode,
            data: data,
            urlCount: urlList.length
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject({
        success: false,
        error: error.message,
        urlCount: urlList.length
      });
    });
    
    req.write(postData);
    req.end();
  });
}

// Split URLs into batches and submit
async function submitAllUrls() {
  const allUrls = generateAllUrls();
  console.log(`📊 Total URLs to submit: ${allUrls.length}`);
  console.log(`🔑 Using key: ${config.key}`);
  console.log(`🌐 Host: ${config.host}`);
  console.log(`📍 Key location: ${config.keyLocation}\n`);
  
  // Split into batches
  const batches = [];
  for (let i = 0; i < allUrls.length; i += config.batchSize) {
    batches.push(allUrls.slice(i, i + config.batchSize));
  }
  
  console.log(`📦 Submitting ${batches.length} batch(es)...\n`);
  
  let totalSubmitted = 0;
  let successfulBatches = 0;
  let failedBatches = 0;
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`🚀 Submitting batch ${i + 1}/${batches.length} (${batch.length} URLs)...`);
    
    try {
      const result = await submitToIndexNow(batch);
      console.log(`✅ Batch ${i + 1} submitted successfully (Status: ${result.statusCode})`);
      totalSubmitted += result.urlCount;
      successfulBatches++;
      
      // Add delay between requests to be respectful
      if (i < batches.length - 1) {
        console.log('⏳ Waiting 2 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (error) {
      console.error(`❌ Batch ${i + 1} failed:`, error.statusCode ? `Status ${error.statusCode}` : error.error);
      if (error.data) {
        console.error('Response:', error.data);
      }
      failedBatches++;
    }
  }
  
  console.log('\n📈 Summary:');
  console.log(`   Total URLs: ${allUrls.length}`);
  console.log(`   Successfully submitted: ${totalSubmitted}`);
  console.log(`   Successful batches: ${successfulBatches}`);
  console.log(`   Failed batches: ${failedBatches}`);
  
  if (successfulBatches > 0) {
    console.log('\n🎉 URLs have been submitted to IndexNow!');
    console.log('🔍 Bing will now be notified about your content updates.');
    console.log('⏰ It may take some time for the URLs to appear in search results.');
  }
  
  if (failedBatches > 0) {
    console.log('\n⚠️  Some batches failed. You can retry the script later.');
  }
}

// Show sample URLs before submitting
function showSampleUrls() {
  const allUrls = generateAllUrls();
  console.log('🔍 Sample URLs that will be submitted:');
  console.log('   Static pages:');
  staticPages.slice(0, 3).forEach(page => {
    console.log(`     - ${config.baseUrl}${page}`);
  });
  console.log('   Landing pages:');
  Object.keys(landingsData).slice(0, 5).forEach(slug => {
    console.log(`     - ${config.baseUrl}/logopedia/${slug}`);
  });
  console.log(`   ... and ${allUrls.length - 8} more URLs\n`);
}

// Main execution
async function main() {
  console.log('🚀 IndexNow URL Submission Script');
  console.log('==================================\n');
  
  // Verify key file exists
  const keyFilePath = path.join(__dirname, '../public/68fd4f4da6604a77b32b1619ef99e221.txt');
  if (!fs.existsSync(keyFilePath)) {
    console.error('❌ Key file not found in public directory!');
    console.error(`   Expected: ${keyFilePath}`);
    console.error('   Make sure the verification file is in the public folder.');
    process.exit(1);
  }
  
  showSampleUrls();
  
  // Ask for confirmation (in a real scenario, you might want to add a prompt)
  console.log('⚡ Starting submission...\n');
  
  try {
    await submitAllUrls();
  } catch (error) {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { submitToIndexNow, generateAllUrls };