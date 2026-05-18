"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useTranslations } from "next-intl";
import { Upload, FileAudio, X, AlertCircle, Loader2 } from "lucide-react";
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
import { uploadAudioChunked } from "@/lib/chunked-upload";

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

// File size limits
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB. The browser decodes + chunks, so we can accept larger raw files now.

export function AudioUpload({
  onUploadComplete,
  onUploadError,
  autoTranscribe = true,
  variant = "default",
  showUploadedFiles = true,
}: AudioUploadProps) {
  const t = useTranslations("dashboard.upload");
  const tCompression = useTranslations("dashboard.transcription.compression");
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(
    null
  );
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);
  const { user, session, planType } = useAuth();

  const uploadFile = async (file: File) => {
    try {
      if (!session?.access_token) {
        throw new Error("Authentication required");
      }

      // Single chunked-upload flow handles: hashing → decode → slice → parallel upload → enqueue.
      // No client-side MP3 re-encoding needed; the chunker downsamples to 16 kHz mono WAV.
      const result = await uploadAudioChunked(
        file,
        file.name,
        session.access_token,
        (p) => {
          setUploadProgress({
            progress: p.progress,
            status: p.phase === 'chunking' || p.phase === 'init'
              ? 'compressing'
              : p.phase === 'done' || p.phase === 'duplicate'
              ? 'completed'
              : 'uploading',
            message: p.message,
          });
        }
      );

      setUploadProgress({ progress: 100, status: "completed" });

      onUploadComplete({
        audioId: result.audioId,
        filename: file.name,
        filePath: `${result.audioId}`,
        originalName: file.name,
        autoTranscribe,
      });

      setTimeout(() => setUploadProgress(null), 2000);
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadProgress({
        progress: 0,
        status: "error",
        message: t("uploadError"),
      });
      onUploadError(error instanceof Error ? error.message : t("uploadError"));
      setTimeout(() => setUploadProgress(null), 3000);
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
        // Custom validation with translated error messages
        const acceptedTypes = Object.keys(ACCEPTED_AUDIO_TYPES);
        const acceptedExtensions = Object.values(ACCEPTED_AUDIO_TYPES).flat();

        // Check file type
        if (!acceptedTypes.includes(file.type) && !acceptedExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
          return {
            code: 'file-invalid-type',
            message: t("invalidFileType", { extensions: acceptedExtensions.join(', ') })
          };
        }

        // Check file size
        if (file.size > MAX_FILE_SIZE) {
          return {
            code: 'file-too-large',
            message: t("fileTooLarge", { size: Math.round(MAX_FILE_SIZE / (1024 * 1024)) })
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
      ? `group cursor-pointer rounded-xl border border-dashed bg-neutral-50/60 px-6 py-10 text-center transition-all duration-150
        ${
          isDragActive
            ? "border-primary bg-primary/5 ring-2 ring-primary/15"
            : "border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50"
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
      ? "mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-105"
      : "p-2 rounded-full bg-muted";

  const titleClassName =
    variant === "minimal" ? "text-sm font-semibold text-neutral-900" : "text-sm font-medium";

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
                    ? "h-5 w-5"
                    : "h-5 w-5 text-muted-foreground"
                }
              />
            </div>
            <div className={variant === "minimal" ? "space-y-1" : "space-y-2"}>
              <p className={titleClassName}>
                {isDragActive
                  ? t("dropHere")
                  : t("uploadAudio")}
              </p>
              <p
                className={
                  variant === "minimal"
                    ? "text-xs text-neutral-600"
                    : "text-sm text-muted-foreground"
                }
              >
                {t("dragDropHint")}
              </p>
              <p
                className={
                  variant === "minimal"
                    ? "pt-2 text-[11px] uppercase tracking-wide text-neutral-400"
                    : "text-sm text-muted-foreground"
                }
              >
                {t("formatHint")}
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
                <span className="text-sm font-medium flex items-center gap-2">
                  {uploadProgress.status === "compressing" && (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("compressing")}
                    </>
                  )}
                  {uploadProgress.status === "uploading" && t("uploading")}
                  {uploadProgress.status === "completed" && t("uploadComplete")}
                  {uploadProgress.status === "error" && t("uploadFailed")}
                </span>
                <Badge
                  variant={
                    uploadProgress.status === "error"
                      ? "destructive"
                      : uploadProgress.status === "compressing"
                      ? "secondary"
                      : "default"
                  }
                >
                  {uploadProgress.status === "compressing" ? t("compressing").toLowerCase().replace("...", "") : uploadProgress.status}
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
                  {t("uploadError")}
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
              <p className="text-sm font-medium">{t("uploadedFiles")}</p>
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
