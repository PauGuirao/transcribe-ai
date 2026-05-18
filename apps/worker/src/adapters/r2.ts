import type { R2Bucket } from '../types';

export async function r2Put(bucket: R2Bucket, path: string, content: string | ArrayBuffer | ReadableStream, contentType='application/json') {
  return bucket.put(path, content, { httpMetadata: { contentType, cacheControl: 'no-store, no-cache, must-revalidate, max-age=0, s-maxage=0' }});
}

export async function r2GetOr404(bucket: R2Bucket, path: string) {
  const obj = await bucket.get(path);
  if (!obj) return null;
  return obj;
}

export async function r2Delete(bucket: R2Bucket, path: string) { await bucket.delete(path); }
