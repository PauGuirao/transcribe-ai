import { NextRequest, NextResponse } from "next/server";

/**
 * DEPRECATED: This endpoint is no longer used.
 * All uploads now go directly through the Cloudflare Worker to R2.
 * Use the /upload endpoint or the AudioUpload component instead.
 */
export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: "Aquest endpoint està obsolet. Utilitza /upload en el seu lloc.",
      deprecated: true,
      message: "Presigned URLs are no longer supported. Upload directly via the Worker.",
    },
    { status: 410 } // Gone
  );
}