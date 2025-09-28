"use client";

import React, { useState, useCallback, useReducer, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Copy, 
  Check, 
  Loader2, 
  X, 
  Mail, 
  Link, 
  Users, 
  MessageCircle,
  Twitter,
  Facebook,
  Share2
} from "lucide-react";

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// State management with useReducer
interface InviteState {
  inviteUrl: string;
  isLoading: boolean;
  isCopied: boolean;
  error: string | null;
  cachedInviteUrl: string | null;
  cacheExpiry: number | null;
  emailInvite: {
    email: string;
    isLoading: boolean;
    success: boolean;
    error: string | null;
  };
}

type InviteAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_INVITE_URL'; payload: string }
  | { type: 'SET_COPIED'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CACHED_URL'; payload: { url: string; expiry: number } }
  | { type: 'CLEAR_CACHE' }
  | { type: 'RESET' }
  | { type: 'SET_EMAIL'; payload: string }
  | { type: 'SET_EMAIL_LOADING'; payload: boolean }
  | { type: 'SET_EMAIL_SUCCESS'; payload: boolean }
  | { type: 'SET_EMAIL_ERROR'; payload: string | null };

const initialState: InviteState = {
  inviteUrl: "",
  isLoading: false,
  isCopied: false,
  error: null,
  cachedInviteUrl: null,
  cacheExpiry: null,
  emailInvite: {
    email: "",
    isLoading: false,
    success: false,
    error: null,
  },
};

function inviteReducer(state: InviteState, action: InviteAction): InviteState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload, error: null };
    case 'SET_INVITE_URL':
      return { ...state, inviteUrl: action.payload, isLoading: false, error: null };
    case 'SET_COPIED':
      return { ...state, isCopied: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'SET_CACHED_URL':
      return { 
        ...state, 
        cachedInviteUrl: action.payload.url, 
        cacheExpiry: action.payload.expiry,
        inviteUrl: action.payload.url 
      };
    case 'CLEAR_CACHE':
      return { ...state, cachedInviteUrl: null, cacheExpiry: null };
    case 'SET_EMAIL':
      return { 
        ...state, 
        emailInvite: { ...state.emailInvite, email: action.payload, error: null } 
      };
    case 'SET_EMAIL_LOADING':
      return { 
        ...state, 
        emailInvite: { 
          ...state.emailInvite, 
          isLoading: action.payload, 
          error: action.payload ? null : state.emailInvite.error // Solo limpiar error cuando se inicia la carga
        } 
      };
    case 'SET_EMAIL_SUCCESS':
      return { 
        ...state, 
        emailInvite: { ...state.emailInvite, success: action.payload, isLoading: false } 
      };
    case 'SET_EMAIL_ERROR':
      return { 
        ...state, 
        emailInvite: { ...state.emailInvite, error: action.payload, isLoading: false } 
      };
    case 'RESET':
      return { ...initialState };
    default:
      return state;
  }
}

// Cache utilities
const CACHE_KEY = 'invite_modal_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const getCachedInvite = (): { url: string; expiry: number } | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.expiry > Date.now()) {
        return parsed;
      } else {
        localStorage.removeItem(CACHE_KEY);
      }
    }
  } catch (error) {
    console.error('Error reading cache:', error);
  }
  return null;
};

