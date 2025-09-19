import { createBrowserClient } from "@supabase/ssr";
import type { TranscriptionSegment, Speaker } from "@/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// Auth helpers
export const auth = {
  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });
    return { data, error };
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  async getSession() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    return { session, error };
  },

  async getUser() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    return { user, error };
  },
};

// Storage helpers
export const storage = {
  async uploadAudio(file: File, filename: string) {
    const { data, error } = await supabase.storage
      .from("audio-files")
      .upload(`audios/${filename}`, file);
    return { data, error };
  },

  async downloadAudio(filename: string) {
    const { data, error } = await supabase.storage
      .from("audio-files")
      .download(`audios/${filename}`);
    return { data, error };
  },

  async uploadTranscription(filename: string, content: string) {
    const blob = new Blob([content], { type: "text/plain" });
    const { data, error } = await supabase.storage
      .from("audio-files")
      .upload(`transcriptions/${filename}`, blob);
    return { data, error };
  },

  async uploadTranscriptionJSON(
    filename: string,
    content: {
      text: string;
      segments?: TranscriptionSegment[];
      speakers?: Speaker[];
      updated_at?: string;
    }
  ) {
    const blob = new Blob([JSON.stringify(content, null, 2)], {
      type: "application/json",
    });
    const { data, error } = await supabase.storage
      .from("audio-files")
      .upload(`transcriptions/${filename}`, blob);
    return { data, error };
  },

  getPublicUrl(path: string) {
    const { data } = supabase.storage.from("audio-files").getPublicUrl(path);
    return data.publicUrl;
  },
};

// Types for our database tables
export interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
  created_at: string;
}

export interface Audio {
  id: string;
  filename: string;
  original_name: string;
  custom_name?: string;
  file_path: string;
  upload_date: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "ERROR";
  user_id: string;
  created_at: string;
}

export interface Transcription {
  id: string;
  audio_id: string;
  original_text: string;
  edited_text: string;
  created_at: string;
  updated_at: string;
}

// Database operations
export const db = {
  // Users
  async createUser(user: Omit<User, "id" | "created_at">) {
    const { data, error } = await supabase
      .from("users")
      .insert([user])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getUserByEmail(email: string) {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  },

  // Audios
  async createAudio(audio: Omit<Audio, "id" | "created_at">) {
    const { data, error } = await supabase
      .from("audios")
      .insert([audio])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getAudiosByUserId(userId: string) {
    const { data, error } = await supabase
      .from("audios")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  async getAudioById(id: string) {
    const { data, error } = await supabase
      .from("audios")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  async updateAudioStatus(id: string, status: Audio["status"]) {
    const { data, error } = await supabase
      .from("audios")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateAudioCustomName(id: string, customName: string) {
    const { data, error } = await supabase
      .from("audios")
      .update({ custom_name: customName })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Transcriptions
  async createTranscription(
    transcription: Omit<Transcription, "id" | "created_at" | "updated_at">
  ) {
    const { data, error } = await supabase
      .from("transcriptions")
      .insert([transcription])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getTranscriptionByAudioId(audioId: string) {
    const { data, error } = await supabase
      .from("transcriptions")
      .select("*")
      .eq("audio_id", audioId)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  },

  async updateTranscription(
    audioId: string,
    updates: Partial<Pick<Transcription, "original_text" | "edited_text">>
  ) {
    const { data, error } = await supabase
      .from("transcriptions")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("audio_id", audioId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

export default supabase;
