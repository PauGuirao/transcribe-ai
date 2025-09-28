export interface Audio {
  id: string;
  filename: string;
  originalName: string;
  customName?: string;
  filePath: string;
  uploadDate: Date;
  status: "pending" | "processing" | "completed" | "error";
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
  alumneId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  audio?: Audio;
}

export interface UploadProgress {
  progress: number;
  status: "uploading" | "processing" | "completed" | "error";
  message?: string;
}

export interface ExportOptions {
  format: "pdf" | "txt";
  filename?: string;
  includeTimestamps?: boolean;
}

export interface ApiResponse<T = unknown> {
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

// Add these to your existing types
export interface Organization {
  id: string;
  name: string;
  owner_id: string;
  plan_type: 'free' | 'organization';
  max_members: number;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  subscription_status: 'active' | 'inactive' | 'canceled' | 'past_due';
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  invited_by?: string;
  created_at: string;
}

export interface Invitation {
  id: string;
  organization_id: string;
  email: string;
  invited_by: string;
  role: 'admin' | 'member';
  status: 'pending' | 'accepted' | 'expired' | 'canceled';
  token: string;
  expires_at: string;
  accepted_at?: string;
  accepted_by?: string;
  created_at: string;
}

export interface OrganizationUsage {
  id: string;
  organization_id: string;
  user_id: string;
  resource_type: string;
  amount: number;
  period_start: string;
  period_end: string;
  created_at: string;
}

// Update existing User interface
export interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
  current_organization_id?: string;
  created_at: string;
}

// Audio Upload related types
export interface AudioUploadResult {
  audioId: string;
  filename: string;
  filePath: string;
  originalName: string;
  autoTranscribe: boolean;
}

export interface AudioUploadProps {
  onUploadComplete: (result: AudioUploadResult) => void;
  onUploadError: (error: string) => void;
  autoTranscribe?: boolean;
  variant?: "default" | "minimal";
  showUploadedFiles?: boolean;
}

// Audio Player related types
export interface AudioPlayerProps {
  audioId: string;
  className?: string;
  onRef?: (ref: AudioPlayerRef) => void;
}

export interface AudioPlayerRef {
  seekTo: (time: number) => void;
  play: () => void;
  pause: () => void;
}