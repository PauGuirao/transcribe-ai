# Load Testing TranscribeAI with Artillery

This guide explains how to perform load testing on your TranscribeAI SaaS application with 10 concurrent users uploading files and performing transcriptions, despite using Google OAuth authentication.

## 🎯 Goal
Test 10 concurrent users:
- Authenticating via Google OAuth
- Uploading audio files
- Performing transcriptions
- Browsing results

## 🚧 Challenge: Google OAuth Authentication
Since your app uses Google OAuth, traditional load testing tools can't easily simulate the authentication flow. Here are the solutions:

## 🔧 Solution 1: Pre-authenticated Sessions (Recommended)

### Step 1: Install Artillery
```bash
npm install -g artillery
# or locally in your project
npm install --save-dev artillery
```

### Step 2: Create Test Audio Files
```bash
mkdir test-files
# Add 5 sample audio files:
# - sample-audio-1.mp3
# - sample-audio-2.mp3
# - sample-audio-3.mp3
# - sample-audio-4.mp3
# - sample-audio-5.mp3
```

### Step 3: Extract Session Tokens
1. Open 10 different browser profiles or incognito windows
2. Sign in to your app with different Google accounts in each
3. For each authenticated session:
   - Open Developer Tools (F12)
   - Go to Application > Cookies
   - Find your session cookie (likely `next-auth.session-token` or similar)
   - Copy the token value and user ID

### Step 4: Update test-sessions.csv
Replace the example data with real session tokens:
```csv
sessionToken,userId
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...,user-id-1
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...,user-id-2
...
```

### Step 5: Run the Load Test
```bash
artillery run load-test-config.yml
```

## 🔧 Solution 2: Automated Token Extraction

### Using Puppeteer (Advanced)
```bash
npm install puppeteer
```

Create a script to automate Google OAuth and extract tokens:
```javascript
// See extract-tokens-example.js for a starting template
```

## 🔧 Solution 3: Test Environment with Mock Auth

### Create a Test Mode
1. Add environment variable `NODE_ENV=test`
2. Modify your auth middleware to bypass Google OAuth in test mode
3. Generate mock session tokens for testing

Example middleware modification:
```javascript
// In your auth middleware
if (process.env.NODE_ENV === 'test' && req.headers['x-test-user']) {
  // Bypass OAuth, create mock session
  req.user = { id: req.headers['x-test-user'], email: 'test@example.com' };
  return next();
}
```

## 🔧 Solution 4: Artillery + Playwright Engine

For full browser automation including OAuth:
```bash
npm install artillery-engine-playwright
```

Create a Playwright-based test that handles the full OAuth flow.

## 📊 Understanding the Test Results

Artillery will provide metrics including:
- **Request rate**: Requests per second
- **Response time**: p50, p95, p99 percentiles
- **Error rate**: Failed requests percentage
- **Throughput**: Successful operations per second

Key metrics to watch:
- File upload success rate
- Transcription processing time
- Database performance under load
- Memory and CPU usage

## 🎛️ Test Configuration

The current config (`load-test-config.yml`) includes:
- **Duration**: 5 minutes (300 seconds)
- **Concurrent users**: 10
- **Scenarios**: File upload → Transcription → Results viewing

## 🚨 Important Considerations

### Rate Limits
- Google OAuth has rate limits
- Your transcription service may have processing limits
- Database connections may be limited

### Test Data
- Use small audio files (< 1MB) for faster testing
- Ensure you have enough storage space
- Clean up test data after testing

### Monitoring
Monitor during tests:
- Server CPU and memory usage
- Database performance
- File storage usage
- Network bandwidth

## 🔍 Troubleshooting

### Common Issues:
1. **401 Unauthorized**: Session tokens expired or invalid
2. **413 Payload Too Large**: Audio files too big
3. **503 Service Unavailable**: Server overloaded
4. **Database connection errors**: Too many concurrent connections

### Solutions:
- Refresh session tokens regularly
- Use smaller test files
- Increase server resources
- Optimize database connection pooling

## 🚀 Running the Test

1. Setup: `node setup-load-test.js`
2. Prepare sessions: Update `test-sessions.csv`
3. Run test: `artillery run load-test-config.yml`
4. Analyze results: Review Artillery's output report

## 📈 Scaling Considerations

Based on test results, consider:
- Horizontal scaling (more server instances)
- Database optimization
- CDN for file uploads
- Queue system for transcription processing
- Caching strategies

## 🎉 Success Criteria

A successful load test should show:
- < 5% error rate
- Response times under 2 seconds for most requests
- Stable performance throughout the test duration
- No memory leaks or resource exhaustion