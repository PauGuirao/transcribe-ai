/**
 * Audio compression utility using Web Audio API and lamejs for MP3 encoding.
 * Compresses audio files larger than the threshold to reduce upload size.
 */

// @ts-expect-error lamejs has no type definitions
import lamejs from 'lamejs';

// Compression settings
const COMPRESSION_THRESHOLD = 20 * 1024 * 1024; // 20MB - compress files larger than this
const TARGET_MAX_SIZE = 25 * 1024 * 1024; // 25MB - AI service limit
const TARGET_SAMPLE_RATE = 16000; // 16kHz is sufficient for speech recognition
const TARGET_BITRATE = 64; // 64kbps for compressed audio
const CHANNELS = 1; // Mono for speech

export interface CompressionProgress {
  phase: 'decoding' | 'encoding' | 'finalizing';
  progress: number; // 0-100
}

export interface CompressionResult {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  wasCompressed: boolean;
}

/**
 * Check if a file needs compression based on its size
 */
export function needsCompression(file: File): boolean {
  return file.size > COMPRESSION_THRESHOLD;
}

/**
 * Compress an audio file to MP3 format with reduced bitrate
 * @param file - The audio file to compress
 * @param onProgress - Callback for compression progress updates
 * @returns Promise with the compressed audio blob and metadata
 */
export async function compressAudio(
  file: File,
  onProgress?: (progress: CompressionProgress) => void
): Promise<CompressionResult> {
  const originalSize = file.size;

  // If file is small enough, return it as-is
  if (!needsCompression(file)) {
    return {
      blob: file,
      originalSize,
      compressedSize: file.size,
      wasCompressed: false,
    };
  }

  try {
    onProgress?.({ phase: 'decoding', progress: 0 });

    // Create AudioContext for decoding
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    onProgress?.({ phase: 'decoding', progress: 30 });

    // Decode the audio data
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    onProgress?.({ phase: 'decoding', progress: 100 });
    onProgress?.({ phase: 'encoding', progress: 0 });

    // Resample and convert to mono
    const resampledData = resampleAudio(audioBuffer, TARGET_SAMPLE_RATE);

    onProgress?.({ phase: 'encoding', progress: 20 });

    // Encode to MP3 using lamejs
    const mp3Data = encodeToMp3(resampledData, TARGET_SAMPLE_RATE, TARGET_BITRATE, (progress) => {
      onProgress?.({ phase: 'encoding', progress: 20 + (progress * 0.7) }); // 20-90%
    });

    onProgress?.({ phase: 'encoding', progress: 90 });
    onProgress?.({ phase: 'finalizing', progress: 0 });

    // Create blob from MP3 data
    const blob = new Blob(mp3Data as BlobPart[], { type: 'audio/mpeg' });

    onProgress?.({ phase: 'finalizing', progress: 100 });

    // Close audio context
    await audioContext.close();

    // Check if compression was effective
    if (blob.size > TARGET_MAX_SIZE) {
      console.warn(
        `Compression resulted in ${(blob.size / (1024 * 1024)).toFixed(2)}MB, ` +
        `still above ${TARGET_MAX_SIZE / (1024 * 1024)}MB target`
      );
    }

    return {
      blob,
      originalSize,
      compressedSize: blob.size,
      wasCompressed: true,
    };
  } catch (error) {
    console.error('Audio compression failed:', error);
    throw new Error(
      `No s'ha pogut comprimir l'àudio: ${error instanceof Error ? error.message : 'Error desconegut'}`
    );
  }
}

/**
 * Resample audio to target sample rate and convert to mono
 */
function resampleAudio(audioBuffer: AudioBuffer, targetSampleRate: number): Float32Array {
  const sourceSampleRate = audioBuffer.sampleRate;
  const sourceLength = audioBuffer.length;
  const duration = audioBuffer.duration;

  // Calculate target length
  const targetLength = Math.round(duration * targetSampleRate);
  const result = new Float32Array(targetLength);

  // Get mono channel (mix down if stereo)
  let sourceData: Float32Array;
  if (audioBuffer.numberOfChannels === 1) {
    sourceData = audioBuffer.getChannelData(0);
  } else {
    // Mix channels to mono
    sourceData = new Float32Array(sourceLength);
    const numChannels = audioBuffer.numberOfChannels;
    for (let i = 0; i < sourceLength; i++) {
      let sum = 0;
      for (let ch = 0; ch < numChannels; ch++) {
        sum += audioBuffer.getChannelData(ch)[i];
      }
      sourceData[i] = sum / numChannels;
    }
  }

  // Resample using linear interpolation
  const ratio = sourceSampleRate / targetSampleRate;
  for (let i = 0; i < targetLength; i++) {
    const srcIndex = i * ratio;
    const srcIndexFloor = Math.floor(srcIndex);
    const srcIndexCeil = Math.min(srcIndexFloor + 1, sourceLength - 1);
    const fraction = srcIndex - srcIndexFloor;

    result[i] = sourceData[srcIndexFloor] * (1 - fraction) + sourceData[srcIndexCeil] * fraction;
  }

  return result;
}

/**
 * Encode Float32Array audio data to MP3 using lamejs
 */
function encodeToMp3(
  samples: Float32Array,
  sampleRate: number,
  bitrate: number,
  onProgress?: (progress: number) => void
): Uint8Array[] {
  const mp3Encoder = new lamejs.Mp3Encoder(CHANNELS, sampleRate, bitrate);
  const mp3Data: Uint8Array[] = [];

  // Convert Float32 to Int16
  const int16Samples = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    // Clamp and convert
    const s = Math.max(-1, Math.min(1, samples[i]));
    int16Samples[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }

  // Process in chunks
  const blockSize = 1152; // MP3 frame size
  const totalBlocks = Math.ceil(int16Samples.length / blockSize);

  for (let i = 0; i < int16Samples.length; i += blockSize) {
    const chunk = int16Samples.subarray(i, i + blockSize);
    const mp3buf = mp3Encoder.encodeBuffer(chunk);
    if (mp3buf.length > 0) {
      mp3Data.push(new Uint8Array(mp3buf));
    }

    // Report progress
    if (onProgress && i % (blockSize * 100) === 0) {
      onProgress((i / int16Samples.length) * 100);
    }
  }

  // Flush remaining data
  const mp3buf = mp3Encoder.flush();
  if (mp3buf.length > 0) {
    mp3Data.push(new Uint8Array(mp3buf));
  }

  return mp3Data;
}

/**
 * Get a human-readable compression summary
 */
export function getCompressionSummary(result: CompressionResult): string {
  if (!result.wasCompressed) {
    return `Fitxer prou petit (${formatSize(result.originalSize)}), no cal comprimir`;
  }

  const reduction = ((1 - result.compressedSize / result.originalSize) * 100).toFixed(1);
  return `Comprimit de ${formatSize(result.originalSize)} a ${formatSize(result.compressedSize)} (${reduction}% de reducció)`;
}

/**
 * Format file size for display
 */
function formatSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}
