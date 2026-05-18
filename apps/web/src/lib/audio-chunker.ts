/**
 * Client-side audio chunking via the Web Audio API.
 *
 * Pipeline:
 *   1. Decode any browser-supported audio format (MP3, WAV, M4A, OGG, FLAC, WebM, ...)
 *      into an AudioBuffer.
 *   2. Slice the buffer into fixed-duration windows (default 30s).
 *   3. Re-encode each window as a 16 kHz mono WAV blob (PCM s16le + RIFF header).
 *
 * Output:
 *   - chunks[]: { index, blob, startSec, endSec } — ready to upload to R2.
 *   - totalDurationSec: original audio duration (sum of chunks).
 *   - sha256: SHA-256 of the original file bytes (for content-hash dedup).
 *
 * Notes:
 *   - WAV is chosen because Workers AI Whisper accepts it cleanly and we don't
 *     need a wasm encoder. A 30s mono 16 kHz WAV is ~960 KB — well under the
 *     25 MB AI limit per chunk with massive headroom.
 *   - Downsample to 16 kHz mono because that's what Whisper consumes internally
 *     anyway; shrinks each chunk by ~6× vs 48 kHz stereo.
 */

const TARGET_SAMPLE_RATE = 16000;
const CHUNK_DURATION_SEC = 30;

export interface AudioChunk {
  index: number;
  blob: Blob;
  startSec: number;
  endSec: number;
}

export interface ChunkResult {
  chunks: AudioChunk[];
  totalDurationSec: number;
  sha256: string;
}

export interface ChunkProgress {
  phase: 'hashing' | 'decoding' | 'chunking' | 'done';
  progress: number; // 0..100
  message: string;
}

export async function chunkAudioFile(
  file: File | Blob,
  onProgress?: (p: ChunkProgress) => void
): Promise<ChunkResult> {
  onProgress?.({ phase: 'hashing', progress: 0, message: 'Calculant signatura...' });
  const originalBytes = await file.arrayBuffer();
  const sha256 = await hashSha256Hex(originalBytes);

  onProgress?.({ phase: 'decoding', progress: 15, message: "Decodificant àudio..." });

  // OfflineAudioContext lets us decode + resample without playing audio.
  // We do an initial decode at native rate, then build the offline context
  // sized to the target sample rate.
  const tempCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  let decoded: AudioBuffer;
  try {
    decoded = await tempCtx.decodeAudioData(originalBytes.slice(0));
  } finally {
    // Close to release native resources promptly.
    void tempCtx.close();
  }

  const totalDurationSec = decoded.duration;
  const targetLengthSamples = Math.ceil(totalDurationSec * TARGET_SAMPLE_RATE);

  // Resample to 16 kHz mono in one offline render.
  const offline = new (window.OfflineAudioContext ||
    (window as any).webkitOfflineAudioContext)(1, targetLengthSamples, TARGET_SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;

  // Stereo → mono mix happens automatically when channels differ from destination.
  source.connect(offline.destination);
  source.start(0);

  const monoBuffer = await offline.startRendering();
  const monoData = monoBuffer.getChannelData(0); // Float32Array

  onProgress?.({ phase: 'chunking', progress: 60, message: 'Tallant en segments...' });

  const chunks: AudioChunk[] = [];
  const samplesPerChunk = TARGET_SAMPLE_RATE * CHUNK_DURATION_SEC;
  const totalChunks = Math.max(1, Math.ceil(monoData.length / samplesPerChunk));

  for (let i = 0; i < totalChunks; i++) {
    const startSample = i * samplesPerChunk;
    const endSample = Math.min(startSample + samplesPerChunk, monoData.length);
    const slice = monoData.subarray(startSample, endSample);
    const wav = encodeWav16(slice, TARGET_SAMPLE_RATE);
    chunks.push({
      index: i,
      blob: new Blob([wav], { type: 'audio/wav' }),
      startSec: i * CHUNK_DURATION_SEC,
      endSec: i * CHUNK_DURATION_SEC + (endSample - startSample) / TARGET_SAMPLE_RATE,
    });

    if (i % 4 === 0) {
      const pct = 60 + Math.round(((i + 1) / totalChunks) * 35);
      onProgress?.({ phase: 'chunking', progress: pct, message: `Segment ${i + 1}/${totalChunks}...` });
    }
  }

  onProgress?.({ phase: 'done', progress: 100, message: 'Llest per pujar' });
  return { chunks, totalDurationSec, sha256 };
}

/**
 * Encode a Float32Array of mono PCM samples (range -1..1) as a 16-bit signed
 * little-endian WAV. Standard 44-byte RIFF header + samples.
 */
function encodeWav16(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const numSamples = samples.length;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true); // file size - 8
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);          // fmt chunk size
  view.setUint16(20, 1, true);           // audio format: PCM
  view.setUint16(22, 1, true);           // num channels: mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate (sampleRate * blockAlign)
  view.setUint16(32, 2, true);           // block align (1 channel * 2 bytes)
  view.setUint16(34, 16, true);          // bits per sample
  writeAscii(view, 36, 'data');
  view.setUint32(40, numSamples * 2, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return buffer;
}

function writeAscii(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

async function hashSha256Hex(buf: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
