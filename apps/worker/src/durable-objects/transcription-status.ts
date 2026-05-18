/**
 * Durable Object for real-time transcription status.
 *
 * Uses the hibernation API (`state.acceptWebSocket`) so the DO is evicted from
 * memory between events — connections are cheap to maintain even when idle.
 *
 * Authentication: WS upgrade requests must carry `?token=<supabase JWT>` so
 * we can verify the caller owns this audio before subscribing them to its
 * status stream. Status POSTs from the worker itself are unauthenticated
 * because they're internal (only reachable via `env.TRANSCRIPTION_STATUS`
 * binding from the worker entrypoint).
 */

interface TranscriptionState {
  audioId: string;
  status: 'pending' | 'processing' | 'transcribing' | 'completed' | 'error';
  progress: number;
  message?: string;
  updatedAt: string;
}

interface DOEnv {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

export class TranscriptionStatus {
  private state: DurableObjectState;
  private env: DOEnv;
  private currentStatus: TranscriptionState | null;

  constructor(state: DurableObjectState, env: DOEnv) {
    this.state = state;
    this.env = env;
    this.currentStatus = null;

    this.state.blockConcurrencyWhile(async () => {
      const stored = await this.state.storage.get<TranscriptionState>('status');
      if (stored) this.currentStatus = stored;
    });
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocketUpgrade(request);
    }
    if (request.method === 'POST') return this.handleStatusUpdate(request);
    if (request.method === 'GET')  return this.handleStatusQuery();
    return new Response('Method not allowed', { status: 405 });
  }

  /** Hibernating WebSocket handler — called by the runtime on each message. */
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    try {
      const parsed = typeof message === 'string' ? JSON.parse(message) : null;
      if (parsed?.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch {
      /* ignore */
    }
  }

  async webSocketClose(_ws: WebSocket, _code: number, _reason: string, _wasClean: boolean): Promise<void> {
    // Hibernation auto-removes ws from the list; nothing to do here.
  }

  async webSocketError(_ws: WebSocket, _err: unknown): Promise<void> {
    // No-op: runtime cleans up.
  }

  private async handleWebSocketUpgrade(request: Request): Promise<Response> {
    // Verify caller is allowed to subscribe to this audio's status.
    const url = new URL(request.url);
    const audioId = url.pathname.split('/').pop() ?? '';
    const token = url.searchParams.get('token') ?? '';

    if (!audioId) return new Response('Missing audioId', { status: 400 });
    if (!token)   return new Response('Missing auth token', { status: 401 });

    const ownerOk = await this.verifyOwnership(audioId, token);
    if (!ownerOk) return new Response('Forbidden', { status: 403 });

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Hibernation-aware accept — DO can evict from memory between messages.
    this.state.acceptWebSocket(server);

    if (this.currentStatus) {
      server.send(JSON.stringify({ type: 'status', data: this.currentStatus }));
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  /** Validate the JWT against Supabase + verify the user owns this audio. */
  private async verifyOwnership(audioId: string, token: string): Promise<boolean> {
    try {
      const userRes = await fetch(`${this.env.SUPABASE_URL}/auth/v1/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: this.env.SUPABASE_SERVICE_ROLE_KEY,
        },
      });
      if (!userRes.ok) return false;
      const user: any = await userRes.json();
      const userId = user?.id;
      if (!userId) return false;

      const rowRes = await fetch(
        `${this.env.SUPABASE_URL}/rest/v1/audios?id=eq.${encodeURIComponent(audioId)}&user_id=eq.${encodeURIComponent(userId)}&select=id`,
        {
          headers: {
            Authorization: `Bearer ${this.env.SUPABASE_SERVICE_ROLE_KEY}`,
            apikey: this.env.SUPABASE_SERVICE_ROLE_KEY,
          },
        }
      );
      if (!rowRes.ok) return false;
      const rows: any = await rowRes.json();
      return Array.isArray(rows) && rows.length > 0;
    } catch {
      return false;
    }
  }

  private async handleStatusUpdate(request: Request): Promise<Response> {
    try {
      const update = (await request.json()) as Partial<TranscriptionState>;
      this.currentStatus = {
        audioId: update.audioId || this.currentStatus?.audioId || '',
        status: update.status || this.currentStatus?.status || 'pending',
        progress: update.progress ?? this.currentStatus?.progress ?? 0,
        message: update.message || this.currentStatus?.message,
        updatedAt: new Date().toISOString(),
      };
      await this.state.storage.put('status', this.currentStatus);

      const payload = JSON.stringify({ type: 'status', data: this.currentStatus });
      // Hibernation API exposes connected sockets via getWebSockets().
      for (const ws of this.state.getWebSockets()) {
        try { ws.send(payload); } catch { /* drop */ }
      }

      return new Response(JSON.stringify({ success: true, status: this.currentStatus }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e?.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  private handleStatusQuery(): Response {
    return new Response(JSON.stringify({
      success: true,
      status: this.currentStatus,
      connections: this.state.getWebSockets().length,
    }), { headers: { 'Content-Type': 'application/json' } });
  }
}

/* --- Runtime type stubs (kept minimal — the real types live in CF's runtime) --- */

interface DurableObjectState {
  storage: DurableObjectStorage;
  blockConcurrencyWhile<T>(callback: () => Promise<T>): Promise<T>;
  acceptWebSocket(ws: WebSocket): void;
  getWebSockets(): WebSocket[];
}
interface DurableObjectStorage {
  get<T>(key: string): Promise<T | undefined>;
  put<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<boolean>;
}
