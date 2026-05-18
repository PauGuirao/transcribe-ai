import { json } from '../utils/http';
import { requireUser } from '../utils/auth';
import { uuidv4 } from '../utils/ids';
import type { Env } from '../types';

const ALLOWED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/mp4',
  'audio/ogg',
  'audio/webm',
  'audio/x-m4a',
  'audio/flac',
  'audio/aac',
  'audio/x-ms-wma',
  'audio/aiff',
  'audio/mp3',
  'audio/m4a',
];

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB max for presigned uploads
const PRESIGNED_URL_EXPIRY = 3600; // 1 hour

interface PresignedUploadRequest {
  filename: string;
  contentType: string;
  fileSize: number;
}

/**
 * Generate a presigned URL for direct R2 upload
 * This bypasses Worker memory limits by letting client upload directly to R2
 */
export async function generatePresignedUpload(request: Request, env: Env) {
  const userId = await requireUser(request, env);

  let body: PresignedUploadRequest;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }

  const { filename, contentType, fileSize } = body;

  // Validate required fields
  if (!filename || !contentType || !fileSize) {
    return json({ error: 'Missing required fields: filename, contentType, fileSize' }, 400);
  }

  // Validate file type
  if (!ALLOWED_AUDIO_TYPES.includes(contentType)) {
    return json({
      error: 'Tipus de fitxer no permès',
      allowedTypes: ALLOWED_AUDIO_TYPES,
    }, 400);
  }

  // Validate file size
  if (fileSize > MAX_FILE_SIZE) {
    return json({
      error: `Fitxer massa gran. Màxim ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      maxSize: MAX_FILE_SIZE,
    }, 413);
  }

  // Generate unique identifiers
  const audioId = uuidv4();
  const ext = filename.split('.').pop()?.toLowerCase() || 'audio';
  const uniqueFilename = `${audioId}.${ext}`;
  const filePath = `${userId}/${uniqueFilename}`;

  try {
    // Generate presigned URL for upload
    // R2 presigned URLs allow direct upload without going through Worker
    const url = new URL(`https://${env.AUDIO_FILES_PUBLIC_URL || 'r2.transcribe.workers.dev'}/${filePath}`);

    // Create a signed URL using R2's built-in signing
    // Note: This requires the bucket to be configured with a custom domain or public access
    const signedUrl = await createPresignedUrl(env, filePath, contentType, PRESIGNED_URL_EXPIRY);

    return json({
      success: true,
      uploadUrl: signedUrl,
      audioId,
      filename: uniqueFilename,
      filePath,
      expiresIn: PRESIGNED_URL_EXPIRY,
      // Include these for the confirm step
      metadata: {
        userId,
        audioId,
        filename: uniqueFilename,
        originalFilename: filename,
        contentType,
        fileSize,
        filePath,
      }
    });
  } catch (e: any) {
    console.error('Failed to generate presigned URL:', e);
    return json({ error: 'Failed to generate upload URL', details: e?.message }, 500);
  }
}

/**
 * Confirm upload completion - creates DB record after direct R2 upload
 */
export async function confirmUpload(request: Request, env: Env) {
  const userId = await requireUser(request, env);

  let body: {
    audioId: string;
    filename: string;
    originalFilename: string;
    filePath: string;
    fileSize: number;
    contentType: string;
  };

  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }

  const { audioId, filename, originalFilename, filePath, fileSize, contentType } = body;

  // Validate required fields
  if (!audioId || !filename || !filePath) {
    return json({ error: 'Missing required fields' }, 400);
  }

  // Verify the file exists in R2
  const obj = await env.AUDIO_FILES.head(filePath);
  if (!obj) {
    return json({ error: 'File not found in storage. Upload may have failed.' }, 404);
  }

  // Create audio record in database
  try {
    const record = {
      id: audioId,
      user_id: userId,
      filename,
      original_filename: originalFilename,
      storage_path: filePath,
      file_size: fileSize || obj.size,
      mime_type: contentType,
      status: 'uploaded',
    };

    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/audios`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(record),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error('Failed to create audio record:', error);
      // Clean up R2 file on DB failure
      await env.AUDIO_FILES.delete(filePath);
      return json({ error: 'Failed to create audio record' }, 500);
    }

    const inserted = (await res.json()) as any;

    // Cache the metadata in KV if available
    if (env.CACHE) {
      await env.CACHE.put(
        `audio:${audioId}`,
        JSON.stringify(record),
        { expirationTtl: 3600 } // 1 hour cache
      );
    }

    return json({
      success: true,
      audioId,
      filename,
      filePath,
      originalName: originalFilename,
      fileSize: obj.size,
      record: inserted?.[0] ?? inserted,
    });
  } catch (e: any) {
    console.error('Confirm upload error:', e);
    return json({ error: 'Failed to confirm upload', details: e?.message }, 500);
  }
}

/**
 * Create a presigned URL for R2 upload
 * Uses HMAC signing compatible with S3 presigned URLs
 */
async function createPresignedUrl(
  env: Env,
  key: string,
  contentType: string,
  expiresIn: number
): Promise<string> {
  // For R2, we need to use the S3-compatible API with credentials
  // The presigned URL allows direct PUT to R2

  const bucket = env.AUDIO_FILES_BUCKET_NAME || 'transcribe-audio-files';
  const accountId = env.CF_ACCOUNT_ID;
  const accessKeyId = env.R2_ACCESS_KEY_ID;
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey || !accountId) {
    // Fallback: Return a Worker endpoint URL if R2 credentials not configured
    // Client will upload through Worker (current behavior)
    throw new Error('R2 credentials not configured for presigned URLs');
  }

  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  const region = 'auto';
  const service = 's3';
  const method = 'PUT';
  const expires = Math.floor(Date.now() / 1000) + expiresIn;

  // Generate AWS Signature Version 4 presigned URL
  const url = await generateS3PresignedUrl({
    accessKeyId,
    secretAccessKey,
    endpoint,
    region,
    bucket,
    key,
    method,
    expires: expiresIn,
    contentType,
  });

  return url;
}

interface S3PresignedUrlParams {
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
  region: string;
  bucket: string;
  key: string;
  method: string;
  expires: number;
  contentType: string;
}

async function generateS3PresignedUrl(params: S3PresignedUrlParams): Promise<string> {
  const { accessKeyId, secretAccessKey, endpoint, region, bucket, key, method, expires, contentType } = params;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const host = new URL(endpoint).host;
  const canonicalUri = `/${bucket}/${key}`;

  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const credential = `${accessKeyId}/${credentialScope}`;

  const queryParams = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': credential,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': expires.toString(),
    'X-Amz-SignedHeaders': 'content-type;host',
  });

  const canonicalQueryString = queryParams.toString().split('&').sort().join('&');
  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\n`;
  const signedHeaders = 'content-type;host';

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join('\n');

  const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, 's3');
  const signature = await hmacHex(signingKey, stringToSign);

  queryParams.set('X-Amz-Signature', signature);

  return `${endpoint}${canonicalUri}?${queryParams.toString()}`;
}

async function sha256Hex(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmac(key: ArrayBuffer, message: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
}

async function hmacHex(key: ArrayBuffer, message: string): Promise<string> {
  const sig = await hmac(key, message);
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function getSignatureKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string
): Promise<ArrayBuffer> {
  const kDate = await hmac(new TextEncoder().encode('AWS4' + secretKey).buffer as ArrayBuffer, dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  return hmac(kService, 'aws4_request');
}
