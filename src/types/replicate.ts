// Types for Replicate API responses
export type ReplicateStatus =
  | "starting"
  | "processing"
  | "succeeded"
  | "completed"
  | "failed"
  | "canceled"
  | "error";
export interface ReplicateSegment {
  text: string;
  start: number;
  end: number;
  speaker?: string;
  [key: string]: unknown;
}

export interface ReplicateOutput {
  text?: string;
  segments?: ReplicateSegment[];
  [key: string]: unknown;
}

export interface ReplicatePrediction {
  id: string;
  status: ReplicateStatus;
  output: ReplicateOutput | ReplicateOutput[] | string | null;
  error?: string;
}

export type DatabaseStatus = "pending" | "processing" | "completed" | "error";

export interface TranscriptionOutput {
  text: string;
  segments: ReplicateSegment[];
}

export interface TranscriptionRecord {
  id: string;
  user_id: string;
  audio_id: string;
  prediction_id: string;
  json_path?: string;
  edited_text?: string | null;
  error_message?: string | null;
  status: DatabaseStatus;
  segments?: ReplicateSegment[];
  created_at: string;
  updated_at: string;
}
