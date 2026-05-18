// WhatsApp Cloud API webhook handler.
//
// Two responsibilities:
//   GET  /wa/webhook  — Meta verification handshake. Echo `hub.challenge` if the
//                       `hub.verify_token` matches our configured token.
//   POST /wa/webhook  — Incoming message events. We only care about audio/voice
//                       messages whose `from` phone is registered to a Transcriu
//                       user. Everything else gets a polite reply.
//
// Spec references:
//   - https://developers.facebook.com/docs/whatsapp/cloud-api
//   - https://github.com/facebook/openapi/blob/main/business-messaging-api_v23.0.yaml

import type { Env, ExecutionContext } from '../types';
import { json } from '../utils/http';
import { uuidv4 } from '../utils/ids';
import { r2Put } from '../adapters/r2';
import { insertAudio, rpc, select } from '../adapters/supabase';
import {
  downloadMedia,
  getMediaInfo,
  markRead,
  sendText,
  verifySignature,
  type WaIncomingMessage,
  type WaWebhookPayload,
} from '../adapters/whatsapp';

const MAX_MEDIA_BYTES = 25 * 1024 * 1024; // 25 MB safety ceiling; WA caps at 16 MB

/* -------------------------------------------------------------------------- */
/* Verification handshake (GET)                                               */
/* -------------------------------------------------------------------------- */

export async function handleWhatsAppVerify(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (
    mode === 'subscribe' &&
    env.WHATSAPP_VERIFY_TOKEN &&
    token === env.WHATSAPP_VERIFY_TOKEN &&
    challenge
  ) {
    return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }
  console.warn('[WA] verify handshake rejected', { mode, hasToken: !!token });
  return new Response('Forbidden', { status: 403 });
}

/* -------------------------------------------------------------------------- */
/* Incoming events (POST)                                                     */
/* -------------------------------------------------------------------------- */

export async function handleWhatsAppEvent(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  // 1) Read raw body for HMAC verification before parsing.
  const rawBody = await request.text();
  const sigOk = await verifySignature(
    rawBody,
    request.headers.get('x-hub-signature-256'),
    env.WHATSAPP_APP_SECRET,
  );
  if (!sigOk) {
    console.warn('[WA] signature verification failed');
    return new Response('Forbidden', { status: 403 });
  }

  let payload: WaWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  // 2) Acknowledge fast (Meta retries aggressively on 5xx + slow responses).
  //    Do the actual processing in waitUntil so we always reply <5s.
  ctx.waitUntil(processWebhookPayload(payload, env).catch((err) => {
    console.error('[WA] processWebhookPayload error:', err);
  }));

  return json({ ok: true });
}

async function processWebhookPayload(payload: WaWebhookPayload, env: Env): Promise<void> {
  if (payload.object !== 'whatsapp_business_account') return;

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== 'messages') continue;
      const messages = change.value?.messages ?? [];
      for (const msg of messages) {
        try {
          await handleIncomingMessage(msg, env);
        } catch (err: any) {
          console.error('[WA] handleIncomingMessage failed', { id: msg.id, err: err?.message });
        }
      }
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Per-message handling                                                       */
/* -------------------------------------------------------------------------- */

