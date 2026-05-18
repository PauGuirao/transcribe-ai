/**
 * Durable Object for real-time transcription status updates
 * Provides WebSocket connections for instant status notifications
 */

interface TranscriptionState {
  audioId: string;
  status: 'pending' | 'processing' | 'transcribing' | 'completed' | 'error';
  progress: number; // 0-100
  message?: string;
  updatedAt: string;
}

export class TranscriptionStatus {
  private state: DurableObjectState;
  private sessions: Set<WebSocket>;
  private currentStatus: TranscriptionState | null;

  constructor(state: DurableObjectState) {
    this.state = state;
    this.sessions = new Set();
    this.currentStatus = null;

    // Load persisted state
    this.state.blockConcurrencyWhile(async () => {
      const stored = await this.state.storage.get<TranscriptionState>('status');
      if (stored) {
        this.currentStatus = stored;
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Handle WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request);
    }

    // Handle status update (POST)
    if (request.method === 'POST') {
      return this.handleStatusUpdate(request);
    }

    // Handle status query (GET)
    if (request.method === 'GET') {
      return this.handleStatusQuery();
    }

    return new Response('Method not allowed', { status: 405 });
  }

  private handleWebSocket(request: Request): Response {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Accept the WebSocket connection
    server.accept();
    this.sessions.add(server);

    // Send current status immediately
    if (this.currentStatus) {
      server.send(JSON.stringify({
        type: 'status',
        data: this.currentStatus,
      }));
    }

    // Handle WebSocket events
    server.addEventListener('message', async (event) => {
      try {
        const message = JSON.parse(event.data as string);

        if (message.type === 'ping') {
          server.send(JSON.stringify({ type: 'pong' }));
        }
      } catch {
        // Ignore invalid messages
      }
    });

    server.addEventListener('close', () => {
      this.sessions.delete(server);
    });

    server.addEventListener('error', () => {
      this.sessions.delete(server);
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  private async handleStatusUpdate(request: Request): Promise<Response> {
    try {
      const update = await request.json() as Partial<TranscriptionState>;

      // Update status
      this.currentStatus = {
        audioId: update.audioId || this.currentStatus?.audioId || '',
        status: update.status || this.currentStatus?.status || 'pending',
        progress: update.progress ?? this.currentStatus?.progress ?? 0,
        message: update.message || this.currentStatus?.message,
        updatedAt: new Date().toISOString(),
      };

      // Persist to storage
      await this.state.storage.put('status', this.currentStatus);

      // Broadcast to all connected clients
      const message = JSON.stringify({
        type: 'status',
        data: this.currentStatus,
      });

      for (const session of this.sessions) {
        try {
          session.send(message);
        } catch {
          // Remove dead sessions
          this.sessions.delete(session);
        }
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
      connections: this.sessions.size,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

interface DurableObjectState {
  storage: DurableObjectStorage;
  blockConcurrencyWhile<T>(callback: () => Promise<T>): Promise<T>;
}

interface DurableObjectStorage {
  get<T>(key: string): Promise<T | undefined>;
  put<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<boolean>;
}
