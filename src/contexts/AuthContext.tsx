"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { getCachedUserProfile, getCachedOrganization, getCachedSubscriptionStatus } from "@/lib/cache";

// Define the shape of the context's value
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isSubscribed: boolean | null;
  planType: string | null;
  tokens: number | null;
  organization: any | null;
  organizationMembers: any[] | null;
  currentUserRole: string | null;
  checkingSubscription: boolean;
  signInWithGoogle: (returnUrl?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshTokens: () => Promise<void>;
  refreshOrganizationData: () => Promise<void>;
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
  const [organization, setOrganization] = useState<any | null>(null);
  const [organizationMembers, setOrganizationMembers] = useState<any[] | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  // Request deduplication
  const pendingMembersRequests = useRef<Map<string, Promise<any>>>(new Map());
  const membersCache = useRef<Map<string, { members: any[]; role: string | null; timestamp: number }>>(new Map());
  const CACHE_TTL = 30000; // 30 seconds cache

  useEffect(() => {
    // This effect handles user authentication state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      // Clear user+org-scoped caches on auth state changes
      membersCache.current.clear();
      pendingMembersRequests.current.clear();
      setOrganizationMembers(null);
      setCurrentUserRole(null);
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

  // Optimized function to fetch organization members with deduplication
  const fetchOrganizationMembers = useCallback(async (organizationId: string) => {
    const now = Date.now();
    const key = `${user?.id ?? 'anon'}:${organizationId}`;

    // Try user+org-scoped cache first
    const cached = membersCache.current.get(key);
    if (cached && now - cached.timestamp < CACHE_TTL) {
      setOrganizationMembers(cached.members);
      setCurrentUserRole(cached.role);
      return { members: cached.members, currentUserRole: cached.role };
    }

    // Return existing promise if one is pending for this key
    const pending = pendingMembersRequests.current.get(key);
    if (pending) {
      return pending;
    }

    const reqPromise = (async () => {
      try {
        const membersResponse = await fetch("/api/organization/members", { cache: 'no-store' });
        if (membersResponse.ok) {
          const membersData = await membersResponse.json();
          setOrganizationMembers(membersData.members);
          setCurrentUserRole(membersData.currentUserRole);
          membersCache.current.set(key, {
            members: membersData.members,
            role: membersData.currentUserRole,
            timestamp: Date.now(),
          });
          return membersData;
        }
        throw new Error('Failed to fetch members');
      } catch (error) {
        console.error("Error fetching organization members:", error);
        throw error;
      } finally {
        pendingMembersRequests.current.delete(key);
      }
    })();

    pendingMembersRequests.current.set(key, reqPromise);
    return reqPromise;
  }, [user?.id]);

  // Function to fetch subscription status
  const fetchSubscriptionStatus = useCallback(async (userId: string) => {
    setCheckingSubscription(true);
    
    try {
      // Use enhanced caching for subscription status
      const subscriptionData = await getCachedSubscriptionStatus(userId, supabase);
      
      if (!subscriptionData) {
        setIsSubscribed(false);
        setPlanType(null);
        setTokens(null);
        setOrganization(null);
        setOrganizationMembers(null);
        setCurrentUserRole(null);
        return;
      }

      // Set tokens from profile
      setTokens(subscriptionData.tokens || null);

      // Handle organization data
      if (subscriptionData.organization && subscriptionData.current_organization_id) {
        setOrganization(subscriptionData.organization);
        setIsSubscribed(subscriptionData.organization.subscription_status === 'active');
        setPlanType(subscriptionData.organization.plan_type || null);
        
        // Fetch organization members only once with deduplication
        try {
          await fetchOrganizationMembers(subscriptionData.organization.id);
        } catch (error) {
          console.error("Error fetching organization members:", error);
        }
      } else {
        // No organization, set defaults
        setIsSubscribed(false);
        setPlanType(null);
        setOrganization(null);
        setOrganizationMembers(null);
        setCurrentUserRole(null);
      }
    } catch (err) {
      console.error("Unexpected subscription fetch error:", err);
      setIsSubscribed(false);
      setPlanType(null);
      setTokens(null);
      setOrganization(null);
      setOrganizationMembers(null);
      setCurrentUserRole(null);
    } finally {
      setCheckingSubscription(false);
    }
  }, [fetchOrganizationMembers]);

  useEffect(() => {
    // This effect fetches the subscription status whenever the user object changes
    const handleUserChange = async () => {
      // If there's no user, reset subscription state
      if (!user) {
        setIsSubscribed(null);
        setPlanType(null);
        setTokens(null);
        setOrganization(null);
        setOrganizationMembers(null);
        setCurrentUserRole(null);
        setCheckingSubscription(false);
        return;
      }

      await fetchSubscriptionStatus(user.id);
    };

    handleUserChange();
  }, [user, fetchSubscriptionStatus]); // The dependency array ensures this runs only when `user` changes

  // Function to initiate Google sign-in
  const signInWithGoogle = useCallback(async (returnUrl?: string) => {
    // If returnUrl is an invitation URL, extract token and store in cookie
    if (returnUrl && returnUrl.includes('/invite/')) {
      const tokenMatch = returnUrl.match(/\/invite\/([^/?]+)/);
      if (tokenMatch) {
        const token = tokenMatch[1];
        // Set invitation token in cookie for server-side processing
        document.cookie = `invite_token=${token}; path=/; max-age=3600; SameSite=Lax`;
      }
    }
    
    const redirectTo = `${window.location.origin}/auth/callback`;
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });
    if (error) {
      console.error("Error signing in:", error.message);
    }
  }, []);

  // Function to sign the user out
  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error.message);
    }
  }, []);

  // Function to refresh tokens manually
  const refreshTokens = useCallback(async () => {
    if (!user) return;
    
    try {
      // Use enhanced caching for user profile and organization data
      const userProfile = await getCachedUserProfile(user.id, supabase);
      
      if (!userProfile) {
        console.error("Failed to refresh profile");
        return;
      }

      // Set tokens from profile
      setTokens(userProfile.tokens || null);

      // Get organization data if user has one
      if (userProfile.current_organization_id) {
        const orgData = await getCachedOrganization(userProfile.current_organization_id, supabase);
        
        if (orgData) {
          setOrganization(orgData);
          setIsSubscribed(orgData.subscription_status === 'active');
          setPlanType(orgData.plan_type || null);
        } else {
          // No organization, set defaults
          setIsSubscribed(false);
          setPlanType(null);
          setOrganization(null);
        }
      } else {
        // No organization, set defaults
        setIsSubscribed(false);
        setPlanType(null);
        setOrganization(null);
      }
    } catch (err) {
      console.error("Unexpected token refresh error:", err);
    }
  }, [user]);

  // Function to refresh organization data including members (now uses deduplication)
  const refreshOrganizationData = useCallback(async () => {
    if (!user || !organization?.id) return;
    
    try {
      await fetchOrganizationMembers(organization.id);
    } catch (error) {
      console.error("Error refreshing organization data:", error);
    }
  }, [user, organization?.id, fetchOrganizationMembers]);

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    user,
    session,
    loading,
    isSubscribed,
    planType,
    tokens,
    organization,
    organizationMembers,
    currentUserRole,
    checkingSubscription,
    signInWithGoogle,
    signOut,
    refreshTokens,
    refreshOrganizationData,
  }), [
    user,
    session,
    loading,
    isSubscribed,
    planType,
    tokens,
    organization,
    organizationMembers,
    currentUserRole,
    checkingSubscription,
    signInWithGoogle,
    signOut,
    refreshTokens,
    refreshOrganizationData,
  ]);

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
