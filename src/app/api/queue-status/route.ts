import { NextRequest, NextResponse } from 'next/server';
import { transcriptionQueue } from '@/lib/queue';
import { performanceMonitor, DatabaseMonitor, cacheMonitor } from '@/lib/performance';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Get user from session for authorization
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const queueStatus = transcriptionQueue.getQueueStatus();
    const systemHealth = performanceMonitor.getSystemHealth();
    const dbStatus = DatabaseMonitor.getInstance().getConnectionStatus();
    const cacheStats = cacheMonitor.getStats();

    // Get user-specific queue position if queueId is provided
    const url = new URL(request.url);
    const queueId = url.searchParams.get('queueId');
    let userPosition = null;
    
    if (queueId) {
      userPosition = transcriptionQueue.getPosition(queueId);
    }

    return NextResponse.json({
      queue: {
        ...queueStatus,
        userPosition,
      },
      system: systemHealth,
      database: dbStatus,
      cache: cacheStats,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Error getting queue status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Admin endpoint for detailed metrics
export async function POST(request: NextRequest) {
  try {
    const { adminKey } = await request.json();
    
    // Simple admin key check (in production, use proper admin authentication)
    if (adminKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const detailedMetrics = {
      queue: transcriptionQueue.getQueueStatus(),
      performance: {
        transcribeEndpoint: {
          averageResponseTime: performanceMonitor.getAverageResponseTime('/api/transcribe'),
          errorRate: performanceMonitor.getErrorRate('/api/transcribe'),
          requestsPerMinute: performanceMonitor.getRequestsPerMinute('/api/transcribe'),
        },
        uploadEndpoint: {
          averageResponseTime: performanceMonitor.getAverageResponseTime('/api/upload'),
          errorRate: performanceMonitor.getErrorRate('/api/upload'),
          requestsPerMinute: performanceMonitor.getRequestsPerMinute('/api/upload'),
        },
        system: performanceMonitor.getSystemHealth(),
      },
      database: DatabaseMonitor.getInstance().getConnectionStatus(),
      cache: cacheMonitor.getStats(),
    };

    return NextResponse.json(detailedMetrics);

  } catch (error: any) {
    console.error('Error getting detailed metrics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}