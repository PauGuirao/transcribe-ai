import { json } from '../utils/http';
import { requireUser } from '../utils/auth';
import type { Env, R2Bucket } from '../types';

// Cache TTL for public URLs (1 hour)
const PUBLIC_URL_CACHE_TTL = 3600;

function pickBucket(env: Env, name: string): R2Bucket | null {
  return name === 'audio-files' ? env.AUDIO_FILES
       : name === 'transcriptions' ? env.TRANSCRIPTIONS
       : null;
}

/**
 * Generate a public URL for audio streaming
 * Uses R2 public bucket access or custom domain for CDN caching
 */
export async function getPublicAudioUrl(request: Request, env: Env) {
  const userId = await requireUser(request, env);

  let body: { audioId: string; filename: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }

  const { audioId, filename } = body;
  if (!audioId || !filename) {
    return json({ error: 'Missing audioId or filename' }, 400);
  }

  const filePath = `${userId}/${filename}`;

  // Check if file exists
  const obj = await env.AUDIO_FILES.head(filePath);
  if (!obj) {
    return json({ error: 'File not found' }, 404);
  }

  // Check KV cache first
  const cacheKey = `public-url:${filePath}`;
  if (env.CACHE) {
    const cached = await env.CACHE.get(cacheKey);
    if (cached) {
      return json({ success: true, url: cached, cached: true });
    }
  }

  // Generate public URL
  // Option 1: If R2 bucket has public access enabled
  const publicUrl = env.AUDIO_FILES_PUBLIC_URL
    ? `${env.AUDIO_FILES_PUBLIC_URL}/${filePath}`
    : null;

  // Option 2: Generate a signed URL for temporary access
  // This requires R2 API credentials
  let signedUrl: string | null = null;
  if (!publicUrl && env.CF_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY) {
    // Generate signed URL (valid for 1 hour)
    signedUrl = await generateSignedDownloadUrl(env, filePath, PUBLIC_URL_CACHE_TTL);
  }

  const url = publicUrl || signedUrl;
  if (!url) {
    // Fallback: Return worker download URL
    const workerUrl = `${new URL(request.url).origin}/download/audio-files/${filePath}`;
    return json({
      success: true,
      url: workerUrl,
      type: 'worker',
      cached: false,
    });
  }

  // Cache the URL
  if (env.CACHE && url) {
    await env.CACHE.put(cacheKey, url, { expirationTtl: PUBLIC_URL_CACHE_TTL - 60 }); // Cache slightly less than TTL
  }

  return json({
    success: true,
    url,
    type: publicUrl ? 'public' : 'signed',
    expiresIn: PUBLIC_URL_CACHE_TTL,
    cached: false,
  });
}

async function generateSignedDownloadUrl(env: Env, key: string, expiresIn: number): Promise<string> {
  const bucket = env.AUDIO_FILES_BUCKET_NAME || 'transcribe-audio-files';
  const accountId = env.CF_ACCOUNT_ID!;
  const accessKeyId = env.R2_ACCESS_KEY_ID!;
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY!;

  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  const region = 'auto';

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const host = `${accountId}.r2.cloudflarestorage.com`;
  const canonicalUri = `/${bucket}/${key}`;

  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const credential = `${accessKeyId}/${credentialScope}`;

  const queryParams = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': credential,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': expiresIn.toString(),
    'X-Amz-SignedHeaders': 'host',
  });

  const canonicalQueryString = queryParams.toString().split('&').sort().join('&');
  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = 'host';

  const canonicalRequest = [
    'GET',
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

// Parse a single HTTP Range header in "bytes=start-end" or "bytes=start-" form
function parseRange(rangeHeader: string | null, size: number):
  | { offset: number; end: number; length: number }
  | null {
  if (!rangeHeader) return null;
  if (!rangeHeader.startsWith('bytes=')) return null;
  const spec = rangeHeader.substring('bytes='.length).trim();
  if (!spec || spec.includes(',')) return null; // single range only
  const [startStr, endStr] = spec.split('-');
  const start = Number(startStr);
  if (!Number.isFinite(start) || start < 0 || start >= size) return null;
  let end: number;
  if (endStr === '' || endStr == null) {
    end = size - 1; // bytes=start-
  } else {
    end = Number(endStr);
    if (!Number.isFinite(end) || end < start) return null;
    end = Math.min(end, size - 1);
  }
  const length = end - start + 1;
  return { offset: start, end, length };
}

export async function download(request: Request, env: Env) {
  const url = new URL(request.url);
  const parts = url.pathname.split('/').filter(Boolean); // ['download', ...]
  // /download/{bucket}/{userId}/{filename} OR /download/{bucket}/{userId}/{audioId}/{filename}
  // legacy: /download/{userId}/{filename}
  let bucket: R2Bucket | null; let userId: string; let filePath: string;

  if (parts.length === 5) {
    bucket = pickBucket(env, parts[1]); userId = parts[2];
    const audioId = parts[3]; const filename = parts[4];
    filePath = `${userId}/${audioId}/${filename}`;
  } else if (parts.length === 4) {
    bucket = pickBucket(env, parts[1]); userId = parts[2];
    const filename = parts[3]; filePath = `${userId}/${filename}`;
  } else if (parts.length === 3) {
    bucket = env.AUDIO_FILES; userId = parts[1];
    const filename = parts[2]; filePath = `${userId}/${filename}`;
  } else {
    return json({ error: 'Invalid download path' }, 400);
  }

  // Handle authentication with proper error responses
  let authedUserId: string;
  try {
    authedUserId = await requireUser(request, env);
  } catch (error) {
    return json({ error: 'Authorization required' }, 401);
  }
  
  if (authedUserId !== userId) return json({ error: 'Access denied' }, 403);
  if (!bucket) return json({ error: 'Invalid bucket name' }, 400);

  const obj = await bucket.get(filePath);
  if (!obj) return json({ error: 'File not found' }, 404);

  const totalSize = obj.size;
  const headers = new Headers();
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Content-Type', obj.httpMetadata?.contentType || 'application/octet-stream');
  headers.set('Cache-Control', 'private, max-age=0, must-revalidate');
  // Add ETag for cache validation and conditional requests
  if (obj.etag) {
    headers.set('ETag', obj.etag);
  }

  const rangeHeader = request.headers.get('range');
  const parsed = parseRange(rangeHeader, totalSize);
  if (parsed) {
    // Partial content
    const { offset, end, length } = parsed;
    const ranged = await bucket.get(filePath, { range: { offset, length } });
    if (!ranged || !('body' in ranged) || !ranged.body) {
      // If range is not satisfiable, return 416
      const h = new Headers(headers);
      h.set('Content-Range', `bytes */${totalSize}`);
      return new Response(null, { status: 416, headers: h });
    }
    const h = new Headers(headers);
    h.set('Content-Length', String(length));
    h.set('Content-Range', `bytes ${offset}-${end}/${totalSize}`);
    return new Response(ranged.body as ReadableStream, { status: 206, headers: h });
  }

  // Full content
  headers.set('Content-Length', String(totalSize));
  return new Response(obj.body, { status: 200, headers });
}
