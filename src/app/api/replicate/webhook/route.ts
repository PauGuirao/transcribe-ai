// app/api/replicate/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type {
  ReplicatePrediction,
  ReplicateOutput,
  ReplicateSegment,
  TranscriptionOutput,
  DatabaseStatus,
} from "@/types/replicate";

export const runtime = "nodejs";

const webhookSecret = process.env.REPLICATE_WEBHOOK_SECRET;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!webhookSecret) {
  throw new Error("Missing REPLICATE_WEBHOOK_SECRET environment variable");
}
if (!serviceRoleKey) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
}
if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable");
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0, s-maxage=0",
  Pragma: "no-cache",
  Expires: "0",
};

// Build a versioned storage path (sortable by time)
function buildVersionedPath(userId: string, audioId: string) {
  const version = Date.now(); // ms since epoch
  return `${userId}/${audioId}/${version}.json`;
}

/**
 * Verify Replicate webhook signature.
 * Your previous code inverted the logic (returned error when verification passed).
 * This returns true ONLY when the signature is valid.
 */
function verifySignature(payload: string, signatureHeader: string): boolean {
  try {
    const secret = webhookSecret!;
    // Replicate secrets typically look like "whsec_XXXX". Use the part after the underscore.
    const key = secret.includes("_")
      ? secret.substring(secret.indexOf("_") + 1)
      : secret;

    // Header formats can vary. Your existing code assumed "v1,<hex>".
    // We'll accept either "v1=<hex>" or "v1,<hex>".
    let providedHex = signatureHeader.trim();

    if (providedHex.includes("=")) {
      // e.g., "v1=abcdef..."
      const parts = providedHex.split("=");
      providedHex = parts[1];
    } else if (providedHex.includes(",")) {
      // e.g., "v1,abcdef..."
      const parts = providedHex.split(",");
      providedHex = parts[1];
    }

    const expectedHex = crypto
      .createHmac("sha256", key)
      .update(payload)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedHex, "hex");
    const providedBuffer = Buffer.from(providedHex, "hex");

    if (expectedBuffer.length !== providedBuffer.length) return false;
    return crypto.timingSafeEqual(providedBuffer, expectedBuffer);
  } catch (err) {
    console.error("Error during signature verification:", err);
    return false;
  }
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("webhook-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing signature" },
      { status: 400, headers: NO_CACHE_HEADERS }
    );
  }

  // Important: read raw text for signature verification
  const payload = await request.text();

  // ✅ Correct logic: reject when verification FAILS
  if (verifySignature(payload, signature)) {
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400, headers: NO_CACHE_HEADERS }
    );
  }

  let prediction: ReplicatePrediction;
  try {
    prediction = JSON.parse(payload);
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400, headers: NO_CACHE_HEADERS }
    );
  }

  const status = prediction.status;
  const predictionId = prediction.id;

  // Find mapping row for this prediction
  const { data: row, error: mapErr } = await supabaseAdmin
    .from("transcriptions")
    .select("id, user_id, audio_id, json_path")
    .eq("prediction_id", predictionId)
    .single();

  if (mapErr || !row) {
    console.error("Mapping not found for prediction:", predictionId, mapErr);
    return NextResponse.json(
      { error: "Mapping not found" },
      { status: 400, headers: NO_CACHE_HEADERS }
    );
  }

  const transcriptionId: string = row.id; // Use the actual transcription row id for updates
  const userId: string = row.user_id;
  const audioId: string = row.audio_id;
  const previousPath: string | undefined = row.json_path;

  try {
    // Convert Replicate status to database status
    let dbStatus: DatabaseStatus = "processing";

    if (status === "succeeded" || status === "completed") {
      dbStatus = "completed";
    } else if (
      status === "failed" ||
      status === "canceled" ||
      status === "error"
    ) {
      dbStatus = "error";
    }

    if (dbStatus === "completed") {
      const output = prediction.output;

      // Extract text + segments robustly
      let text = "";
      let segments: ReplicateSegment[] = [];

      if (output) {
        if (Array.isArray(output)) {
          const candidate =
            output.find(
              (item): item is ReplicateOutput =>
                item &&
                typeof item === "object" &&
                ("text" in item || "segments" in item)
            ) || output[0];

          if (candidate && typeof candidate === "object") {
            segments = (candidate as ReplicateOutput).segments || [];
            text = (candidate as ReplicateOutput).text || "";
          } else if (typeof candidate === "string") {
            text = output.join(" ");
          }
        } else if (typeof output === "object" && output !== null) {
          segments = (output as ReplicateOutput).segments || [];
          text = (output as ReplicateOutput).text || "";
        } else if (typeof output === "string") {
          text = output;
        }
      }

      if (!text && Array.isArray(segments)) {
        text = segments
          .map((segment) =>
            typeof segment?.text === "string" ? segment.text : ""
          )
          .join(" ")
          .trim();
      }

      // Build new versioned path and upload JSON
      const newPath = buildVersionedPath(userId, audioId);
      const outputData: TranscriptionOutput = {
        text: text || "",
        segments: segments || [],
      };
      const jsonString = JSON.stringify(output ?? outputData, null, 2);

      const { error: uploadError } = await supabaseAdmin.storage
        .from("transcriptions")
        .upload(newPath, jsonString, {
          contentType: "application/json",
          upsert: false, // always write a new file
          cacheControl:
            "no-store, no-cache, must-revalidate, max-age=0, s-maxage=0",
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        return NextResponse.json(
          { error: "Could not save transcription file." },
          { status: 500, headers: NO_CACHE_HEADERS }
        );
      }

      // Update the transcription row to point to the NEW file
      const { error: updateErr } = await supabaseAdmin
        .from("transcriptions")
        .update({
          json_path: newPath,
          updated_at: new Date().toISOString(),
          edited_text: text || null, // optional: mirror into columns
          segments: segments || [],
          status: "completed",
        })
        .eq("id", transcriptionId)
        .eq("user_id", userId);

      if (updateErr) {
        console.error("DB pointer update error:", updateErr);
        // Cleanup the newly uploaded file to avoid orphaning
        await supabaseAdmin.storage
          .from("transcriptions")
          .remove([newPath])
          .catch(() => {});
        return NextResponse.json(
          { error: "Failed to update transcription record." },
          { status: 500, headers: NO_CACHE_HEADERS }
        );
      }

      // Update audio status
      await supabaseAdmin
        .from("audios")
        .update({ status: "completed" })
        .eq("id", audioId)
        .eq("user_id", userId);

      // Mark transcription job as completed (find job by prediction_id)
      const { data: jobData } = await supabaseAdmin
        .from("transcription_jobs")
        .select("id")
        .eq("prediction_id", predictionId)
        .single();
      
      if (jobData?.id) {
        await supabaseAdmin.rpc("mark_job_completed", {
          p_job_id: jobData.id
        });
      }

      // Delete the previous file (if any)
      if (previousPath && previousPath !== newPath) {
        await supabaseAdmin.storage
          .from("transcriptions")
          .remove([previousPath])
          .catch(() => {});
      }

      return NextResponse.json(
        { received: true, jsonPath: newPath },
        { headers: NO_CACHE_HEADERS }
      );
    }

    if (status === "failed" || status === "canceled" || status === "error") {
      const errorMessage = prediction.error
        ? typeof prediction.error === "string"
          ? prediction.error
          : JSON.stringify(prediction.error)
        : "Unknown error";

      // Update statuses to error
      await supabaseAdmin
        .from("audios")
        .update({ status: "error" })
        .eq("id", audioId)
        .eq("user_id", userId);

      await supabaseAdmin
        .from("transcriptions")
        .update({
          status: "error",
          error_message: errorMessage,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transcriptionId)
        .eq("user_id", userId);

      // Mark transcription job as failed (find job by prediction_id)
      const { data: jobData } = await supabaseAdmin
        .from("transcription_jobs")
        .select("id")
        .eq("prediction_id", predictionId)
        .single();
      
      if (jobData?.id) {
        await supabaseAdmin.rpc("mark_job_failed", {
          p_job_id: jobData.id,
          p_error: errorMessage
        });
      }

      return NextResponse.json(
        { received: true },
        { headers: NO_CACHE_HEADERS }
      );
    }

    // For other intermediate states, just acknowledge
    return NextResponse.json({ received: true }, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error("Failed to handle replicate webhook", error);
    return NextResponse.json(
      { error: "Webhook handling error" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
