"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileAudio, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UploadProgress, AudioUploadResult, AudioUploadProps } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { trackFileRejections } from "@/lib/failed-upload-tracker";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Link from "next/link";
import UpgradePopup from "@/components/UpgradePopup";

const ACCEPTED_AUDIO_TYPES = {
  "audio/mpeg": [".mp3"],
  "audio/wav": [".wav"],
  "audio/mp4": [".m4a"],
  "audio/ogg": [".ogg"],
  "audio/webm": [".webm"],
  "audio/flac": [".flac"],
  "audio/aac": [".aac"],
  "audio/x-ms-wma": [".wma"],
  "audio/aiff": [".aiff"],
};

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export function AudioUpload({
  onUploadComplete,
  onUploadError,
  autoTranscribe = true,
  variant = "default",
  showUploadedFiles = true,
}: AudioUploadProps) {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(
    null
  );
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);
  const { user, session, planType } = useAuth();
  const uploadFile = async (file: File) => {
    try {
      setUploadProgress({ progress: 0, status: "uploading" });

      // Get the user session for authentication
      if (!session?.access_token) {
        throw new Error("Authentication required");
      }

      // Get worker URL from environment - use the same URL pattern as other API calls
      const workerUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_WORKER_URL || 'https://transcribe-worker.guiraocastells.workers.dev';

      setUploadProgress({ progress: 25, status: "uploading" });

      // Create FormData for direct upload to worker
      const formData = new FormData();
      formData.append('file', file);
      formData.append('originalFilename', file.name);

      // Upload directly to Cloudflare Worker with progress tracking
      const xhr = new XMLHttpRequest();
      
      const uploadPromise = new Promise<any>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            // Progress from 25% to 90% during upload
            const uploadProgress = (event.loaded / event.total) * 65; // 65% of total progress
            setUploadProgress({ 
              progress: 25 + uploadProgress, 
              status: "uploading" 
            });
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (e) {
              reject(new Error('Invalid response from server'));
            }
          } else {
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              reject(new Error(errorResponse.error || 'Upload failed'));
            } catch (e) {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });

        xhr.open('POST', `${workerUrl}/upload`);
        xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
        xhr.send(formData);
      });

      const response = await uploadPromise;

      if (!response.success) {
        throw new Error(response.error || 'Upload failed');
      }

      setUploadProgress({ progress: 100, status: "completed" });

      // Upload completed - return the upload information
      onUploadComplete({
        audioId: response.audioId,
        filename: response.filename,
        filePath: response.filePath,
        originalName: response.originalName,
        autoTranscribe,
      });

      // Reset progress after a delay
      setTimeout(() => {
        setUploadProgress(null);
      }, 2000);
    } catch (error) {
      setUploadProgress({
        progress: 0,
        status: "error",
        message: "Error de pujada",
      });
      onUploadError(error instanceof Error ? error.message : "Error de pujada");

      setTimeout(() => {
        setUploadProgress(null);
      }, 3000);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (planType === 'free') {
      setIsUpgradeDialogOpen(true);
      return;
    }
    const file = acceptedFiles[0];
    if (file) {
      // Clean previous state when starting a new upload
      setUploadProgress(null);
      setUploadedFiles([]);
      
      // Set the new file and start upload
      setUploadedFiles([file]);
      uploadFile(file);
    }
  }, [planType]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      onDrop,
      multiple: false,
      noClick: false,
      noKeyboard: false,
      validator: (file) => {
        // Custom validation with Catalan error messages
        const acceptedTypes = Object.keys(ACCEPTED_AUDIO_TYPES);
        const acceptedExtensions = Object.values(ACCEPTED_AUDIO_TYPES).flat();
        
        // Check file type
        if (!acceptedTypes.includes(file.type) && !acceptedExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
          return {
            code: 'file-invalid-type',
            message: `El tipus de fitxer ha de ser un dels següents: ${acceptedExtensions.join(', ')}`
          };
        }
        
        // Check file size
        if (file.size > MAX_FILE_SIZE) {
          return {
            code: 'file-too-large',
            message: `El fitxer és massa gran. La mida màxima és ${Math.round(MAX_FILE_SIZE / (1024 * 1024))} MB`
          };
        }
        
        return null;
      },
    });

  // Track failed upload attempts when files are rejected
  React.useEffect(() => {
    if (fileRejections.length > 0 && user?.email) {
      trackFileRejections([...fileRejections], user.email);
    }
  }, [fileRejections, user?.email]);

  const removeFile = () => {
    setUploadedFiles([]);
    setUploadProgress(null);
  };

  const dropzoneClassName =
    variant === "minimal"
      ? `rounded-2xl border border-dashed bg-background/80 p-10 text-center transition-all duration-200 shadow-sm hover:shadow-md
        ${
          isDragActive
            ? "border-primary/60 bg-primary/10"
            : "border-muted-foreground/20"
        }
        ${
          uploadProgress?.status === "uploading"
            ? "pointer-events-none opacity-60"
            : ""
        }`
      : `border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors
        ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25"
        }
        ${
          uploadProgress?.status === "uploading"
            ? "pointer-events-none opacity-50"
            : ""
        }`;

  const iconWrapperClassName =
    variant === "minimal"
      ? "mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"
      : "p-2 rounded-full bg-muted";

  const titleClassName =
    variant === "minimal" ? "text-base font-semibold" : "text-sm font-medium";

  return (
    <div className="space-y-3">
      <div className={variant === "minimal" ? "p-0" : "p-3"}>
        <div
          {...getRootProps({
            onClick: (e) => {
              if (planType === 'free') {
                e.preventDefault();
                e.stopPropagation();
                setIsUpgradeDialogOpen(true);
              }
            },
          })}
          className={dropzoneClassName}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center text-center">
            <div className={iconWrapperClassName}>
              <Upload
                className={
                  variant === "minimal"
                    ? "h-6 w-6"
                    : "h-5 w-5 text-muted-foreground"
                }
              />
            </div>
            <div className="space-y-2">
              <p className={titleClassName}>
                {isDragActive
                  ? "Deixa anar aquí el teu àudio"
                  : "Puja un arxiu d'àudio"}
              </p>
              <p className="text-md text-muted-foreground">
                Arrossega i deixa anar o fes clic per seleccionar
              </p>
              <p className="text-lg text-muted-foreground">
                MP3, WAV, M4A, OGG, WebM, FLAC, AAC, WMA, AIFF (màx. 50 MB)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {uploadProgress && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {uploadProgress.status === "uploading" && "Pujant..."}
                  {uploadProgress.status === "completed" && "Pujada Completada!"}
                  {uploadProgress.status === "error" && "Pujada fallida"}
                </span>
                <Badge
                  variant={
                    uploadProgress.status === "error"
                      ? "destructive"
                      : "default"
                  }
                >
                  {uploadProgress.status}
                </Badge>
              </div>
              {uploadProgress.status !== "error" && (
                <Progress value={uploadProgress.progress} className="w-full" />
              )}
              {uploadProgress.message && (
                <p className="text-sm text-muted-foreground">
                  {uploadProgress.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* File Rejections */}
      {fileRejections.length > 0 && (
        <Card className="border-destructive">
          <CardContent className="p-4">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-destructive">
                  Error de pujada
                </p>
                {fileRejections.map(({ file, errors }, fileIndex) => (
                  <div
                    key={`${file.name}-${fileIndex}`}
                    className="text-sm text-muted-foreground"
                  >
                    <p className="font-medium">{file.name}</p>
                    {errors.map((error, errorIndex) => (
                      <p key={`${file.name}-${error.code}-${errorIndex}`} className="text-destructive">
                        {error.message}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Uploaded Files */}
      {showUploadedFiles && uploadedFiles.length > 0 && !uploadProgress && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Fitxers pujats</p>
              {uploadedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-muted rounded"
                >
                  <div className="flex items-center space-x-2">
                    <FileAudio className="h-4 w-4" />
                    <span className="text-sm">{file.name}</span>
                    <Badge variant="secondary">
                      {(file.size / (1024 * 1024)).toFixed(1)} MB
                    </Badge>
                  </div>
                  <Button variant="ghost" size="sm" onClick={removeFile}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upgrade Popup for free plan */}
      <UpgradePopup
        isOpen={isUpgradeDialogOpen}
        onClose={() => setIsUpgradeDialogOpen(false)}
      />
    </div>
  );
}
