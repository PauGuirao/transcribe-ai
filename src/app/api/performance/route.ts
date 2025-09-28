import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { performanceMonitor } from "@/lib/performance-monitor";
import { queryPerformanceAnalyzer } from "@/lib/query-optimizer";

export async function GET(request: NextRequest) {
  try {
    // Create Supabase client for authentication
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );

    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is admin (you might want to add proper role checking)
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.current_organization_id) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'summary';
    const queryName = searchParams.get('query');
    const route = searchParams.get('route');

    let data;

    switch (type) {
      case 'summary':
        data = {
          performanceMonitor: performanceMonitor.getPerformanceSummary(),
          queryAnalyzer: queryPerformanceAnalyzer.getAllStats()
        };
        break;

      case 'slow':
        const threshold = parseInt(searchParams.get('threshold') || '1000');
        data = performanceMonitor.getSlowQueries(threshold);
        break;

      case 'errors':
        const errorThreshold = parseFloat(searchParams.get('errorThreshold') || '0.05');
        data = performanceMonitor.getHighErrorQueries(errorThreshold);
        break;

      case 'query':
        if (!queryName) {
          return NextResponse.json(
            { success: false, error: 'Query name required' },
            { status: 400 }
          );
        }
        data = {
          performanceMonitor: performanceMonitor.getQueryStats(queryName),
          queryAnalyzer: queryPerformanceAnalyzer.getQueryStats(queryName)
        };
        break;

      case 'route':
        if (!route) {
          return NextResponse.json(
            { success: false, error: 'Route required' },
            { status: 400 }
          );
        }
        data = performanceMonitor.getRouteMetrics(route);
        break;

      case 'export':
        data = performanceMonitor.exportMetrics();
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid type parameter' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      type,
      data,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Error fetching performance data:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Create Supabase client for authentication
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );

    // Check authentication
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.current_organization_id) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'reset';

    switch (action) {
      case 'reset':
        performanceMonitor.reset();
        queryPerformanceAnalyzer.clearStats();
        break;

      case 'cleanup':
        const days = parseInt(searchParams.get('days') || '7');
        performanceMonitor.clearOldMetrics(days);
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action parameter' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: `Performance data ${action} completed`,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Error managing performance data:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}