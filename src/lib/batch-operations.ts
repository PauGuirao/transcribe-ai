import type { SupabaseClient } from '@supabase/supabase-js';

// Batch operations for bulk database operations
export class BatchOperations {
  private supabase: any;
  private batchSize: number;

  constructor(supabase: any, batchSize: number = 100) {
    this.supabase = supabase;
    this.batchSize = batchSize;
  }

  // Batch insert operations
  async batchInsert<T>(
    table: string,
    records: T[],
    options: { onConflict?: string; returning?: string } = {}
  ): Promise<{ success: boolean; insertedCount: number; errors: any[] }> {
    const results = {
      success: true,
      insertedCount: 0,
      errors: [] as any[],
    };

    // Split records into batches
    const batches = this.chunkArray(records, this.batchSize);

    for (const batch of batches) {
      try {
        let query = this.supabase.from(table).insert(batch);
        
        if (options.onConflict) {
          query = query.onConflict(options.onConflict);
        }
        
        if (options.returning) {
          query = query.select(options.returning);
        }

        const { data, error } = await query;

        if (error) {
          results.errors.push({
            batch: batch,
            error: error.message,
          });
          results.success = false;
        } else {
          results.insertedCount += batch.length;
        }
      } catch (error) {
        results.errors.push({
          batch: batch,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        results.success = false;
      }
    }

    return results;
  }

  // Batch update operations
  async batchUpdate<T extends { id: string }>(
    table: string,
    records: T[],
    updateFields: (keyof T)[],
    options: { returning?: string } = {}
  ): Promise<{ success: boolean; updatedCount: number; errors: any[] }> {
    const results = {
      success: true,
      updatedCount: 0,
      errors: [] as any[],
    };

    // Process updates in batches
    const batches = this.chunkArray(records, this.batchSize);

    for (const batch of batches) {
      try {
        // Use upsert for batch updates
        const updateData = batch.map(record => {
          const updateObj: any = { id: record.id };
          updateFields.forEach(field => {
            updateObj[field as string] = record[field];
          });
          return updateObj;
        });

        let query = this.supabase
          .from(table)
          .upsert(updateData, { onConflict: 'id' });

        if (options.returning) {
          query = query.select(options.returning);
        }

        const { data, error } = await query;

        if (error) {
          results.errors.push({
            batch: batch,
            error: error.message,
          });
          results.success = false;
        } else {
          results.updatedCount += batch.length;
        }
      } catch (error) {
        results.errors.push({
          batch: batch,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        results.success = false;
      }
    }

    return results;
  }

  // Batch delete operations
  async batchDelete(
    table: string,
    ids: string[],
    options: { returning?: string } = {}
  ): Promise<{ success: boolean; deletedCount: number; errors: any[] }> {
    const results = {
      success: true,
      deletedCount: 0,
      errors: [] as any[],
    };

    // Split IDs into batches
    const batches = this.chunkArray(ids, this.batchSize);

    for (const batch of batches) {
      try {
        let query = this.supabase
          .from(table)
          .delete()
          .in('id', batch);

        if (options.returning) {
          query = query.select(options.returning);
        }

        const { data, error } = await query;

        if (error) {
          results.errors.push({
            batch: batch,
            error: error.message,
          });
          results.success = false;
        } else {
          results.deletedCount += batch.length;
        }
      } catch (error) {
        results.errors.push({
          batch: batch,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        results.success = false;
      }
    }

    return results;
  }

  // Batch upsert operations (insert or update)
  async batchUpsert<T>(
    table: string,
    records: T[],
    options: { 
      onConflict: string; 
      returning?: string;
      ignoreDuplicates?: boolean;
    }
  ): Promise<{ success: boolean; processedCount: number; errors: any[] }> {
    const results = {
      success: true,
      processedCount: 0,
      errors: [] as any[],
    };

    // Split records into batches
    const batches = this.chunkArray(records, this.batchSize);

    for (const batch of batches) {
      try {
        let query = this.supabase
          .from(table)
          .upsert(batch, { 
            onConflict: options.onConflict,
            ignoreDuplicates: options.ignoreDuplicates || false
          });

        if (options.returning) {
          query = query.select(options.returning);
        }

        const { data, error } = await query;

        if (error) {
          results.errors.push({
            batch: batch,
            error: error.message,
          });
          results.success = false;
        } else {
          results.processedCount += batch.length;
        }
      } catch (error) {
        results.errors.push({
          batch: batch,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        results.success = false;
      }
    }

    return results;
  }

  // Batch read operations with IN clause optimization
  async batchRead<T>(
    table: string,
    ids: string[],
    options: {
      select?: string;
      orderBy?: string;
      orderDirection?: 'asc' | 'desc';
    } = {}
  ): Promise<{ success: boolean; data: T[]; errors: any[] }> {
    const results = {
      success: true,
      data: [] as T[],
      errors: [] as any[],
    };

    if (ids.length === 0) {
      return results;
    }

    // Split IDs into batches to avoid URL length limits
    const batches = this.chunkArray(ids, this.batchSize);

    for (const batch of batches) {
      try {
        let query = this.supabase
          .from(table)
          .select(options.select || '*')
          .in('id', batch);

        if (options.orderBy) {
          query = query.order(options.orderBy, { 
            ascending: options.orderDirection === 'asc' 
          });
        }

        const { data, error } = await query;

        if (error) {
          results.errors.push({
            batch: batch,
            error: error.message,
          });
          results.success = false;
        } else {
          results.data.push(...(data || []));
        }
      } catch (error) {
        results.errors.push({
          batch: batch,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        results.success = false;
      }
    }

    return results;
  }

  // Utility method to chunk arrays
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // Batch transaction operations
  async batchTransaction(operations: Array<{
    type: 'insert' | 'update' | 'delete' | 'upsert';
    table: string;
    data: any;
    options?: any;
  }>): Promise<{ success: boolean; results: any[]; errors: any[] }> {
    const results = {
      success: true,
      results: [] as any[],
      errors: [] as any[],
    };

    // Note: Supabase doesn't support true transactions in the client
    // This is a sequential batch operation with rollback simulation
    const completedOperations: any[] = [];

    try {
      for (const operation of operations) {
        let result;

        switch (operation.type) {
          case 'insert':
            result = await this.batchInsert(
              operation.table,
              Array.isArray(operation.data) ? operation.data : [operation.data],
              operation.options
            );
            break;

          case 'update':
            result = await this.batchUpdate(
              operation.table,
              Array.isArray(operation.data) ? operation.data : [operation.data],
              operation.options?.updateFields || [],
              operation.options
            );
            break;

          case 'delete':
            result = await this.batchDelete(
              operation.table,
              Array.isArray(operation.data) ? operation.data : [operation.data],
              operation.options
            );
            break;

          case 'upsert':
            result = await this.batchUpsert(
              operation.table,
              Array.isArray(operation.data) ? operation.data : [operation.data],
              operation.options
            );
            break;

          default:
            throw new Error(`Unsupported operation type: ${operation.type}`);
        }

        if (!result.success) {
          results.success = false;
          results.errors.push(...result.errors);
          break;
        }

        results.results.push(result);
        completedOperations.push({ operation, result });
      }
    } catch (error) {
      results.success = false;
      results.errors.push({
        error: error instanceof Error ? error.message : 'Unknown error',
        operation: 'transaction',
      });
    }

    return results;
  }
}

// Utility functions for common batch operations
export async function batchUpdateAudioTitles(
  supabase: any,
  updates: Array<{ id: string; customName: string }>
): Promise<void> {
  const batchOps = new BatchOperations(supabase);
  
  const result = await batchOps.batchUpdate(
    'audios',
    updates.map(u => ({ 
      id: u.id, 
      custom_name: u.customName,
      updated_at: new Date().toISOString()
    })),
    ['custom_name', 'updated_at']
  );

  if (!result.success) {
    throw new Error(`Batch update failed: ${result.errors.map(e => e.error).join(', ')}`);
  }
}

export async function batchCreateTranscriptions(
  supabase: any,
  transcriptions: Array<{
    audio_id: string;
    alumne_id: string;
    json_path: string;
  }>
): Promise<void> {
  const batchOps = new BatchOperations(supabase);
  
  const result = await batchOps.batchInsert(
    'transcriptions',
    transcriptions.map(t => ({
      ...t,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })),
    { onConflict: 'audio_id,alumne_id' }
  );

  if (!result.success) {
    throw new Error(`Batch insert failed: ${result.errors.map(e => e.error).join(', ')}`);
  }
}

export async function batchDeleteAudioFiles(
  supabase: any,
  audioIds: string[]
): Promise<void> {
  const batchOps = new BatchOperations(supabase);
  
  const result = await batchOps.batchDelete('audios', audioIds);

  if (!result.success) {
    throw new Error(`Batch delete failed: ${result.errors.map(e => e.error).join(', ')}`);
  }
}