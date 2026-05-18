// bindings + queue batch types only here
export interface Env {
  TRANSCRIBE_JOBS: Queue<string>;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  WEBHOOK_URL: string;
  INGEST_API_KEY?: string;
  AI: any;

  // R2 Buckets
  AUDIO_FILES: R2Bucket;
  TRANSCRIPTIONS: R2Bucket;
  ORGANIZATION_IMAGES: R2Bucket;

  // R2 Configuration for presigned URLs
  CF_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  AUDIO_FILES_BUCKET_NAME?: string;
  AUDIO_FILES_PUBLIC_URL?: string;

  // KV Cache
  CACHE?: KVNamespace;

  // Durable Objects
  TRANSCRIPTION_STATUS?: DurableObjectNamespace;
}

// KV Namespace interface
export interface KVNamespace {
  get(key: string, options?: { type?: 'text' | 'json' | 'arrayBuffer' | 'stream' }): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number; expiration?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{ keys: { name: string }[]; list_complete: boolean; cursor?: string }>;
}

// Durable Object interfaces
export interface DurableObjectNamespace {
  idFromName(name: string): DurableObjectId;
  idFromString(id: string): DurableObjectId;
  get(id: DurableObjectId): DurableObjectStub;
}

export interface DurableObjectId {
  toString(): string;
}

export interface DurableObjectStub {
  fetch(request: Request): Promise<Response>;
}

export interface ExecutionContext { waitUntil(p: Promise<any>): void; }
export interface Queue<T> { send(message: T | T[], options?: any): Promise<void>; }
export interface QueueMessage<T> {
  body: T;
  attempts: number;
  ack(): void;
  retry(options?: { delaySeconds?: number }): void;
}
export interface MessageBatch<T> { messages: QueueMessage<T>[]; }

// Minimal R2 types
export interface R2Bucket {
  get(key: string, options?: R2GetOptions): Promise<R2Object | null>;
  put(key: string, value: ReadableStream | ArrayBuffer | string, options?: R2PutOptions): Promise<R2Object>;
  delete(key: string): Promise<void>;
  list(options?: R2ListOptions): Promise<R2Objects>;
}
export interface R2PutOptions { httpMetadata?: R2HTTPMetadata; customMetadata?: Record<string,string>; }
export interface R2HTTPMetadata { contentType?: string; cacheControl?: string; contentDisposition?: string; contentEncoding?: string; contentLanguage?: string; cacheExpiry?: Date; }
export interface R2ListOptions { limit?: number; prefix?: string; cursor?: string; delimiter?: string; }
export interface R2GetOptions { range?: { offset?: number; length?: number; suffix?: number } }
export interface R2Objects { objects: R2Object[]; truncated: boolean; cursor?: string; delimitedPrefixes: string[]; }
export interface R2Object {
  key: string; size: number; etag: string; httpEtag: string; uploaded: Date; version: string;
  checksums: Record<string, ArrayBuffer | undefined>;
  httpMetadata?: R2HTTPMetadata; customMetadata?: Record<string,string>;
  range?: { offset: number; length: number; };
  body: ReadableStream; bodyUsed: boolean;
  arrayBuffer(): Promise<ArrayBuffer>; text(): Promise<string>; json<T=unknown>(): Promise<T>; blob(): Promise<Blob>;
}
