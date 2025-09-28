import { createClient } from '@supabase/supabase-js';

// Validate environment variables
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Service Role Key:', serviceRoleKey);

if (!supabaseUrl || !serviceRoleKey) {
  //show supabaseUrl and serviceRoleKey
  console.log('Supabase URL:', supabaseUrl);
  console.log('Supabase Service Role Key:', serviceRoleKey);
  throw new Error('Missing required Supabase environment variables');
}

// Optimized admin client for server-side operations
const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    // Connection optimization settings
    global: {
      headers: {
        'Connection': 'keep-alive',
        'Keep-Alive': 'timeout=30, max=100'
      }
    },
    // Realtime disabled for admin operations
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
);

// Connection pool simulation through singleton pattern
class SupabaseConnectionManager {
  private static instance: SupabaseConnectionManager;
  private connections: Map<string, any> = new Map();
  private readonly maxConnections = 20;
  private readonly connectionTimeout = 30000; // 30 seconds

  static getInstance(): SupabaseConnectionManager {
    if (!SupabaseConnectionManager.instance) {
      SupabaseConnectionManager.instance = new SupabaseConnectionManager();
    }
    return SupabaseConnectionManager.instance;
  }

  getConnection(key: string = 'default') {
    if (!this.connections.has(key)) {
      if (this.connections.size >= this.maxConnections) {
        // Remove oldest connection
        const firstKey = this.connections.keys().next().value;
        if (firstKey) {
          this.connections.delete(firstKey);
        }
      }
      
      this.connections.set(key, supabaseAdmin);
      
      // Set timeout to clean up connection
      setTimeout(() => {
        this.connections.delete(key);
      }, this.connectionTimeout);
    }
    
    return this.connections.get(key);
  }

  closeAllConnections() {
    this.connections.clear();
  }
}

export const connectionManager = SupabaseConnectionManager.getInstance();
export { supabaseAdmin };
export default supabaseAdmin;