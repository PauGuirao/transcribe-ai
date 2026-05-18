# Audio API Endpoints (Refactored)

This document explains the refactored Audio API endpoints, their request/response shapes, authentication requirements, and example usage.

## Overview
The audio API provides endpoints to list audio files, fetch a specific audio with its transcription, stream/download the audio file, rename audio titles, and delete audio resources. Endpoints now share centralized helpers for authentication and consistent JSON error responses.

Shared helpers used internally:
- `getAuth` – creates an optimized Supabase server client and returns `{ supabase, user, error }`.
- `jsonError` – returns a standardized error JSON response.
- `buildWorkerUrl` – builds Cloudflare Worker URL for transcription JSON.
- `getAudioContentType` – resolves proper MIME type for audio streaming.

## Authentication
All endpoints require an authenticated user. If the request is unauthenticated, the API returns:
```
{ "success": false, "error": "Authentication required. Please sign in." }
```
Status code: `401`.

Authentication is handled server-side via Supabase cookies/session.

## Endpoints

### 1) GET /api/audio
List audio files for the authenticated user.

Query parameters:
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `search` (string, optional: searches `filename` and `custom_name`)
- `orderBy` (string, default: `created_at`)
- `orderDirection` ("asc" | "desc", default: `desc`)

Response:
```
{
  "success": true,
  "audioFiles": [
    {
      "id": string,
      "filename": string,
      "originalName": string,
      "customName": string | null,
      "fileId": string,
      "uploadDate": string,
      "status": "pending" | "processing" | "completed" | "failed",
      "alumneId": string | null,
      "transcription": {
        "id": string,
        "audioId": string,
        "originalText": string,
        "editedText": string,
        "segments": any[],
        "createdAt": string,
        "updatedAt": string,
        "alumneId": string | null
      } | null
    }
  ],
  "pagination": { ... },
  "meta": { ... , "search": string | undefined }
}
```

Example:
```
GET /api/audio?page=1&limit=20&search=meeting
```

Errors:
- `401` if unauthenticated
- `500` on server errors

---

### 2) GET /api/audio/[id]
Fetch a single audio by ID and its (latest) transcription data if available.

Behavior:
- Verifies the audio belongs to the authenticated user.
- If `status === "completed"`, attempts to fetch transcription JSON from Cloudflare Worker R2 using `buildWorkerUrl`, with a fallback to Supabase Storage if the Worker fetch fails.

Response:
```
{
  "success": true,
  "audio": {
    "id": string,
    "filename": string,
    "originalName": string,
    "customName": string | null,
    "fileId": string,
    "uploadDate": string,
    "status": "pending" | "processing" | "completed" | "failed",
    "transcription": {
      "id": string,
      "audioId": string,
      "originalText": string,
      "editedText": string,
      "segments": any[],
      "speakers": Array<{ id: string, name: string, color: string }> | default [Logopeda, Alumne],
      "alumneId": string | null,
      "createdAt": string,
      "updatedAt": string
    } | null
  },
  "transcription": same as above
}
```

Errors:
- `401` if unauthenticated
- `404` if audio not found or not owned by user
- `500` on server errors

---

### 3) DELETE /api/audio/[id]
Delete an audio by ID and its associated transcription files.

Behavior:
- Verifies ownership, then:
  - Removes the audio file from the `audio-files` storage bucket: `userId/filename`.
  - Removes transcription files from the `transcriptions` bucket under `userId/audioId/*`.
  - Deletes the audio record from the database.

Response:
```
{ "success": true }
```

Errors:
- `401` if unauthenticated
- `404` if audio not found
- `500` if deletion fails

---

### 4) GET /api/audio/[id]/file
Stream/download the original audio file.

Behavior:
- Verifies ownership.
- Fetches the file from Cloudflare Worker’s R2 (download endpoint) using the current session token.
- Returns a binary response with appropriate headers.

Headers:
- `Content-Type`: resolved from `mime_type` in DB or via `getAudioContentType(filename)`
- `Content-Length`: byte length of the file
- `Cache-Control`: `public, max-age=31536000`

Errors:
- `401` if unauthenticated or missing session token
- `404` if audio not found
- `500` if Worker download fails or other server error

Example:
```
GET /api/audio/<audioId>/file
```

---

### 5) PATCH /api/audio/[id]/title
Update the custom title for an audio record.

Request body:
```
{ "customName": string }
```

Response:
```
{
  "success": true,
  "audio": {
    "id": string,
    "user_id": string,
    "custom_name": string,
    ...other fields
  }
}
```

Errors:
- `400` if `customName` is missing or empty
- `401` if unauthenticated
- `403` if audio is not owned by the user
- `404` if audio not found
- `500` on server errors

## Notes
- Cloudflare Worker URL is determined via `NEXT_PUBLIC_CLOUDFLARE_WORKER_URL` (defaults to `https://transcribe-worker.guiraocastells.workers.dev`).
- Transcription fetching prefers Worker R2; if unavailable, it falls back to Supabase Storage under the `transcriptions` bucket.
- Pagination and search for list endpoint are implemented via `SmartPagination` for performance and flexibility.
- All error responses use a consistent shape: `{ success: false, error: string }`.