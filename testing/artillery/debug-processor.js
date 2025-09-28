module.exports = {
  setAuth,
  logStep,
  logResponse,
  logUploadResponse,
  logTranscriptionResponse,
  logFilesResponse
};

function setAuth(context, events, done) {
  const sessionToken = process.env.SESSION_TOKEN;
  const userId = process.env.USER_ID;
  
  console.log('\n🔐 AUTHENTICATION SETUP:');
  console.log(`Session Token: ${sessionToken ? sessionToken.substring(0, 20) + '...' : 'NOT SET'}`);
  console.log(`User ID: ${userId || 'NOT SET'}`);
  
  if (!sessionToken || !userId) {
    console.error('❌ Missing SESSION_TOKEN or USER_ID environment variables!');
    return done(new Error('Missing authentication credentials'));
  }
  
  context.vars.sessionCookie = `sb-access-token=${sessionToken}`;
  context.vars.userId = userId;
  
  console.log('✅ Authentication configured successfully');
  return done();
}

function logStep(context, events, done) {
  console.log(`\n📍 STEP: Starting new action`);
  console.log(`⏰ Time: ${new Date().toISOString()}`);
  return done();
}

function logResponse(requestParams, response, context, events, done) {
  console.log('\n📥 DASHBOARD RESPONSE:');
  console.log(`Status: ${response.statusCode}`);
  console.log(`Headers: ${JSON.stringify(response.headers, null, 2)}`);
  
  if (response.statusCode >= 400) {
    console.log(`❌ Error Response Body: ${response.body}`);
  } else {
    console.log(`✅ Success - Response length: ${response.body ? response.body.length : 0} chars`);
  }
  
  return done();
}

function logUploadResponse(requestParams, response, context, events, done) {
  console.log('\n📤 FILE UPLOAD RESPONSE:');
  console.log(`Status: ${response.statusCode}`);
  console.log(`Headers: ${JSON.stringify(response.headers, null, 2)}`);
  
  try {
    const responseBody = JSON.parse(response.body);
    console.log(`Response Body: ${JSON.stringify(responseBody, null, 2)}`);
    
    if (responseBody.fileId) {
      console.log(`✅ File uploaded successfully! File ID: ${responseBody.fileId}`);
    } else {
      console.log(`⚠️ No fileId in response`);
    }
  } catch (e) {
    console.log(`Raw Response Body: ${response.body}`);
    console.log(`❌ Failed to parse JSON response: ${e.message}`);
  }
  
  return done();
}

function logTranscriptionResponse(requestParams, response, context, events, done) {
  console.log('\n📝 TRANSCRIPTION STATUS RESPONSE:');
  console.log(`Status: ${response.statusCode}`);
  
  try {
    const responseBody = JSON.parse(response.body);
    console.log(`Transcription Status: ${JSON.stringify(responseBody, null, 2)}`);
  } catch (e) {
    console.log(`Raw Response Body: ${response.body}`);
    console.log(`❌ Failed to parse transcription response: ${e.message}`);
  }
  
  return done();
}

function logFilesResponse(requestParams, response, context, events, done) {
  console.log('\n📁 FILES LIST RESPONSE:');
  console.log(`Status: ${response.statusCode}`);
  
  try {
    const responseBody = JSON.parse(response.body);
    console.log(`Files Count: ${responseBody.length || 0}`);
    console.log(`Files: ${JSON.stringify(responseBody, null, 2)}`);
  } catch (e) {
    console.log(`Raw Response Body: ${response.body}`);
    console.log(`❌ Failed to parse files response: ${e.message}`);
  }
  
  return done();
}