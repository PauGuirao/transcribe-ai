export function safeJson<T=any>(s: string): T | null { try { return JSON.parse(s); } catch { return null; } }

export function getContentType(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ({
    mp3:'audio/mpeg', wav:'audio/wav', m4a:'audio/mp4', ogg:'audio/ogg', webm:'audio/webm',
    flac:'audio/flac', aac:'audio/aac', wma:'audio/x-ms-wma', aiff:'audio/aiff'
  } as Record<string,string>)[ext ?? 'mp3'] ?? 'application/octet-stream';
}

export function base64FromArrayBuffer(buf: ArrayBuffer) {
  let binary = ''; const bytes = new Uint8Array(buf); const n = 0x8000;
  for (let i=0;i<bytes.length;i+=n) binary += String.fromCharCode(...bytes.subarray(i,i+n));
  // @ts-ignore
  return btoa(binary);
}

export const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg","audio/wav","audio/mp4","audio/ogg","audio/webm","audio/x-m4a","audio/flac","audio/aac","audio/x-ms-wma","audio/aiff",
];

export function versionedTranscriptionPath(userId: string, audioId: string) {
  return `${userId}/${audioId}/${Date.now()}.json`;
}
