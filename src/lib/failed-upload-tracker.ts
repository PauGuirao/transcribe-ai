import { supabase } from '@/lib/supabase';

export interface FailedUploadAttempt {
  userEmail: string;
  fileFormat?: string;
  fileSize?: number;
  errorReason: string;
  userAgent?: string;
  ipAddress?: string;
}

/**
 * Tracks a failed upload attempt by inserting it into the database
 * @param attempt - The failed upload attempt data
 * @returns Promise<boolean> - Returns true if successfully tracked, false otherwise
 */
export async function trackFailedUpload(attempt: FailedUploadAttempt): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('failed_upload_attempts')
      .insert({
        user_email: attempt.userEmail,
        file_format: attempt.fileFormat,
        file_size: attempt.fileSize,
        error_reason: attempt.errorReason,
        user_agent: attempt.userAgent || (typeof window !== 'undefined' ? window.navigator.userAgent : null),
        ip_address: null, // IP will be handled server-side for security
        attempted_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Failed to track upload attempt:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error tracking failed upload:', error);
    return false;
  }
}

/**
 * Extracts file format from filename or MIME type
 * @param file - The file object
 * @returns string - The file format/extension
 */
export function getFileFormat(file: File): string {
  // Try to get extension from filename first
  const filename = file.name;
  const lastDotIndex = filename.lastIndexOf('.');
  
  if (lastDotIndex !== -1) {
    return filename.substring(lastDotIndex).toLowerCase();
  }
  
  // Fallback to MIME type
  return file.type || 'unknown';
}

/**
 * Converts dropzone error codes to human-readable error reasons in Catalan
 * @param errorCode - The dropzone error code
 * @param file - The file object (optional)
 * @returns string - Human-readable error reason in Catalan
 */
export function getErrorReason(errorCode: string, file?: File): string {
  switch (errorCode) {
    case 'file-too-large':
      return `Fitxer massa gran (${file ? Math.round(file.size / (1024 * 1024)) : 'desconegut'} MB)`;
    case 'file-invalid-type':
      return `Tipus de fitxer no vàlid (${file ? getFileFormat(file) : 'desconegut'})`;
    case 'too-many-files':
      return 'Massa fitxers seleccionats';
    case 'file-too-small':
      return 'Fitxer massa petit';
    default:
      return `Error de pujada: ${errorCode}`;
  }
}

/**
 * Helper function to track multiple file rejections at once
 * @param fileRejections - Array of file rejections from dropzone
 * @param userEmail - User's email address
 * @returns Promise<void>
 */
export async function trackFileRejections(
  fileRejections: Array<{ file: File; errors: ReadonlyArray<{ code: string; message: string }> }>,
  userEmail: string
): Promise<void> {
  const trackingPromises = fileRejections.map(({ file, errors }) => {
    // Track each error for the file
    return Promise.all(
      errors.map(error => 
        trackFailedUpload({
          userEmail,
          fileFormat: getFileFormat(file),
          fileSize: file.size,
          errorReason: getErrorReason(error.code, file),
        })
      )
    );
  });

  try {
    await Promise.all(trackingPromises);
  } catch (error) {
    console.error('Error tracking file rejections:', error);
  }
}