const setCachedInvite = (url: string) => {
  try {
    const cacheData = {
      url,
      expiry: Date.now() + CACHE_DURATION,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    return cacheData;
  } catch (error) {
    console.error('Error setting cache:', error);
    return { url, expiry: Date.now() + CACHE_DURATION };
  }
};

function InviteModalComponent({ isOpen, onClose }: InviteModalProps) {
  const [state, dispatch] = useReducer(inviteReducer, initialState);
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check for cached invite on mount
  useEffect(() => {
    const cached = getCachedInvite();
    if (cached) {
      dispatch({ type: 'SET_CACHED_URL', payload: cached });
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Reset copied state after 2 seconds
  useEffect(() => {
    if (state.isCopied) {
      const timer = setTimeout(() => {
        dispatch({ type: 'SET_COPIED', payload: false });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state.isCopied]);

  const getOrCreateInvite = useCallback(async (retryCount = 0): Promise<void> => {
    // Check cache first
    const cached = getCachedInvite();
    if (cached) {
      dispatch({ type: 'SET_CACHED_URL', payload: cached });
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      // First, try to get existing invite
      const getResponse = await fetch("/api/organization/invite", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: abortControllerRef.current.signal,
      });

      if (getResponse.ok) {
        const getData = await getResponse.json();
        if (getData.inviteUrl) {
          // Existing invite found
          const cacheData = setCachedInvite(getData.inviteUrl);
          dispatch({ type: 'SET_CACHED_URL', payload: cacheData });
          console.log("Enlace de invitación existente recuperado");
          return;
        }
      }

      // No existing invite found, create a new one
      const postResponse = await fetch("/api/organization/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: abortControllerRef.current.signal,
      });

      if (!postResponse.ok) {
        const errorData = await postResponse.json();
        throw new Error(errorData.error || "Failed to generate invite");
      }

      const postData = await postResponse.json();
      
      if (postData.inviteUrl) {
        const cacheData = setCachedInvite(postData.inviteUrl);
        dispatch({ type: 'SET_CACHED_URL', payload: cacheData });
        console.log("Nuevo enlace de invitación generado");
      } else {
        throw new Error("No invite URL received");
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return; // Request was cancelled, don't show error
      }

      console.error("Error getting/creating invite:", error);
      
      // Retry logic with exponential backoff
      if (retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        retryTimeoutRef.current = setTimeout(() => {
          getOrCreateInvite(retryCount + 1);
        }, delay);
      } else {
        dispatch({ 
          type: 'SET_ERROR', 
          payload: "Error al obtener el enlace de invitación. Por favor, inténtalo de nuevo." 
        });
      }
    }
  }, []);

  const copyToClipboard = useCallback(async () => {
    if (!state.inviteUrl) return;

    try {
      await navigator.clipboard.writeText(state.inviteUrl);
      dispatch({ type: 'SET_COPIED', payload: true });
      console.log("Enlace copiado al portapapeles");
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = state.inviteUrl;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        dispatch({ type: 'SET_COPIED', payload: true });
        console.log("Enlace copiado al portapapeles");
      } catch (fallbackError) {
        console.error("Fallback copy failed:", fallbackError);
        alert("Error al copiar el enlace");
      }
      document.body.removeChild(textArea);
    }
  }, [state.inviteUrl]);

  const shareViaWhatsApp = useCallback(() => {
    if (!state.inviteUrl) return;
    const message = encodeURIComponent(`¡Te invito a unirte a nuestro equipo! Usa este enlace: ${state.inviteUrl}`);
    window.open(`https://wa.me/?text=${message}`, '_blank');
  }, [state.inviteUrl]);

  const shareViaEmail = useCallback(() => {
    if (!state.inviteUrl) return;
    const subject = encodeURIComponent('Invitación al equipo');
    const body = encodeURIComponent(`¡Hola!\n\nTe invito a unirte a nuestro equipo. Puedes acceder usando el siguiente enlace:\n\n${state.inviteUrl}\n\n¡Esperamos verte pronto!`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  }, [state.inviteUrl]);

  const shareViaTwitter = useCallback(() => {
    if (!state.inviteUrl) return;
    const text = encodeURIComponent(`¡Únete a nuestro equipo! ${state.inviteUrl}`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  }, [state.inviteUrl]);

  const shareViaFacebook = useCallback(() => {
    if (!state.inviteUrl) return;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(state.inviteUrl)}`, '_blank');
  }, [state.inviteUrl]);

  const shareViaNative = useCallback(async () => {
    if (!state.inviteUrl) return;
    
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Invitación al equipo',
          text: '¡Te invito a unirte a nuestro equipo!',
          url: state.inviteUrl,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback to copy to clipboard
      copyToClipboard();
    }
  }, [state.inviteUrl, copyToClipboard]);

  const sendEmailInvite = useCallback(async () => {
    if (!state.emailInvite.email || !state.inviteUrl) return;

    dispatch({ type: 'SET_EMAIL_LOADING', payload: true });
    dispatch({ type: 'SET_EMAIL_SUCCESS', payload: false });

    try {
      const response = await fetch('/api/organization/invite/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: state.emailInvite.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar la invitación');
      }

      dispatch({ type: 'SET_EMAIL_SUCCESS', payload: true });
      dispatch({ type: 'SET_EMAIL', payload: '' }); // Clear email field
    } catch (error) {
      console.error('Error sending email invite:', error);
      dispatch({ 
        type: 'SET_EMAIL_ERROR', 
        payload: error instanceof Error ? error.message : 'Error al enviar la invitación' 
      });
    } finally {
      dispatch({ type: 'SET_EMAIL_LOADING', payload: false });
    }
  }, [state.emailInvite.email]);

  const isNativeShareAvailable = typeof navigator !== 'undefined' && navigator.share;

  const handleClose = useCallback(() => {
    dispatch({ type: 'RESET' });
    onClose();
  }, [onClose]);

  // Generate invite URL when modal opens
  useEffect(() => {
    if (isOpen && !state.inviteUrl && !state.isLoading) {
      getOrCreateInvite();
    }
  }, [isOpen, state.inviteUrl, state.isLoading, getOrCreateInvite]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" />
            Convidar membres
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Invitation Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              <h3 className="font-medium">Enviar invitació per correu</h3>
            </div>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Correu electrònic</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={state.emailInvite.email}
                  onChange={(e) => dispatch({ type: 'SET_EMAIL', payload: e.target.value })}
                  placeholder="usuari@exemple.com"
                  disabled={state.emailInvite.isLoading}
                />
              </div>
              
              <Button
                onClick={sendEmailInvite}
                disabled={!state.emailInvite.email || state.emailInvite.isLoading}
                className="w-full"
              >
                {state.emailInvite.isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Enviant...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Enviar invitació
                  </>
                )}
              </Button>

              {state.emailInvite.success && (
                <div className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Invitació enviada correctament
                </div>
              )}

              {state.emailInvite.error && (
                <div className="text-sm text-red-600 dark:text-red-400">
                  {state.emailInvite.error}
                </div>
              )}

              <p className="text-xs text-gray-500">
                S'enviarà un correu amb un enllaç d'invitació segur i personalitzat vàlid per 7 dies
              </p>
            </div>
          </div>


        </CardContent>
      </Card>
    </div>
  );
}

// Export with React.memo for performance optimization
export const InviteModal = React.memo(InviteModalComponent);