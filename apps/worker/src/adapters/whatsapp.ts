// Meta WhatsApp Cloud API adapter.
// Reference: https://developers.facebook.com/docs/whatsapp/cloud-api
// OpenAPI: https://github.com/facebook/openapi/blob/main/business-messaging-api_v23.0.yaml
import type { Env } from '../types';

const GRAPH_VERSION = 'v23.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export type WaMediaInfo = {
  url: string;
  mime_type: string;
  file_size: string;
  id: string;
  sha256?: string;
};

/**
 * Resolve a Meta-issued media-id into a (short-lived, 5-minute) download URL.
 */
export async function getMediaInfo(env: Env, mediaId: string): Promise<WaMediaInfo> {
  const res = await fetch(`${GRAPH_BASE}/${mediaId}`, {
    headers: { Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}` },
  });
  if (!res.ok) throw new Error(`getMediaInfo ${res.status}: ${await res.text()}`);
  return res.json();
}

/**
 * Stream-download an audio asset from the Graph CDN URL returned by getMediaInfo.
 * The URL is signed and requires the Bearer token.
 */
export async function downloadMedia(env: Env, mediaUrl: string): Promise<ArrayBuffer> {
  const res = await fetch(mediaUrl, {
    headers: { Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}` },
  });
  if (!res.ok) throw new Error(`downloadMedia ${res.status}: ${await res.text()}`);
  return res.arrayBuffer();
}

export async function sendText(env: Env, to: string, body: string): Promise<unknown> {
  const res = await fetch(`${GRAPH_BASE}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { preview_url: true, body },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    // Don't throw — replies are best-effort; log and continue.
    console.error(`[WA] sendText ${res.status}: ${text}`);
    return { ok: false, status: res.status, body: text };
  }
  return res.json();
}

/**
 * Mark an inbound message as 'read' (blue ticks). Best-effort.
 */
export async function markRead(env: Env, messageId: string): Promise<void> {
  try {
    await fetch(`${GRAPH_BASE}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      }),
    });
  } catch (e) {
    console.warn('[WA] markRead failed:', e);
  }
}

/**
 * Validate the X-Hub-Signature-256 header against the raw request body using
 * the Meta App Secret. Required for any production webhook deployment.
 *
 * Meta sends: `X-Hub-Signature-256: sha256=<lowercase hex digest>`
 */
export async function verifySignature(
  rawBody: string,
  headerValue: string | null,
  appSecret: string | undefined,
): Promise<boolean> {
  if (!appSecret) {
    console.warn('[WA] WHATSAPP_APP_SECRET not configured — skipping signature check (DEV ONLY)');
    return true;
  }
  if (!headerValue || !headerValue.startsWith('sha256=')) return false;
  const expected = headerValue.slice(7).toLowerCase();

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(rawBody));
  const digestHex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Constant-time compare
  if (digestHex.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < digestHex.length; i++) {
    diff |= digestHex.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

/* ------------------------------- Type-only ------------------------------- */

// Subset of the Meta webhook payload we actually consume.
// Full spec: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples
export interface WaWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      field: string;
      value: {
        messaging_product: string;
        metadata: { display_phone_number: string; phone_number_id: string };
        contacts?: Array<{ wa_id: string; profile?: { name?: string } }>;
        messages?: WaIncomingMessage[];
        statuses?: unknown[];
      };
    }>;
  }>;
}

export type WaMediaMessageType = 'audio' | 'voice' | 'video' | 'document';

export interface WaIncomingMessage {
  id: string;
  from: string;       // E.164 without leading "+" — e.g. "34612345678"
  timestamp: string;
  type: 'text' | 'audio' | 'voice' | 'image' | 'video' | 'document' | 'sticker' | 'interactive' | string;
  text?: { body: string };
  audio?: WaMediaPayload;
  voice?: WaMediaPayload;
  video?: WaMediaPayload;
  document?: WaMediaPayload & { filename?: string };
}

export interface WaMediaPayload {
  id: string;
  mime_type: string;
  sha256?: string;
  voice?: boolean;
}
