import type { Env, ExecutionContext, MessageBatch } from './types';
import { json, ok, notFound, methodNotAllowed, corsPreflight } from './utils/http';
import { upload } from './routes/upload';
import { download, getPublicAudioUrl } from './routes/download';
import { remove } from './routes/delete';
import { processBatch } from './queue/processor';
import { handleTranscribeDirectGet, handleTranscribeDirectPost } from './routes/transcribe-direct';
import { handleUpdateTranscriptionPost } from './routes/update-transcription';
import { uploadOrganizationImage, deleteOrganizationImage, serveOrganizationImage } from './routes/organization-image';
import { generatePresignedUpload, confirmUpload } from './routes/presigned-upload';
import { chunkedUploadInit, chunkedUploadSource, chunkedUploadChunk, chunkedUploadProcess } from './routes/chunked-upload';
import { handleWhatsAppEvent, handleWhatsAppVerify } from './routes/whatsapp';
import { TranscriptionStatus } from './durable-objects/transcription-status';

const routes: Record<string, (req: Request, env: Env) => Promise<Response>> = {
  'POST /upload': upload,
  'GET /': async () => ok(),
  // dynamic transcribe-direct stays dynamic to avoid circular deps
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    try {
      if (request.method === 'OPTIONS') return corsPreflight();

      const url = new URL(request.url);
      const path = url.pathname;

      if (path.startsWith('/download/')) {
        if (request.method !== 'GET') return methodNotAllowed();
        return download(request, env);
      }
      if (path.startsWith('/delete/')) {
        if (request.method !== 'DELETE') return methodNotAllowed();
        return remove(request, env);
      }
      if (path === '/transcribe-direct') {
        if (request.method === 'GET') return handleTranscribeDirectGet(env);
        if (request.method === 'POST') return handleTranscribeDirectPost(request, env);
        return methodNotAllowed();
      }
      if (path === '/update-transcription') {
        if (request.method === 'POST') return handleUpdateTranscriptionPost(request, env);
        return methodNotAllowed();
      }
      if (path === '/organization-image') {
        if (request.method === 'POST') return uploadOrganizationImage(request, env);
        return methodNotAllowed();
      }
      if (path.startsWith('/organization-image/')) {
        // Public read for <img> tags: GET /organization-image/{orgId}.{ext}.
        // Auth'd admin delete: DELETE /organization-image/{orgId}.
        if (request.method === 'GET') return serveOrganizationImage(request, env);
        if (request.method === 'DELETE') return deleteOrganizationImage(request, env);
        return methodNotAllowed();
      }

      // Presigned upload endpoints
      if (path === '/presigned-upload') {
        if (request.method === 'POST') return generatePresignedUpload(request, env);
        return methodNotAllowed();
      }
      if (path === '/confirm-upload') {
        if (request.method === 'POST') return confirmUpload(request, env);
        return methodNotAllowed();
      }

      // Chunked-upload endpoints (primary transcription path)
      if (path === '/chunked-upload/init') {
        if (request.method === 'POST') return chunkedUploadInit(request, env);
        return methodNotAllowed();
      }
      if (path === '/chunked-upload/source') {
        if (request.method === 'POST') return chunkedUploadSource(request, env);
        return methodNotAllowed();
      }
      if (path === '/chunked-upload/chunk') {
        if (request.method === 'POST') return chunkedUploadChunk(request, env);
        return methodNotAllowed();
      }
      if (path === '/chunked-upload/process') {
        if (request.method === 'POST') return chunkedUploadProcess(request, env);
        return methodNotAllowed();
      }

      // Public audio URL endpoint (returns CDN URL)
      if (path === '/public-url') {
        if (request.method === 'POST') return getPublicAudioUrl(request, env);
        return methodNotAllowed();
      }

      // WhatsApp Cloud API webhook (Meta).
      if (path === '/wa/webhook') {
        if (request.method === 'GET') return handleWhatsAppVerify(request, env);
        if (request.method === 'POST') return handleWhatsAppEvent(request, env, ctx);
        return methodNotAllowed();
      }

      // WebSocket endpoint for real-time status
      if (path.startsWith('/ws/status/')) {
        const audioId = path.split('/').pop();
        if (!audioId) return notFound();

        if (env.TRANSCRIPTION_STATUS) {
          const id = env.TRANSCRIPTION_STATUS.idFromName(audioId);
          const stub = env.TRANSCRIPTION_STATUS.get(id);
          return stub.fetch(request);
        }
        return json({ error: 'Real-time status not configured' }, 503);
      }

      const key = `${request.method} ${path}`;
      const handler = routes[key];
      if (handler) return handler(request, env);

      return notFound();
    } catch (e: any) {
      const status = Number(e?.status) || 500;
      return json({ error: e?.message ?? 'Internal error', details: e?.details }, status);
    }
  },

  async queue(batch: MessageBatch<string>, env: Env, ctx: ExecutionContext) {
    await processBatch(batch, env, ctx);
  },
};

// Export Durable Object class
export { TranscriptionStatus };
