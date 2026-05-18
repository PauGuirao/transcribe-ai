/**
 * Storage cleanup utility for managing versioned transcription files.
 * Keeps only the latest N versions per audioId to prevent unbounded storage growth.
 */

// Maximum number of versions to keep per transcription
const MAX_VERSIONS_TO_KEEP = 3;

interface R2Bucket {
  list(options?: { prefix?: string; limit?: number }): Promise<{
    objects: Array<{ key: string; uploaded: Date }>;
    truncated: boolean;
  }>;
  delete(key: string): Promise<void>;
}

/**
 * Cleanup old versions of transcription files for a specific audio.
 * Keeps only the most recent MAX_VERSIONS_TO_KEEP files.
 *
 * @param bucket - R2 bucket containing transcriptions
 * @param userId - User ID
 * @param audioId - Audio ID
 * @returns Number of files deleted
 */
export async function cleanupOldVersions(
  bucket: R2Bucket,
  userId: string,
  audioId: string
): Promise<number> {
  const prefix = `${userId}/${audioId}/`;

  try {
    // List all versions for this transcription
    const result = await bucket.list({ prefix, limit: 100 });
    const objects = result.objects;

    // If we have fewer than or equal to MAX_VERSIONS_TO_KEEP, nothing to clean up
    if (objects.length <= MAX_VERSIONS_TO_KEEP) {
      console.log(`[CLEANUP] ${prefix}: ${objects.length} versions found, no cleanup needed`);
      return 0;
    }

    // Sort by upload date (newest first)
    const sortedObjects = objects.sort((a, b) => {
      // Parse timestamp from filename (format: {timestamp}.json)
      const timestampA = extractTimestamp(a.key);
      const timestampB = extractTimestamp(b.key);
      return timestampB - timestampA; // Descending (newest first)
    });

    // Keep the newest MAX_VERSIONS_TO_KEEP, delete the rest
    const toDelete = sortedObjects.slice(MAX_VERSIONS_TO_KEEP);

    console.log(
      `[CLEANUP] ${prefix}: ${objects.length} versions found, keeping ${MAX_VERSIONS_TO_KEEP}, deleting ${toDelete.length}`
    );

    // Delete old versions
    let deletedCount = 0;
    for (const obj of toDelete) {
      try {
        await bucket.delete(obj.key);
        deletedCount++;
        console.log(`[CLEANUP] Deleted: ${obj.key}`);
      } catch (e) {
        console.warn(`[CLEANUP] Failed to delete ${obj.key}:`, e);
      }
    }

    return deletedCount;
  } catch (error) {
    console.error(`[CLEANUP] Error cleaning up versions for ${prefix}:`, error);
    throw error;
  }
}

/**
 * Extract timestamp from versioned file path.
 * Expected format: {userId}/{audioId}/{timestamp}.json
 */
function extractTimestamp(key: string): number {
  const filename = key.split('/').pop() || '';
  const timestampStr = filename.replace('.json', '');

  // Try to parse as ISO date string or Unix timestamp
  const timestamp = Date.parse(timestampStr);

  if (!isNaN(timestamp)) {
    return timestamp;
  }

  // If parsing fails, try as Unix timestamp
  const unixTimestamp = parseInt(timestampStr, 10);
  if (!isNaN(unixTimestamp)) {
    return unixTimestamp;
  }

  // Fallback to 0 (will be sorted to the end/oldest)
  console.warn(`[CLEANUP] Could not parse timestamp from: ${key}`);
  return 0;
}

/**
 * Cleanup old versions for multiple audios (batch operation).
 * Useful for periodic cleanup jobs.
 *
 * @param bucket - R2 bucket containing transcriptions
 * @param userId - User ID
 * @returns Total number of files deleted
 */
export async function cleanupUserTranscriptions(
  bucket: R2Bucket,
  userId: string
): Promise<number> {
  const prefix = `${userId}/`;

  try {
    // List all objects for this user
    const result = await bucket.list({ prefix, limit: 1000 });

    // Group by audioId
    const audioGroups = new Map<string, typeof result.objects>();

    for (const obj of result.objects) {
      const parts = obj.key.split('/');
      if (parts.length >= 3) {
        const audioId = parts[1];
        if (!audioGroups.has(audioId)) {
          audioGroups.set(audioId, []);
        }
        audioGroups.get(audioId)!.push(obj);
      }
    }

    // Cleanup each audio group
    let totalDeleted = 0;
    for (const [audioId, objects] of audioGroups) {
      if (objects.length > MAX_VERSIONS_TO_KEEP) {
        const deleted = await cleanupOldVersions(bucket, userId, audioId);
        totalDeleted += deleted;
      }
    }

    console.log(`[CLEANUP] User ${userId}: Cleaned up ${totalDeleted} old versions`);
    return totalDeleted;
  } catch (error) {
    console.error(`[CLEANUP] Error cleaning up user transcriptions for ${userId}:`, error);
    throw error;
  }
}
