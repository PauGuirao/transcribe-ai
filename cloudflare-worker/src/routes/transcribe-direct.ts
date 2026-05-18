// src/routes/transcribe-direct.ts
import type { Env } from '../types';
import { json } from '../utils/http';
import { randomId } from '../utils/ids';
import { versionedTranscriptionPath } from '../utils/misc';
import { rpc, upsertTranscription, update } from '../adapters/supabase';
import { transcribeWithWorkersAI, sanitizeSegments } from '../adapters/ai';
import { r2Put } from '../adapters/r2';
import { cleanupOldVersions } from '../utils/storage-cleanup';
import { broadcastStatus } from '../utils/status-broadcast';

// Timeout for AI transcription (in milliseconds)
const AI_TIMEOUT_MS = 25000; // 25 seconds

interface EnvironmentCheck {
  SUPABASE_URL: boolean;
  SUPABASE_SERVICE_ROLE_KEY: boolean;
  AI_BINDING: boolean;
  INGEST_API_KEY: boolean;
}

interface TranscribeDirectPayload {
  jobId: string;
  userId: string;
  audioId: string;
  filename?: string;
  originalName?: string;
  filePath: string;
}

export async function handleTranscribeDirectGet(env: Env): Promise<Response> {
  try {
    const environment: EnvironmentCheck = {
      SUPABASE_URL: !!env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!env.SUPABASE_SERVICE_ROLE_KEY,
      AI_BINDING: !!env.AI,
      INGEST_API_KEY: !!env.INGEST_API_KEY,
    };

    // If you want a real connectivity check, call a cheap RPC here.
    const supabase_connected = true;

    return json({
      status: 'ok',
      service: 'transcribe-direct',
      environment,
      supabase_connected,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Health check failed:', error);
    return json(
      { status: 'error', error: error?.message ?? 'Unknown error' },
      500
    );
  }
}

export async function handleTranscribeDirectPost(
  request: Request,
  env: Env
): Promise<Response> {
  // Generate request ID for tracing
  const requestId = `req-${randomId(12)}`;

  const fail = (status: number, msg: string, extra: Record<string, unknown> = {}) =>
    json({ ok: false, error: msg, requestId, ...extra }, status);

  try {
    // 1) Parse & validate payload
    let payload: TranscribeDirectPayload | undefined;
    try {
      payload = await request.json();
    } catch (e) {
      console.error(`[${requestId}] parse body error:`, e);
      return fail(400, 'Format de dades invàlid. Si us plau, torna a intentar-ho.');
    }

    const { jobId, userId, audioId, filename, originalName, filePath } = payload!;
    if (!jobId || !userId || !audioId || !filePath) {
      return fail(400, 'Falten dades obligatòries per processar la transcripció.');
    }

    console.log(`[${requestId}] 🚀 transcribe-direct`, { jobId, userId, audioId, filePath });

    // Broadcast: Processing started
    await broadcastStatus(env, {
      audioId,
      status: 'processing',
      progress: 5,
      message: 'Iniciant processament...',
    });

    // 2) Claim job (idempotency)
    let claim: any;
    try {
      console.log(`[${requestId}] 🔒 attempt_claim_job`, { jobId });
      claim = await rpc(env, 'attempt_claim_job', {
        p_job_id: jobId,
        p_claimer: `direct-${randomId(8)}`,
      });
    } catch (e) {
      console.error(`[${requestId}] attempt_claim_job RPC failed:`, e);
      return fail(502, "No s'ha pogut iniciar el processament. Si us plau, torna a intentar-ho.");
    }

    if (!claim?.success) {
      console.warn(`[${requestId}] job not claimable`, { jobId, claim });
      return fail(409, 'Aquesta transcripció ja està sent processada o ja s\'ha completat.', { jobId });
    }

    // 3) Fetch audio from R2 (guard 404 + show nearby keys)
    const prefix = filePath.split('/')[0] ?? '';
    let audioBuf: ArrayBuffer | null = null;
    try {
      const peek = await env.AUDIO_FILES.list({ prefix, limit: 20 });
      console.log(`[${requestId}] R2 peek`, { prefix, keys: peek.objects.map((o) => o.key) });

      const obj = await env.AUDIO_FILES.get(filePath);
      if (!obj) {
        return fail(404, "No s'ha trobat el fitxer d'àudio. Potser s'ha eliminat o hi ha hagut un error en la pujada.", {
          filePath,
          prefix,
          nearby: peek.objects.map((o) => o.key),
        });
      }
      audioBuf = await obj.arrayBuffer();
      console.log(`[${requestId}] ⬇️ audio bytes`, audioBuf.byteLength);

      // Broadcast: Audio loaded
      await broadcastStatus(env, {
        audioId,
        status: 'processing',
        progress: 20,
        message: 'Àudio carregat, iniciant transcripció...',
      });
    } catch (e) {
      console.error(`[${requestId}] R2 get/list error:`, e);
      return fail(502, "No s'ha pogut accedir al fitxer d'àudio. Si us plau, torna a intentar-ho.");
    }

    // 4) Process with Workers AI (with timeout)
    let aiResult: { text: string; segments: any[] };
    try {
      console.log(`[${requestId}] 🤖 Workers AI: transcribe`);

      // Broadcast: Transcription started
      await broadcastStatus(env, {
        audioId,
        status: 'transcribing',
        progress: 30,
        message: 'Transcrivint àudio amb IA...',
      });

      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`La transcripció ha trigat massa temps (>${AI_TIMEOUT_MS / 1000}s). L'àudio pot ser massa llarg o complex.`));
        }, AI_TIMEOUT_MS);
      });

      // Race between AI call and timeout
      aiResult = await Promise.race([
        transcribeWithWorkersAI(
          env,
          audioBuf!,
          originalName || filename || 'audio'
        ),
        timeoutPromise,
      ]);

      if (!aiResult || typeof aiResult.text !== 'string') {
        console.error(`[${requestId}] Unexpected AI result:`, aiResult);
        await broadcastStatus(env, { audioId, status: 'error', progress: 0, message: 'Error en la transcripció' });
        return fail(502, "El servei de transcripció ha retornat un resultat inesperat. Si us plau, torna a intentar-ho.");
      }

      // Broadcast: Transcription completed
      await broadcastStatus(env, {
        audioId,
        status: 'processing',
        progress: 70,
        message: 'Transcripció completada, desant...',
      });
    } catch (e: any) {
      console.error(`[${requestId}] Workers AI error:`, e);

      // Provide user-friendly error messages
      let userMessage = "No s'ha pogut completar la transcripció.";
      if (e?.code === 'AI_FILE_TOO_LARGE') {
        userMessage = e.message;
      } else if (e?.message?.includes('timeout') || e?.message?.includes('trigat massa')) {
        userMessage = e.message;
      } else {
        userMessage = "Error en el servei de transcripció. Si us plau, torna a intentar-ho.";
      }

      // Broadcast: Error
      await broadcastStatus(env, { audioId, status: 'error', progress: 0, message: userMessage });
      return fail(502, userMessage, { details: e?.message, code: e?.code });
    }

    // 5) Mark job completed (best-effort)
    try {
      console.log(`[${requestId}] 📝 mark_job_completed`, { jobId });
      await rpc(env, 'mark_job_completed', { p_job_id: jobId });
    } catch (e) {
      console.error(`[${requestId}] mark_job_completed RPC failed (continuing):`, e);
    }

    // 6) Persist transcription JSON to R2 (TRANSCRIPTIONS)
    const storagePath = versionedTranscriptionPath(userId, audioId);
    const transcriptionData = {
      text: aiResult.text,
      segments: sanitizeSegments(aiResult.segments),
      updated_at: new Date().toISOString(),
    };

    try {
      console.log(`[${requestId}] 💾 save transcription JSON to R2`, { storagePath });
      await r2Put(
        env.TRANSCRIPTIONS,
        storagePath,
        JSON.stringify(transcriptionData, null, 2),
        'application/json'
      );

      // Cleanup old versions (non-blocking, best-effort)
      cleanupOldVersions(env.TRANSCRIPTIONS, userId, audioId).catch((e) => {
        console.warn(`[${requestId}] Cleanup failed (non-blocking):`, e);
      });
    } catch (e) {
      console.error(`[${requestId}] R2 upload (TRANSCRIPTIONS) failed:`, e);
      return fail(502, "No s'ha pogut desar la transcripció. Si us plau, torna a intentar-ho.");
    }

    // 7) Upsert transcription row in DB
    try {
      console.log(`[${requestId}] 💾 upsert transcription row`, { audioId, userId });
      await upsertTranscription(env, {
        id: audioId,
        audio_id: audioId,
        user_id: userId,
        status: 'completed',
        json_path: storagePath,
      });
    } catch (e: any) {
      console.error(`[${requestId}] upsertTranscription failed:`, e);
      // Non-fatal but important: we already stored JSON in R2
      return json(
        {
          ok: true,
          warning: 'Transcripció desada però hi ha hagut un error en actualitzar la base de dades',
          requestId,
          jobId,
          audioId,
          storagePath,
          text: aiResult.text,
        },
        207
      );
    }

    // 8) Update audio status → completed (best-effort)
    try {
      console.log(`[${requestId}] 📝 update audio status -> completed`, { audioId });
      await update(
        env,
        'audios',
        { id: audioId, user_id: userId },
        { status: 'completed' }
      );
    } catch (e) {
      console.error(`[${requestId}] update(audios) failed (continuing):`, e);
    }

    // 9) Success
    console.log(`[${requestId}] ✅ job processed`, { jobId });

    // Broadcast: Completed
    await broadcastStatus(env, {
      audioId,
      status: 'completed',
      progress: 100,
      message: 'Transcripció completada!',
    });

    return json({
      ok: true,
      requestId,
      jobId,
      audioId,
      storagePath,
      transcription: {
        text: aiResult.text,
        segments: sanitizeSegments(aiResult.segments),
      },
    });
  } catch (err: any) {
    console.error(`UNHANDLED transcribe-direct error:`, err);
    return json(
      {
        ok: false,
        error: "S'ha produït un error inesperat. Si us plau, torna a intentar-ho.",
        details: err?.message ?? String(err),
      },
      500
    );
  }
}
