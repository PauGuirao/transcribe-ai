// Queue system for managing transcription requests
import { EventEmitter } from 'events';

interface QueueItem {
  id: string;
  audioId: string;
  userId: string;
  priority: number;
  createdAt: Date;
  retries: number;
  maxRetries: number;
  filename?: string;
  originalName?: string;
  filePath?: string;
  provider?: string;
}

class TranscriptionQueue extends EventEmitter {
  private queue: QueueItem[] = [];
  private processing = new Set<string>();
  private maxConcurrent: number;
  private rateLimitPerMinute: number;
  private requestsThisMinute: number = 0;
  private lastResetTime: number = Date.now();

  constructor(maxConcurrent = 5, rateLimitPerMinute = 30) {
    super();
    this.maxConcurrent = maxConcurrent;
    this.rateLimitPerMinute = rateLimitPerMinute;
    
    // Reset rate limit counter every minute
    setInterval(() => {
      this.requestsThisMinute = 0;
      this.lastResetTime = Date.now();
    }, 60000);
  }

  add(item: Omit<QueueItem, 'createdAt' | 'retries'>): void {
    const queueItem: QueueItem = {
      ...item,
      createdAt: new Date(),
      retries: 0,
      maxRetries: item.maxRetries || 3,
    };

    // Insert based on priority (higher priority first)
    const insertIndex = this.queue.findIndex(q => q.priority < item.priority);
    if (insertIndex === -1) {
      this.queue.push(queueItem);
    } else {
      this.queue.splice(insertIndex, 0, queueItem);
    }

    this.emit('itemAdded', queueItem);
    this.processNext();
  }

  private async processNext(): Promise<void> {
    console.log(`🔍 processNext called - Queue length: ${this.queue.length}, Processing: ${this.processing.size}/${this.maxConcurrent}, Requests this minute: ${this.requestsThisMinute}/${this.rateLimitPerMinute}`);
    
    // Check if we can process more items
    if (this.processing.size >= this.maxConcurrent) {
      console.log('⏸️ Max concurrent limit reached, waiting...');
      return;
    }

    // Check rate limit
    if (this.requestsThisMinute >= this.rateLimitPerMinute) {
      console.log('⏸️ Rate limit reached, waiting...');
      return;
    }

    // Get next item from queue
    const item = this.queue.shift();
    if (!item) {
      console.log('📭 No items in queue to process');
      return;
    }

    console.log(`🚀 Starting to process item: ${item.id} for audioId: ${item.audioId}`);

    this.processing.add(item.id);
    this.requestsThisMinute++;

    try {
      this.emit('itemStarted', item);
      console.log(`📡 Calling processItem for ${item.id}`);
      await this.processItem(item);
      console.log(`✅ Successfully processed item ${item.id}`);
      this.emit('itemCompleted', item);
    } catch (error) {
      console.error(`❌ Error processing item ${item.id}:`, error);
      
      if (item.retries < item.maxRetries) {
        item.retries++;
        // Add back to queue with lower priority
        item.priority = Math.max(0, item.priority - 1);
        this.queue.push(item);
        console.log(`🔄 Retrying item ${item.id} (attempt ${item.retries}/${item.maxRetries})`);
        this.emit('itemRetried', item);
      } else {
        console.error(`💀 Max retries exceeded for item ${item.id}`);
        this.emit('itemFailed', item, error);
      }
    } finally {
      this.processing.delete(item.id);
      // Process next item after a small delay to prevent overwhelming
      setTimeout(() => this.processNext(), 100);
    }
  }

  private async processItem(item: QueueItem): Promise<void> {
    console.log(`🌐 Processing item directly without HTTP call for ${item.id}`);
    
    // Legacy local processing has been deprecated in favor of Cloudflare Workers + Queues.
    // This method is intentionally a no-op to preserve compatibility and avoid build errors
    // after removing processTranscription from the Next.js route.
    console.warn('Local TranscriptionQueue.processItem is deprecated and no longer performs work. Use Cloudflare /ingest path.');
    return;
  }

  getQueueStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing.size,
      requestsThisMinute: this.requestsThisMinute,
      rateLimitPerMinute: this.rateLimitPerMinute,
    };
  }

  getPosition(itemId: string): number {
    return this.queue.findIndex(item => item.id === itemId) + 1;
  }
}

// Singleton instance
export const transcriptionQueue = new TranscriptionQueue(
  parseInt(process.env.MAX_CONCURRENT_TRANSCRIPTIONS || '5'),
  parseInt(process.env.TRANSCRIPTION_RATE_LIMIT_PER_MINUTE || '30')
);

// Rate limiting middleware
export function withRateLimit(maxRequests: number, windowMs: number) {
  const requests = new Map<string, number[]>();

  return (req: any, res: any, next: any) => {
    const clientId = req.ip || req.headers['x-forwarded-for'] || 'anonymous';
    const now = Date.now();
    
    if (!requests.has(clientId)) {
      requests.set(clientId, []);
    }
    
    const clientRequests = requests.get(clientId)!;
    
    // Remove old requests outside the window
    const validRequests = clientRequests.filter(time => now - time < windowMs);
    
    if (validRequests.length >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil(windowMs / 1000),
      });
    }
    
    validRequests.push(now);
    requests.set(clientId, validRequests);
    
    next();
  };
}