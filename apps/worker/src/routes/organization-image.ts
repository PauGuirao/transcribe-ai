import { json } from '../utils/http';
import { requireUser } from '../utils/auth';
import type { Env } from '../types';
import { r2Put, r2Delete } from '../adapters/r2';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

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

  // Generate filename
  const fileExtension = file.name.split('.').pop() || 'jpg';
  const filePath = `${organizationId}/logo.${fileExtension}`;

  try {
    // Delete existing logo if any (best-effort)
    try {
      await r2Delete(env.ORGANIZATION_IMAGES, `${organizationId}/logo.jpg`);
      await r2Delete(env.ORGANIZATION_IMAGES, `${organizationId}/logo.png`);
      await r2Delete(env.ORGANIZATION_IMAGES, `${organizationId}/logo.webp`);
      await r2Delete(env.ORGANIZATION_IMAGES, `${organizationId}/logo.gif`);
    } catch {
      // Ignore deletion errors
    }

    // Upload to R2
    const fileData = await file.arrayBuffer();
    await r2Put(env.ORGANIZATION_IMAGES, filePath, fileData, file.type);

    // Generate public URL for the image
    // Note: This assumes ORGANIZATION_IMAGES bucket has public access configured
    // or you're using a custom domain
    const publicUrl = `https://org-images.transcribe.workers.dev/${filePath}`;

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

export async function deleteOrganizationImage(request: Request, env: Env) {
  const userId = await requireUser(request, env);

  const url = new URL(request.url);
  const organizationId = url.pathname.split('/').pop();

  if (!organizationId) {
    return json({ error: 'Organization ID is required' }, 400);
  }

  try {
    // Delete all possible logo formats
    await Promise.allSettled([
      r2Delete(env.ORGANIZATION_IMAGES, `${organizationId}/logo.jpg`),
      r2Delete(env.ORGANIZATION_IMAGES, `${organizationId}/logo.png`),
      r2Delete(env.ORGANIZATION_IMAGES, `${organizationId}/logo.webp`),
      r2Delete(env.ORGANIZATION_IMAGES, `${organizationId}/logo.gif`),
    ]);

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
