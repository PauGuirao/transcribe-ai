/**
 * Query Optimizer for Supabase Database Operations
 * Provides optimized query patterns and join strategies
 */

export interface OptimizedQuery {
  table: string;
  select: string;
  filters?: Record<string, any>;
  joins?: JoinConfig[];
  orderBy?: string;
  limit?: number;
  offset?: number;
}

export interface JoinConfig {
  table: string;
  type: 'inner' | 'left' | 'right';
  on: string;
  select?: string;
}

export class QueryOptimizer {
  private supabase: any;

  constructor(supabase: any) {
    this.supabase = supabase;
  }

  /**
   * Optimize organization member queries with profile data
   */
  async getOrganizationMembersOptimized(organizationId: string) {
    // Single query with optimized join instead of multiple queries
    const { data, error } = await this.supabase
      .from('organization_members')
      .select(`
        id,
        role,
        joined_at,
        profiles!inner (
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .eq('organization_id', organizationId)
      .order('joined_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  /**
   * Optimize user profile with organization data
   */
  async getUserProfileWithOrganization(userId: string) {
    const { data, error } = await this.supabase
      .from('profiles')
      .select(`
        *,
        organizations!current_organization_id (
          id,
          name,
          image_url,
          created_at
        )
      `)
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Optimize audio files with transcription counts
   */
  async getAudioFilesWithTranscriptionData(userId: string, limit = 20, offset = 0) {
    const { data, error } = await this.supabase
      .from('audios')
      .select(`
        *,
        transcriptions!left (
          id,
          status,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data;
  }

  /**
   * Optimize invitation checks with single query
   */
  async checkUserInvitationStatus(email: string, organizationId: string) {
    // Check both membership and pending invitations in parallel
    const [membershipResult, invitationResult] = await Promise.all([
      this.supabase
        .from('organization_members')
        .select('id, profiles!inner(email)')
        .eq('organization_id', organizationId)
        .eq('profiles.email', email)
        .maybeSingle(),
      
      this.supabase
        .from('email_invitations')
        .select('id, expires_at')
        .eq('email', email)
        .eq('organization_id', organizationId)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle()
    ]);

    return {
      isMember: !!membershipResult.data,
      hasPendingInvitation: !!invitationResult.data,
      membershipError: membershipResult.error,
      invitationError: invitationResult.error
    };
  }

  /**
   * Optimize transcription queries with audio metadata
   */
  async getTranscriptionsWithAudioMetadata(userId: string, limit = 20, offset = 0) {
    const { data, error } = await this.supabase
      .from('transcriptions')
      .select(`
        *,
        audios!inner (
          id,
          filename,
          custom_name,
          user_id,
          created_at
        )
      `)
      .eq('audios.user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data;
  }

  /**
   * Optimize user role checks
   */
  async getUserRoleInOrganization(userId: string, organizationId: string) {
    const { data, error } = await this.supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single();

    if (error) throw error;
    return data?.role;
  }

  /**
   * Batch query for multiple user roles
   */
  async getBatchUserRoles(userIds: string[], organizationId: string) {
    const { data, error } = await this.supabase
      .from('organization_members')
      .select('user_id, role')
      .in('user_id', userIds)
      .eq('organization_id', organizationId);

    if (error) throw error;
    
    // Convert to map for easy lookup
    const roleMap = new Map();
    data.forEach((item: any) => roleMap.set(item.user_id, item.role));
    return roleMap;
  }

  /**
   * Optimize file access checks
   */
  async verifyFileAccess(fileId: string, userId: string, fileType: 'audio' | 'transcription') {
    const table = fileType === 'audio' ? 'audios' : 'transcriptions';
    
    const { data, error } = await this.supabase
      .from(table)
      .select('id, user_id')
      .eq('id', fileId)
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return !!data;
  }

  /**
   * Optimize organization data with member counts
   */
  async getOrganizationWithStats(organizationId: string) {
    const [orgResult, memberCountResult] = await Promise.all([
      this.supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single(),
      
      this.supabase
        .from('organization_members')
        .select('id', { count: 'exact' })
        .eq('organization_id', organizationId)
    ]);

    if (orgResult.error) throw orgResult.error;
    if (memberCountResult.error) throw memberCountResult.error;

    return {
      ...orgResult.data,
      memberCount: memberCountResult.count || 0
    };
  }
}

/**
 * Query performance analyzer
 */
export class QueryPerformanceAnalyzer {
  private queryTimes: Map<string, number[]> = new Map();

  trackQuery(queryName: string, executionTime: number) {
    if (!this.queryTimes.has(queryName)) {
      this.queryTimes.set(queryName, []);
    }
    this.queryTimes.get(queryName)!.push(executionTime);
  }

  getQueryStats(queryName: string) {
    const times = this.queryTimes.get(queryName) || [];
    if (times.length === 0) return null;

    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);

    return {
      queryName,
      executionCount: times.length,
      averageTime: Math.round(avg),
      minTime: min,
      maxTime: max,
      totalTime: times.reduce((a, b) => a + b, 0)
    };
  }

  getAllStats() {
    const stats = [];
    for (const queryName of this.queryTimes.keys()) {
      stats.push(this.getQueryStats(queryName));
    }
    return stats.sort((a, b) => (b?.averageTime || 0) - (a?.averageTime || 0));
  }

  clearStats() {
    this.queryTimes.clear();
  }
}

// Global performance analyzer instance
export const queryPerformanceAnalyzer = new QueryPerformanceAnalyzer();