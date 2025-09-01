export interface Audio {
  id: string;
  filename: string;
  originalName: string;
  filePath: string;
  uploadDate: Date;
  status: 'pending' | 'processing' | 'completed' | 'error';
  transcription?: Transcription;
}

export interface Speaker {
  id: string;
  name: string;
  color: string;
}

export interface TranscriptionSegment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
  speakerId?: string;
}

export interface Transcription {
  id: string;
  audioId: string;
  originalText: string;
  editedText: string;
  segments?: TranscriptionSegment[];
  speakers?: Speaker[];
  createdAt: Date;
  updatedAt: Date;
  audio?: Audio;
}

export interface UploadProgress {
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  message?: string;
}

export interface ExportOptions {
  format: 'pdf' | 'txt';
  filename?: string;
  includeTimestamps?: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface TranscriptionRequest {
  audioId: string;
  file: File;
}

export interface TranscriptionResponse {
  transcriptionId: string;
  originalText: string;
  editedText: string;
  audioId: string;
}