// Worker bindings & shared types.
//
// Runtime types (R2Bucket, Queue, KVNamespace, DurableObject*, ExecutionContext,
// MessageBatch) come from @cloudflare/workers-types — declared as ambient
// globals when "@cloudflare/workers-types" is in tsconfig.json `types`. We
// re-export them here so existing `import type { X } from '../types'` lines
// keep working without churning 17 files.

export type {
  R2Bucket,
  R2Object,
  R2ObjectBody,
  R2HTTPMetadata,
  R2GetOptions,
  R2PutOptions,
  R2ListOptions,
  R2Objects,
  KVNamespace,
  DurableObjectNamespace,
  DurableObjectId,
  DurableObjectStub,
  DurableObjectState,
  ExecutionContext,
  Queue,
  QueueSendOptions,
  MessageBatch,
  Message,
} from '@cloudflare/workers-types';

export interface Env {
  TRANSCRIBE_JOBS: Queue<string>;
  TRANSCRIBE_DLQ?: Queue<string>;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  WEBHOOK_URL: string;
  INGEST_API_KEY?: string;
  AI: Ai;

  // R2 Buckets
  AUDIO_FILES: R2Bucket;
  // Also stores org logos under the `org-images/` prefix to avoid a second bucket.
  TRANSCRIPTIONS: R2Bucket;

  // R2 S3-compat creds for presigned URLs
  CF_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  AUDIO_FILES_BUCKET_NAME?: string;
  AUDIO_FILES_PUBLIC_URL?: string;

  CACHE?: KVNamespace;
  TRANSCRIPTION_STATUS?: DurableObjectNamespace;

  // WhatsApp Cloud API (Meta)
  WHATSAPP_VERIFY_TOKEN?: string;
  WHATSAPP_ACCESS_TOKEN?: string;
  WHATSAPP_PHONE_NUMBER_ID?: string;
  WHATSAPP_APP_SECRET?: string;

  // LLM revision step ("coche/porche" corrector).
  // Set REVISION_ENABLED="false" to disable; default is on.
  // Set REVISION_MODEL to override the model id (defaults to mistral-small-3.1-24b).
  REVISION_ENABLED?: string;
  REVISION_MODEL?: string;

  PUBLIC_SITE_URL?: string;
}

// Local imports above re-export the global types; restate them here so this
// file is self-contained when read.
import type {
  R2Bucket,
  KVNamespace,
  DurableObjectNamespace,
  Queue,
  Ai,
} from '@cloudflare/workers-types';
