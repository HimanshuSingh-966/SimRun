/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { sanitizeError } from '../lib/sanitizeError';

export type UserRole = 'student' | 'faculty' | 'admin';
export type UserStatus = 'pending' | 'approved' | 'rejected';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  avatar_url: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string, captchaToken?: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, metadata: {
    full_name: string;
    role: UserRole;
  }, captchaToken?: string) => Promise<{ error: string | null; userId: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);
  const lastFetchedIdRef = useRef<string | null>(null);
  const cachedProfileRef = useRef<Profile | null>(null);

  const isTransientNetworkError = (error: unknown) => {
    const msg = String((error as Error)?.message || '').toLowerCase();
    const details = String((error as { details?: string })?.details || '').toLowerCase();
    return (
      msg.includes('failed to fetch') ||
      msg.includes('connection timeout') ||
      msg.includes('upstream connect error') ||
      details.includes('failed to fetch') ||
      details.includes('connection timeout') ||
      details.includes('upstream connect error')
    );
  };

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Fetch profile from profiles table — with dedup guard
  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    // Skip if already fetching or already fetched for this user
    if (fetchingRef.current && lastFetchedIdRef.current === userId) return cachedProfileRef.current;
    fetchingRef.current = true;
    lastFetchedIdRef.current = userId;

    try {
      const maxAttempts = 3;

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email, role, status, avatar_url')
          .eq('id', userId)
          .single();

        if (!error) {
          return data as Profile;
        }

        if (isTransientNetworkError(error) && attempt < maxAttempts) {
          await wait(400 * attempt);
          continue;
        }

        if (process.env.NODE_ENV !== 'production') console.error('Error fetching profile:', error);
        return null;
      }

      return null;
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const p = await fetchProfile(session.user.id);
        if (mounted) setProfile(p);
      }
      if (mounted) setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Only re-fetch profile on sign-in or if user changed
          if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
            const p = await fetchProfile(session.user.id);
            if (mounted) setProfile(p);
          }
        } else {
          setProfile(null);
        }
        if (mounted) setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // Keep a ref in sync so fetchProfile can return cached results without re-subscribing auth listeners.
  useEffect(() => {
    cachedProfileRef.current = profile;
  }, [profile]);

  const signIn = async (email: string, password: string, captchaToken?: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: captchaToken ? { captchaToken } : undefined,
    });
    if (error) return { error: sanitizeError(error) };
    
    // Force refetch profile on explicit login attempt
    if (data.session?.user) {
      const p = await fetchProfile(data.session.user.id);
      setProfile(p);
    }
    
    return { error: null };
  };

  const signUp = async (
    email: string,
    password: string,
    metadata: { full_name: string; role: UserRole },
    captchaToken?: string
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: metadata.full_name,
          role: metadata.role,
        },
        ...(captchaToken ? { captchaToken } : {}),
      },
    });

    if (error) return { error: sanitizeError(error), userId: null };

    const userId = data.user?.id ?? null;

    // NOTE: We no longer manually insert into the `profiles` table here.
    // A secure Postgres Database Trigger (on_auth_user_created) handles this 
    // automatically and securely on the backend, preventing duplicate inserts
    // and ensuring no APIs are exposed.

    return { error: null, userId };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') console.error("Error signing out:", err);
    } finally {
      setSession(null);
      setUser(null);
      setProfile(null);
      lastFetchedIdRef.current = null;
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
