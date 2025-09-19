"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

// Define the shape of the context's value
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isSubscribed: boolean | null;
  planType: string | null;
  tokens: number | null;
  checkingSubscription: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshTokens: () => Promise<void>;
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Create the provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // State for subscription status and plan
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
  const [planType, setPlanType] = useState<string | null>(null);
  const [tokens, setTokens] = useState<number | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  useEffect(() => {
    // This effect handles user authentication state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Set the initial session on component mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setLoading(false);
      }
    });

    // Cleanup the subscription on unmount
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // This effect fetches the subscription status whenever the user object changes
    const fetchSubscriptionStatus = async () => {
      // If there's no user, reset subscription state
      if (!user) {
        setIsSubscribed(null);

        setCheckingSubscription(false);
        return;
      }

      setCheckingSubscription(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("is_subscribed, plan_type, tokens")
          .eq("id", user.id)
          .single();

        console.log(user.id);
        console.log("Subscription data:", data, "Error:", error);

        if (error) {
          console.error("Failed to load subscription status:", error);
          setIsSubscribed(false); // Default to false on error for security
          setPlanType(null);
          setTokens(null);
        } else {
          setIsSubscribed(Boolean(data?.is_subscribed));
          setPlanType(data?.plan_type || null);
          setTokens(data?.tokens || null);
        }
      } catch (err) {
        console.error("Unexpected subscription fetch error:", err);
        setIsSubscribed(false);
      } finally {
        setCheckingSubscription(false);
      }
    };

    fetchSubscriptionStatus();
  }, [user]); // The dependency array ensures this runs only when `user` changes

  // Function to initiate Google sign-in
  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });
    if (error) {
      console.error("Error signing in:", error.message);
    }
  };

  // Function to sign the user out
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error.message);
    }
  };

  // Function to refresh tokens manually
  const refreshTokens = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("is_subscribed, plan_type, tokens")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Failed to refresh tokens:", error);
      } else {
        setIsSubscribed(Boolean(data?.is_subscribed));
        setPlanType(data?.plan_type || null);
        setTokens(data?.tokens || null);
      }
    } catch (err) {
      console.error("Unexpected token refresh error:", err);
    }
  };

  // The value provided to consuming components
  const value = {
    user,
    session,
    loading,
    isSubscribed,
    planType,
    tokens,
    checkingSubscription,
    signInWithGoogle,
    signOut,
    refreshTokens,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use the AuthContext
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
