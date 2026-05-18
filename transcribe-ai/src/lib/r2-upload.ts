/**
 * Direct R2 upload utility using presigned URLs
 * Bypasses Worker memory limits for large files
 */

interface PresignedUploadResponse {
  success: boolean;
  uploadUrl: string;
  audioId: string;
  filename: string;
  filePath: string;
  expiresIn: number;
  metadata: {
    userId: string;
    audioId: string;
    filename: string;
    originalFilename: string;
    contentType: string;
    fileSize: number;
    filePath: string;
  };
  error?: string;
}

interface ConfirmUploadResponse {
  success: boolean;
  audioId: string;
  filename: string;
  filePath: string;
  originalName: string;
  fileSize: number;
  error?: string;
}

interface UploadProgress {
  phase: 'preparing' | 'uploading' | 'confirming';
  progress: number;
  message: string;
}

/**
 * Upload a file directly to R2 using presigned URL
 * Falls back to Worker upload if presigned URL fails
 */
export async function uploadToR2(
  file: Blob,
  filename: string,
  accessToken: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<ConfirmUploadResponse> {
  const workerUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_WORKER_URL || 'https://transcribe-worker.guiraocastells.workers.dev';

  onProgress?.({ phase: 'preparing', progress: 0, message: 'Preparant pujada...' });

  // Step 1: Get presigned URL
  let presignedResponse: PresignedUploadResponse;
  try {
    const response = await fetch(`${workerUrl}/presigned-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        filename,
        contentType: file.type || 'audio/mpeg',
        fileSize: file.size,
      }),
    });

    if (!response.ok) {
      // Presigned URL not available, fall back to Worker upload
      console.log('Presigned URL not available, using Worker upload');
      return uploadViaWorker(file, filename, accessToken, onProgress);
    }

    presignedResponse = await response.json();
    if (!presignedResponse.success || !presignedResponse.uploadUrl) {
      return uploadViaWorker(file, filename, accessToken, onProgress);
    }
  } catch (e) {
    console.log('Presigned URL request failed, using Worker upload:', e);
    return uploadViaWorker(file, filename, accessToken, onProgress);
  }

  onProgress?.({ phase: 'uploading', progress: 10, message: 'Pujant a R2...' });

  // Step 2: Upload directly to R2
  try {
    const uploadResponse = await uploadWithProgress(
      presignedResponse.uploadUrl,
      file,
      (percent) => {
        onProgress?.({
          phase: 'uploading',
          progress: 10 + (percent * 0.8), // 10-90%
          message: `Pujant... ${Math.round(percent)}%`,
        });
      }
    );

    if (!uploadResponse.ok) {
      throw new Error(`R2 upload failed: ${uploadResponse.status}`);
    }
  } catch (e) {
    console.error('Direct R2 upload failed, falling back to Worker:', e);
    return uploadViaWorker(file, filename, accessToken, onProgress);
  }

  onProgress?.({ phase: 'confirming', progress: 95, message: 'Confirmant pujada...' });

  // Step 3: Confirm upload with Worker
  try {
    const confirmResponse = await fetch(`${workerUrl}/confirm-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(presignedResponse.metadata),
    });

    if (!confirmResponse.ok) {
      const error = await confirmResponse.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to confirm upload');
    }

    const result = await confirmResponse.json();
    onProgress?.({ phase: 'confirming', progress: 100, message: 'Pujada completada!' });
    return result;
  } catch (e: any) {
    throw new Error(`Failed to confirm upload: ${e.message}`);
  }
}

/**
 * Fallback: Upload via Worker (current method)
 */
async function uploadViaWorker(
  file: Blob,
  filename: string,
  accessToken: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<ConfirmUploadResponse> {
  const workerUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_WORKER_URL || 'https://transcribe-worker.guiraocastells.workers.dev';

  const formData = new FormData();
  formData.append('file', file, filename);
  formData.append('originalFilename', filename);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const percent = (event.loaded / event.total) * 100;
        onProgress?.({
          phase: 'uploading',
          progress: percent * 0.95, // Leave 5% for completion
          message: `Pujant... ${Math.round(percent)}%`,
        });
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          if (response.success) {
            onProgress?.({ phase: 'confirming', progress: 100, message: 'Pujada completada!' });
            resolve(response);
          } else {
            reject(new Error(response.error || 'Upload failed'));
          }
        } catch {
          reject(new Error('Invalid response from server'));
        }
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          reject(new Error(error.error || `Upload failed: ${xhr.status}`));
        } catch {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    xhr.open('POST', `${workerUrl}/upload`);
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    xhr.send(formData);
  });
}

/**
 * Upload with XMLHttpRequest for progress tracking
 */
function uploadWithProgress(
  url: string,
  file: Blob,
  onProgress: (percent: number) => void
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        onProgress((event.loaded / event.total) * 100);
      }
    });

    xhr.addEventListener('load', () => {
      resolve(new Response(xhr.responseText, {
        status: xhr.status,
        statusText: xhr.statusText,
      }));
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error'));
    });

    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', file.type || 'audio/mpeg');
    xhr.send(file);
  });
}
