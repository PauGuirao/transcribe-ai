"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMinutesAllowance, type PlanId } from "@/config/pricing";
import { useAuth } from "@/contexts/AuthContext";

/* ----------------------------- Types ------------------------------ */

export interface UsageOrgEntry {
  id: string;
  name: string;
  imageUrl: string | null;
  plan: string;
  role: string;
  isCurrent: boolean;
}

export interface UsageData {
  orgId: string;
  orgName: string;
  orgImageUrl: string | null;
  plan: PlanId;
  minutesUsed: number;
  minutesAllowance: number;
  minutesRemaining: number;
  percentUsed: number;
  periodEnd: string | null;
  role: "owner" | "admin" | "member";
  organizations: UsageOrgEntry[];
}

export interface UsageState {
  data: UsageData | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/* --------------------------- Hook impl ---------------------------- */

const REFETCH_INTERVAL_MS = 30_000;

function useUsageInternal(): UsageState {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/usage", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        if (mountedRef.current) {
          setError(`HTTP ${res.status}`);
          setLoading(false);
        }
        return;
      }
      const json = (await res.json()) as UsageData;
      if (mountedRef.current) {
        setData(json);
        setError(null);
        setLoading(false);
      }
    } catch (e) {
      if (mountedRef.current) {
        setError(e instanceof Error ? e.message : "Failed to load usage");
        setLoading(false);
      }
    }
  }, []);

  // Reset cached data whenever the authenticated user changes so the next
  // user doesn't briefly see the previous user's org/usage. Skip if no user.
  useEffect(() => {
    mountedRef.current = true;
    setData(null);
    setError(null);
    setLoading(true);
    if (!userId) {
      setLoading(false);
      return;
    }
    load();
    const id = window.setInterval(load, REFETCH_INTERVAL_MS);
    return () => {
      mountedRef.current = false;
      window.clearInterval(id);
    };
  }, [userId, load]);

  return useMemo(
    () => ({ data, loading, error, refresh: load }),
    [data, loading, error, load],
  );
}

/* --------------------------- Context ----------------------------- */
/**
 * Optional context so multiple consumers in the same tree (e.g. AppSidebar
 * + SidebarUsageWidget) share a single fetch loop. If no provider is mounted,
 * `useUsage()` falls back to a local instance.
 */

const UsageContext = createContext<UsageState | null>(null);

export function UsageProvider({ children }: { children: React.ReactNode }) {
  const value = useUsageInternal();
  return (
    <UsageContext.Provider value={value}>{children}</UsageContext.Provider>
  );
}

export function useUsage(): UsageState {
  const ctx = useContext(UsageContext);
  // If a provider exists, use it. Otherwise spin up a local fetch loop.
  // We must call the hook unconditionally to obey rules-of-hooks; we just
  // ignore the result when a provider is present.
  const local = useUsageInternal();
  return ctx ?? local;
}

/* --------------------------- Helpers ----------------------------- */

/** Format the "used" minute count, matching the allowance formatting style. */
function formatMinutesUsed(used: number, allowance: number): string {
  // If the allowance is shown in hours, show used in hours too (1 decimal).
  if (allowance >= 120) {
    const hours = used / 60;
    // Show one decimal if not a whole number, else as integer.
    const rounded = Math.round(hours * 10) / 10;
    return Number.isInteger(rounded) ? `${rounded} h` : `${rounded.toFixed(1)} h`;
  }
  return `${used} min`;
}

/* --------------------------- Widget ------------------------------ */

export function SidebarUsageWidget() {
  const router = useRouter();
  const { data, loading } = useUsage();

  if (loading && !data) {
    return (
      <div className="border-t border-gray-200 bg-white px-3 py-3">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
          <div className="h-full w-1/3 animate-pulse bg-neutral-200" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const {
    minutesUsed,
    minutesAllowance,
    minutesRemaining,
    percentUsed,
    plan,
  } = data;

  const usedLabel = formatMinutesUsed(minutesUsed, minutesAllowance);
  const allowanceLabel = formatMinutesAllowance(minutesAllowance, "ca");

  const remainingLabel =
    minutesAllowance >= 120
      ? `${Math.round((minutesRemaining / 60) * 10) / 10} h restants`
      : `${minutesRemaining} min restants`;

  const showFreeUpsell = plan === "free" && percentUsed >= 80 && percentUsed < 100;
  const isOverLimit = percentUsed >= 100;

  const barColor =
    percentUsed >= 100
      ? "bg-rose-500"
      : percentUsed >= 80
        ? "bg-amber-500"
        : "bg-emerald-500";

  return (
    <div className="border-t border-gray-200 bg-white px-3 py-3.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
          Aquest mes
        </span>
        <span className="text-[10px] font-medium text-neutral-500">
          {Math.min(Math.round(percentUsed), 100)}%
        </span>
      </div>

      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className="text-[18px] font-semibold leading-none text-neutral-900 tabular-nums">
          {usedLabel}
        </span>
        <span className="text-[12px] text-neutral-400 tabular-nums">
          / {allowanceLabel}
        </span>
      </div>

      <div
        className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-neutral-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentUsed}
      >
        <div
          className={cn("h-full transition-all", barColor)}
          style={{ width: `${Math.min(percentUsed, 100)}%` }}
        />
      </div>

      {isOverLimit ? (
        <button
          type="button"
          onClick={() => router.push("/payment")}
          className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-md bg-gradient-to-r from-blue-500 to-blue-600 px-2.5 py-1.5 text-[12px] font-medium text-white shadow-sm transition-all hover:from-blue-600 hover:to-blue-700"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Actualitza el pla
        </button>
      ) : (
        <p className="mt-2 text-[11px] text-neutral-500">{remainingLabel}</p>
      )}
      {showFreeUpsell && (
        <p className="mt-1 text-[11px] text-neutral-500">
          Plan Bàsic dóna 10 hores
        </p>
      )}
    </div>
  );
}

export default SidebarUsageWidget;
