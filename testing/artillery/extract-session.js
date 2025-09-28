#!/usr/bin/env node

/**
 * Session Token Extractor for Single Account Load Testing
 * 
 * This script helps you extract your session token from the browser
 * to use with Artillery load testing using a single Google account.
 */

console.log(`
🔐 SESSION TOKEN EXTRACTOR FOR LOAD TESTING
==========================================

To test with 10-30 concurrent users using just ONE Google account, follow these steps:

1. 📱 OPEN YOUR BROWSER and login to your app at http://localhost:3000

2. 🔍 OPEN DEVELOPER TOOLS (F12 or Cmd+Option+I)

3. 📋 GO TO APPLICATION/STORAGE TAB → Cookies → http://localhost:3000

4. 🔑 FIND YOUR SESSION COOKIE (usually named 'session', 'auth-token', or similar)

5. 📝 COPY THE VALUE and run:
   export SESSION_TOKEN="your_session_token_here"
   export USER_ID="your_user_id_here"

6. 🚀 RUN THE LOAD TEST:
   npx artillery run single-account-load-test.yml

ALTERNATIVE METHOD - Using Browser Console:
==========================================

1. Login to your app
2. Open browser console (F12)
3. Run this JavaScript code:

   // For Next.js apps with next-auth
   console.log('Session Token:', document.cookie);
   
   // Or check localStorage
   console.log('Local Storage:', localStorage);
   
   // Or check sessionStorage  
   console.log('Session Storage:', sessionStorage);

4. Look for tokens in the output

WHY THIS WORKS:
==============
• Artillery will simulate 10-30 different "users" but all using your same session
• Each virtual user makes requests independently 
• Your server sees concurrent requests from the same authenticated user
• This tests your app's ability to handle concurrent load from authenticated users
• Perfect for testing database connections, API rate limits, and server performance

WHAT GETS TESTED:
================
✅ Concurrent file uploads
✅ Database connection pooling  
✅ API rate limiting
✅ Server memory/CPU usage
✅ Response times under load
✅ Error handling under stress

Note: This simulates load, not actual different users. For testing user isolation,
you'd need multiple accounts, but for performance testing, this is perfect!
`);

// Helper function to validate session token format
function validateSessionToken(token) {
  if (!token || token.length < 10) {
    console.log('❌ Session token seems too short. Make sure you copied the full token.');
    return false;
  }
  
  if (token.includes('your_session_token_here')) {
    console.log('❌ Please replace the placeholder with your actual session token.');
    return false;
  }
  
  console.log('✅ Session token format looks valid!');
  return true;
}

// Check if environment variables are set
if (process.env.SESSION_TOKEN && process.env.USER_ID) {
  console.log('\n🎉 ENVIRONMENT VARIABLES DETECTED:');
  console.log('SESSION_TOKEN:', process.env.SESSION_TOKEN.substring(0, 20) + '...');
  console.log('USER_ID:', process.env.USER_ID);
  
  if (validateSessionToken(process.env.SESSION_TOKEN)) {
    console.log('\n✅ Ready to run load tests! Execute:');
    console.log('npx artillery run single-account-load-test.yml');
  }
} else {
  console.log('\n⚠️  Environment variables not set yet. Follow the steps above first.');
}