async function handleIncomingMessage(msg: WaIncomingMessage, env: Env): Promise<void> {
  const from = msg.from;       // E.164 without "+", e.g. "34612345678"
  const messageId = msg.id;    // wamid.xxxxx

  // Best-effort: mark as read so the user sees blue ticks.
  await markRead(env, messageId);

  // We accept audio + voice notes. Everything else gets routed help text.
  const mediaPayload = msg.audio ?? msg.voice;
  if (!mediaPayload || (msg.type !== 'audio' && msg.type !== 'voice')) {
    await sendText(
      env,
      from,
      "Hola! Sóc el bot de Transcriu. Envia'm una nota de veu o un fitxer d'àudio (MP3, OGG, M4A…) i te'l transcriuré. 🎙️",
    );
    return;
  }

  // 1) Resolve the sender to a Transcriu user. If the phone isn't bound to any
  //    profile, prompt the user to register it in their settings.
  const userId = await resolveUserByPhone(env, from);
  if (!userId) {
    await sendText(
      env,
      from,
      "No reconec aquest número. Afegeix el teu telèfon a https://www.transcriu.com/dashboard/settings i torna a enviar l'àudio.",
    );
    return;
  }

  // 2) Idempotency: if Meta re-delivers the same wamid, skip.
  try {
    const existing = await select(env, 'audios', { wa_message_id: messageId }, 'id');
    if (existing?.id) {
      console.log('[WA] duplicate webhook, skipping', { messageId });
      return;
    }
  } catch (e: any) {
    // Not fatal — fall through and let the unique index catch it on insert.
    console.warn('[WA] dedup lookup failed', e?.message);
  }

  // 3) Resolve the media URL from Meta and download the bytes.
  const info = await getMediaInfo(env, mediaPayload.id);
  const size = Number(info.file_size ?? '0');
  if (size && size > MAX_MEDIA_BYTES) {
    await sendText(env, from, `L'àudio supera el màxim permès (${Math.round(MAX_MEDIA_BYTES / 1024 / 1024)} MB).`);
    return;
  }
  const audioBytes = await downloadMedia(env, info.url);

  // 4) Store the source audio in R2 using the same convention as web uploads.
  const audioId = uuidv4();
  const ext = pickExtension(info.mime_type);
  const filePath = `${userId}/${audioId}/source`;
  await r2Put(env.AUDIO_FILES, filePath, audioBytes, info.mime_type || 'audio/ogg');

  // 5) Insert the audio row tagged with source='whatsapp' so the queue worker
  //    knows to send a WhatsApp reply when transcription completes.
  const record = {
    id: audioId,
    user_id: userId,
    filename: `${audioId}.${ext}`,
    original_filename: `whatsapp_${messageId}.${ext}`,
    storage_path: filePath,
    status: 'processing',
    source: 'whatsapp',
    wa_message_id: messageId,
    wa_from_phone: from,
  };
  try {
    await insertAudio(env, record);
  } catch (e: any) {
    // 409 = unique violation on wa_message_id (race with another retry). Safe to swallow.
    if (!String(e?.message ?? '').includes('23505')) throw e;
    console.log('[WA] race on insert, treating as dup', { messageId });
    return;
  }

  // 6) Enqueue a WhatsApp-flavoured single-file transcription job.
  const job = JSON.stringify({
    kind: 'whatsapp',
    audioId,
    userId,
    filePath,
    originalName: record.original_filename,
    fromPhone: from,
  });
  await env.TRANSCRIBE_JOBS.send(job as any);

  // 7) Friendly ack so the user knows we received it.
  await sendText(
    env,
    from,
    'He rebut el teu àudio. Estic transcrivint-lo i et passaré l’enllaç en uns segons. ⏳',
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

async function resolveUserByPhone(env: Env, phone: string): Promise<string | null> {
  // Prefer the dedicated RPC (handles +/no-+ variants). Fall back to a direct
  // select if the RPC isn't installed yet.
  try {
    const candidates = [phone, `+${phone}`];
    for (const p of candidates) {
      const res: any = await rpc(env, 'find_user_by_phone', { p_phone: p });
      const id = Array.isArray(res) ? res[0] : res;
      if (id && typeof id === 'string') return id;
    }
  } catch (e: any) {
    console.warn('[WA] find_user_by_phone RPC unavailable, falling back', e?.message);
  }
  for (const variant of [`+${phone}`, phone]) {
    const row = await select(env, 'profiles', { phone: variant }, 'id').catch(() => null);
    if (row?.id) return row.id;
  }
  return null;
}

function pickExtension(mimeType: string | undefined): string {
  if (!mimeType) return 'ogg';
  const mt = mimeType.toLowerCase();
  if (mt.includes('opus') || mt.includes('ogg')) return 'ogg';
  if (mt.includes('mpeg') || mt.includes('mp3')) return 'mp3';
  if (mt.includes('mp4') || mt.includes('m4a')) return 'm4a';
  if (mt.includes('wav')) return 'wav';
  if (mt.includes('webm')) return 'webm';
  if (mt.includes('aac')) return 'aac';
  return 'ogg';
}
