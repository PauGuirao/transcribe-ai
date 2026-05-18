"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// Module-level guard prevents duplicate in-flight requests across Strict-Mode
// double-mount and across sibling components mounted in the same tick.
const inFlight = new Map<string, Promise<number>>();
const CACHE_TTL_MS = 120_000;

function readCache(userId: string): number | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(`tokens_cache_${userId}`);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { tokens: number; ts: number };
    if (Date.now() - parsed.ts < CACHE_TTL_MS) return parsed.tokens;
  } catch {
    /* swallow */
  }
  return null;
}

function writeCache(userId: string, tokens: number) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(
    `tokens_cache_${userId}`,
    JSON.stringify({ tokens, ts: Date.now() }),
  );
}

async function fetchTokens(userId: string): Promise<number> {
  const existing = inFlight.get(userId);
  if (existing) return existing;

  const promise = (async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("tokens")
      .eq("id", userId)
      .single();
    if (error) {
      if (error.code === "PGRST116") return 0;
      throw error;
    }
    return typeof data?.tokens === "number" ? data.tokens : 0;
  })();

  inFlight.set(userId, promise);
  try {
    const value = await promise;
    writeCache(userId, value);
    return value;
  } finally {
    inFlight.delete(userId);
  }
}

export interface UserTokensState {
  tokens: number | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useUserTokens(userId: string | undefined): UserTokensState {
  const [tokens, setTokens] = useState<number | null>(() =>
    userId ? readCache(userId) : null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setTokens(null);
      setError(null);
      return;
    }
    const cached = readCache(userId);
    if (cached !== null) {
      setTokens(cached);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const value = await fetchTokens(userId);
      setTokens(value);
    } catch (err) {
      console.error("Failed to load tokens:", err);
      setError(err instanceof Error ? err.message : "Failed to load tokens");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { tokens, loading, error, refresh: load };
}
