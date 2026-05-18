import { json } from '../utils/http';
import { requireUser, httpError } from '../utils/auth';
import type { Env } from '../types';
import { r2Put, r2Delete } from '../adapters/r2';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ADMIN_ROLES = new Set(['admin', 'owner']);
const ORG_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'] as const;
const ORG_IMAGE_PREFIX = 'org-images';

function orgImageKey(organizationId: string, ext: string) {
  return `${ORG_IMAGE_PREFIX}/${organizationId}/logo.${ext}`;
}

/**
 * Verify the user is an admin/owner of the organization. Throws 403 if not.
 * Without this check, any signed-in user can mutate any org's logo.
 */
async function requireOrgAdmin(env: Env, userId: string, organizationId: string) {
  const url = `${env.SUPABASE_URL}/rest/v1/organization_members?select=role&user_id=eq.${encodeURIComponent(
    userId,
  )}&organization_id=eq.${encodeURIComponent(organizationId)}&limit=1`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    console.error('[ORG-IMAGE] Membership lookup failed:', res.status, await res.text());
    throw httpError(500, 'Failed to verify organization membership');
  }

  const rows = (await res.json()) as Array<{ role?: string }> | null;
  const role = rows?.[0]?.role;
  if (!role || !ADMIN_ROLES.has(role)) {
    throw httpError(403, 'You do not have permission to modify this organization');
  }
}

export async function uploadOrganizationImage(request: Request, env: Env) {
  const userId = await requireUser(request, env);

  const form = await request.formData();
  const file = form.get('image') as File | null;
  const organizationId = form.get('organizationId') as string | null;

  if (!file) {
    return json({ error: 'No image file provided' }, 400);
  }

  if (!organizationId) {
    return json({ error: 'Organization ID is required' }, 400);
  }

  await requireOrgAdmin(env, userId, organizationId);

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return json({
      error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.',
      allowedTypes: ALLOWED_TYPES,
    }, 400);
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return json({
      error: `File size too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`,
      code: 'FILE_TOO_LARGE',
      fileSize: file.size,
      maxSize: MAX_FILE_SIZE,
    }, 413);
  }

  // Normalize extension by content type, not filename, so the URL is predictable.
  const extFromMime: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  const fileExtension = extFromMime[file.type] || 'jpg';
  const filePath = orgImageKey(organizationId, fileExtension);

  try {
    // Best-effort delete of any previously stored logo with a different extension.
    await Promise.allSettled(
      ORG_IMAGE_EXTENSIONS.map((ext) =>
        r2Delete(env.TRANSCRIPTIONS, orgImageKey(organizationId, ext)),
      ),
    );

    // Upload to R2 (reuses the TRANSCRIPTIONS bucket under the org-images/ prefix).
    const fileData = await file.arrayBuffer();
    await r2Put(env.TRANSCRIPTIONS, filePath, fileData, file.type);

    // Served by the worker itself via the public GET /organization-image/* route.
    // Cache-busting query so the browser refreshes when the logo changes.
    const workerOrigin = new URL(request.url).origin;
    const publicUrl = `${workerOrigin}/organization-image/${organizationId}.${fileExtension}?v=${Date.now()}`;

    return json({
      success: true,
      filePath,
      publicUrl,
      message: 'Organization image uploaded successfully',
    });
  } catch (e: any) {
    console.error('Organization image upload error:', e);
    return json({
      error: 'Failed to upload organization image',
      details: e?.message,
    }, 500);
  }
}

/**
 * Public GET /organization-image/{orgId}.{ext}
 *
 * Serves an org logo to anyone with the URL — no auth. Logos are surfaced in
 * <img> tags and the navbar where attaching an Authorization header isn't
 * practical, so we treat them as effectively public the moment they're uploaded.
 */
export async function serveOrganizationImage(request: Request, env: Env) {
  const url = new URL(request.url);
  // Path looks like /organization-image/{orgId}.{ext}
  const last = url.pathname.split('/').pop() || '';
  const dot = last.lastIndexOf('.');
  if (dot <= 0) return json({ error: 'Invalid image path' }, 400);
  const organizationId = last.slice(0, dot);
  const ext = last.slice(dot + 1).toLowerCase();
  if (!(ORG_IMAGE_EXTENSIONS as readonly string[]).includes(ext)) {
    return json({ error: 'Unsupported image extension' }, 400);
  }

  const obj = await env.TRANSCRIPTIONS.get(orgImageKey(organizationId, ext));
  if (!obj) return json({ error: 'Image not found' }, 404);

  const headers = new Headers();
  headers.set(
    'Content-Type',
    obj.httpMetadata?.contentType || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
  );
  // Public + cache; uploads append ?v=<ts> so callers always get the fresh one.
  headers.set('Cache-Control', 'public, max-age=86400, immutable');
  if (obj.etag) headers.set('ETag', obj.etag);
  headers.set('Access-Control-Allow-Origin', '*');

  return new Response(obj.body, { headers });
}

export async function deleteOrganizationImage(request: Request, env: Env) {
  const userId = await requireUser(request, env);

  const url = new URL(request.url);
  const organizationId = url.pathname.split('/').pop();

  if (!organizationId) {
    return json({ error: 'Organization ID is required' }, 400);
  }

  await requireOrgAdmin(env, userId, organizationId);

  try {
    await Promise.allSettled(
      ORG_IMAGE_EXTENSIONS.map((ext) =>
        r2Delete(env.TRANSCRIPTIONS, orgImageKey(organizationId, ext)),
      ),
    );

    return json({
      success: true,
      message: 'Organization image deleted successfully',
    });
  } catch (e: any) {
    console.error('Organization image delete error:', e);
    return json({
      error: 'Failed to delete organization image',
      details: e?.message,
    }, 500);
  }
}
