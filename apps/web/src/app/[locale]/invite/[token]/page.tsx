"use client";

import React, { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Users, Building2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type InvalidReason = "expired" | "used" | "not_found";

interface InviteValid {
  valid: true;
  organizationId: string;
  organizationName: string | null;
  organizationImageUrl: string | null;
  inviterName: string | null;
  role: "member" | "admin";
  expiresAt: string | null;
}

interface InviteInvalid {
  valid: false;
  reason: InvalidReason;
}

type InviteResponse = InviteValid | InviteInvalid;

const REASON_COPY: Record<InvalidReason, { title: string; description: string }> = {
  expired: {
    title: "Aquesta invitació ha caducat",
    description: "Demana al teu equip que te'n generi una de nova.",
  },
  used: {
    title: "Aquesta invitació ja s'ha utilitzat",
    description: "Si necessites accés, demana una nova invitació.",
  },
  not_found: {
    title: "Invitació no vàlida",
    description: "Aquest enllaç no existeix o ja no és vàlid.",
  },
};

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = (params?.token as string) ?? "";
  const { user, loading: authLoading } = useAuth();

  const [invite, setInvite] = useState<InviteResponse | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!token) {
        if (!cancelled) {
          setInvite({ valid: false, reason: "not_found" });
          setLoadingInvite(false);
        }
        return;
      }
      try {
        const res = await fetch(
          `/api/invitations?token=${encodeURIComponent(token)}`,
          { cache: "no-store" }
        );
        const data = (await res.json()) as InviteResponse;
        if (!cancelled) setInvite(data);
      } catch (err) {
        console.error("Failed to load invitation:", err);
        if (!cancelled) setInvite({ valid: false, reason: "not_found" });
      } finally {
        if (!cancelled) setLoadingInvite(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSignIn = useCallback(() => {
    // Hand off to /auth/signin via the pending_invite_token cookie.
    // HttpOnly isn't possible from client; that's acceptable here.
    document.cookie = `pending_invite_token=${encodeURIComponent(
      token
    )}; max-age=3600; path=/; samesite=lax`;
    router.push("/auth/signin");
  }, [router, token]);

  const handleAccept = useCallback(async () => {
    if (!token) return;
    setAccepting(true);
    setAcceptError(null);
    try {
      const res = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (res.ok) {
        // Clear any stale handoff cookie.
        document.cookie = "pending_invite_token=; max-age=0; path=/; samesite=lax";
        router.push("/dashboard");
        router.refresh();
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (res.status === 410) {
        const reason = (data?.reason as InvalidReason) ?? "not_found";
        setInvite({ valid: false, reason });
        return;
      }
      setAcceptError(
        typeof data?.error === "string"
          ? data.error
          : "No s'ha pogut acceptar la invitació"
      );
    } catch (err) {
      console.error("Failed to accept invitation:", err);
      setAcceptError("S'ha produït un error en acceptar la invitació.");
    } finally {
      setAccepting(false);
    }
  }, [router, token]);

  const isLoading = loadingInvite || authLoading;

  if (isLoading || !invite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="flex flex-col items-center gap-3 text-neutral-500">
          <Loader2 className="size-6 animate-spin" />
          <p className="text-sm">Validant la invitació...</p>
        </div>
      </div>
    );
  }

  if (!invite.valid) {
    const copy = REASON_COPY[invite.reason];
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="w-full max-w-md rounded-2xl border border-rose-100 bg-rose-50 p-8 text-center">
          <h1 className="text-2xl font-normal tracking-tight text-rose-900">
            {copy.title}
          </h1>
          <p className="mt-2 text-sm text-rose-700/80">{copy.description}</p>
          <button
            onClick={() => router.push("/")}
            className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-neutral-900 px-4 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
          >
            Tornar a l'inici
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-normal tracking-tight text-neutral-900">
            T'han convidat a unir-te
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Revisa els detalls de la invitació abans d'acceptar-la.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center overflow-hidden rounded-xl bg-neutral-100">
              {invite.organizationImageUrl ? (
                <Image
                  src={invite.organizationImageUrl}
                  alt={invite.organizationName ?? "Organització"}
                  width={48}
                  height={48}
                  className="size-12 object-cover"
                  unoptimized
                />
              ) : (
                <Building2 className="size-6 text-neutral-500" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-medium text-neutral-900">
                {invite.organizationName ?? "Organització"}
              </p>
              <p className="mt-0.5 text-xs text-neutral-500">
                {invite.inviterName
                  ? `Convidat per ${invite.inviterName}`
                  : "T'han convidat a aquest equip"}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-medium text-neutral-700">
              <Users className="size-3" />
              {invite.role === "admin" ? "Admin" : "Membre"}
            </span>
          </div>

          {acceptError && (
            <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {acceptError}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-2">
            {user ? (
              <>
                <button
                  onClick={handleAccept}
                  disabled={accepting}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-neutral-900 px-4 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {accepting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Acceptant...
                    </>
                  ) : (
                    "Acceptar invitació"
                  )}
                </button>
                <button
                  onClick={() => router.push("/")}
                  disabled={accepting}
                  className="inline-flex h-10 w-full items-center justify-center rounded-md border border-neutral-200 bg-white px-4 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel·lar
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSignIn}
                  className="inline-flex h-10 w-full items-center justify-center rounded-md bg-neutral-900 px-4 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
                >
                  Inicia sessió per acceptar
                </button>
                <p className="text-center text-xs text-neutral-500">
                  Necessites iniciar sessió per acceptar aquesta invitació.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
