import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

interface RawTranscription {
  id: string;
  audio_id: string;
  created_at: string;
  updated_at: string;
  alumne_id: string;
  json_path: string;
  audios: {
    user_id: string;
    custom_name?: string;
  };
}

interface FormattedTranscription {
  id: string;
  audioId: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
}

export const runtime = "nodejs";

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0, s-maxage=0",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const alumneId = searchParams.get("alumneId");

    if (!alumneId) {
      return NextResponse.json(
        { success: false, error: "alumneId parameter is required" },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set({ name, value, ...options })
            );
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401, headers: NO_CACHE_HEADERS }
      );
    }

    // Get transcriptions for the specified alumne
    const { data: transcriptions, error: transcriptionsError } = (await supabase
      .from("transcriptions")
      .select(
        `
        id,
        audio_id,
        created_at,
        updated_at,
        alumne_id,
        json_path,
        audios:audio_id (
          user_id,
          custom_name
        )
      `
      )
      .eq("alumne_id", alumneId)
      .eq("audios.user_id", user.id)
      .order("created_at", { ascending: false })) as {
      data: RawTranscription[] | null;
      error: Error | null;
    };

    if (transcriptionsError) {
      console.error("Error fetching transcriptions:", transcriptionsError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch transcriptions" },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    // Map the results to a cleaner format
    const formattedTranscriptions: FormattedTranscription[] = (
      transcriptions || []
    ).map((t: RawTranscription) => ({
      id: t.id,
      audioId: t.audio_id,
      name: t.audios.custom_name,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    }));

    return NextResponse.json(
      {
        success: true,
        transcriptions: formattedTranscriptions,
      },
      { headers: NO_CACHE_HEADERS }
    );
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
