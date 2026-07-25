// src/contexts/AuthContext.tsx
'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { User, AuthError, Session } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  UserType,
  isValidUserType,
  normalizeUserType,
  getDefaultRedirect,
  getDefaultUserType,
  canPostListings,
} from '@/types/user';

// Re-export for convenience
export type { UserType };
export { isValidUserType, normalizeUserType, getDefaultRedirect, getDefaultUserType, canPostListings };

// Extended User type with proper metadata typing
export interface ExtendedUser extends User {
  user_metadata: {
    user_type?: string; // may still contain legacy values
    full_name?: string;
    phone?: string;
    avatar_url?: string;
  };
}

interface UserProfile {
  userType: UserType;
  isVerified: boolean;
  fullName?: string;
  phone?: string;
}

interface AuthContextType {
  user: ExtendedUser | null;
  userType: UserType | null;
  isVerified: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  profile: UserProfile | null;
  canPost: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (
    email: string,
    password: string,
    userType: UserType,
    fullName?: string,
    phone?: string
  ) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshUserType: () => Promise<void>;
  redirectToDashboard: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Cache keys
const AUTH_CACHE_KEY = 'ekhaya_auth_cache';
const PROFILE_CACHE_KEY = 'ekhaya_profile_cache';

interface AuthCache {
  user: {
    id: string;
    email: string;
    user_metadata: Record<string, any>;
  } | null;
  timestamp: number;
}

interface ProfileCache {
  userType: UserType;
  isVerified: boolean;
  fullName?: string;
  phone?: string;
  timestamp: number;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter();

  // Refs to prevent re-fetches and state updates
  const isMountedRef = useRef(true);
  const initialLoadDoneRef = useRef(false);
  const profileFetchInProgressRef = useRef(false);
  const lastUserCheckRef = useRef<number>(0);
  const sessionCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);
  const userRef = useRef<ExtendedUser | null>(null);
  const profileRef = useRef<UserProfile | null>(null);

  const userType = profile?.userType || null;
  const isVerified = profile?.isVerified || false;
  const canPost = canPostListings(userType);

  // === CACHE HELPERS ===

  const getCachedUser = useCallback((): ExtendedUser | null => {
    try {
      const cached = localStorage.getItem(AUTH_CACHE_KEY);
      if (!cached) return null;

      const data: AuthCache = JSON.parse(cached);
      const now = Date.now();

      // Cache for 5 minutes
      if (now - data.timestamp > 5 * 60 * 1000) {
        localStorage.removeItem(AUTH_CACHE_KEY);
        return null;
      }

      if (data.user) {
        return {
          id: data.user.id,
          email: data.user.email,
          user_metadata: data.user.user_metadata,
          app_metadata: {},
          aud: '',
          created_at: '',
        } as ExtendedUser;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const getCachedProfile = useCallback((): ProfileCache | null => {
    try {
      const cached = localStorage.getItem(PROFILE_CACHE_KEY);
      if (!cached) return null;

      const data: ProfileCache = JSON.parse(cached);
      const now = Date.now();

      if (now - data.timestamp > 5 * 60 * 1000) {
        localStorage.removeItem(PROFILE_CACHE_KEY);
        return null;
      }

      return data;
    } catch {
      return null;
    }
  }, []);

  const cacheUser = useCallback((userData: ExtendedUser | null) => {
    try {
      if (userData) {
        const cacheData: AuthCache = {
          user: {
            id: userData.id,
            email: userData.email || '',
            user_metadata: userData.user_metadata || {},
          },
          timestamp: Date.now(),
        };
        localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(cacheData));
      } else {
        localStorage.removeItem(AUTH_CACHE_KEY);
      }
    } catch {
      // Silently fail
    }
  }, []);

  const cacheProfile = useCallback((profileData: UserProfile | null) => {
    try {
      if (profileData) {
        const cacheData: ProfileCache = {
          ...profileData,
          timestamp: Date.now(),
        };
        localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(cacheData));
      } else {
        localStorage.removeItem(PROFILE_CACHE_KEY);
      }
    } catch {
      // Silently fail
    }
  }, []);

  // === AUTH FUNCTIONS ===

  const createUserProfile = useCallback(
    async (
      userId: string,
      email: string,
      userType: UserType = 'seeker',
      fullName?: string,
      phone?: string
    ): Promise<UserProfile | null> => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .upsert(
            {
              id: userId,
              email,
              full_name: fullName || null,
              phone: phone || null,
              user_type: userType, // store canonical value
              is_verified: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: 'id',
              ignoreDuplicates: false,
            }
          )
          .select('user_type, is_verified, full_name, phone')
          .maybeSingle();

        if (error) {
          console.error('Error upserting user profile:', error.message);
          return null;
        }

        if (data) {
          return {
            userType: normalizeUserType(data.user_type),
            isVerified: data.is_verified || false,
            fullName: data.full_name,
            phone: data.phone,
          };
        }

        return null;
      } catch (error) {
        console.error('Error in createUserProfile:', error);
        return null;
      }
    },
    []
  );

  const fetchUserProfile = useCallback(
    async (userId: string, forceRefresh = false): Promise<UserProfile | null> => {
      if (!userId) return null;

      // Check cache first (unless forced refresh)
      if (!forceRefresh) {
        const cached = getCachedProfile();
        if (cached) {
          return {
            userType: cached.userType,
            isVerified: cached.isVerified,
            fullName: cached.fullName,
            phone: cached.phone,
          };
        }
      }

      // Prevent concurrent fetches
      if (profileFetchInProgressRef.current && !forceRefresh) {
        await new Promise(resolve => setTimeout(resolve, 100));
        const cached = getCachedProfile();
        if (cached) {
          return {
            userType: cached.userType,
            isVerified: cached.isVerified,
            fullName: cached.fullName,
            phone: cached.phone,
          };
        }
        return null;
      }

      profileFetchInProgressRef.current = true;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('user_type, is_verified, full_name, phone')
          .eq('id', userId)
          .maybeSingle();

        if (error) {
          console.error('Error fetching profile:', error.message);
          return null;
        }

        if (data) {
          const profileData = {
            userType: normalizeUserType(data.user_type),
            isVerified: data.is_verified || false,
            fullName: data.full_name,
            phone: data.phone,
          };
          cacheProfile(profileData);
          return profileData;
        }

        return null;
      } catch (error) {
        console.error('Error in fetchUserProfile:', error);
        return null;
      } finally {
        profileFetchInProgressRef.current = false;
      }
    },
    [getCachedProfile, cacheProfile]
  );

  // === MAIN AUTH FUNCTIONS ===

  const refreshUserType = useCallback(async () => {
    if (!user) return;

    try {
      const userProfile = await fetchUserProfile(user.id, true);
      if (isMountedRef.current) {
        const currentProfileStr = JSON.stringify(profileRef.current);
        const newProfileStr = JSON.stringify(userProfile);
        if (currentProfileStr !== newProfileStr) {
          setProfile(userProfile);
          profileRef.current = userProfile;
          if (userProfile) {
            cacheProfile(userProfile);
          }
        }
      }
    } catch (error) {
      console.error('Error refreshing user type:', error);
    }
  }, [user, fetchUserProfile, cacheProfile]);

  const refreshUser = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;

      if (currentUser) {
        if (!userRef.current || userRef.current.id !== currentUser.id) {
          setUser(currentUser as ExtendedUser);
          userRef.current = currentUser as ExtendedUser;
          cacheUser(currentUser as ExtendedUser);

          const userProfile = await fetchUserProfile(currentUser.id, true);
          if (isMountedRef.current) {
            if (JSON.stringify(profileRef.current) !== JSON.stringify(userProfile)) {
              setProfile(userProfile);
              profileRef.current = userProfile;
              if (userProfile) {
                cacheProfile(userProfile);
              }
            }
          }
        }
      } else {
        if (userRef.current !== null) {
          setUser(null);
          userRef.current = null;
          setProfile(null);
          profileRef.current = null;
          cacheUser(null);
          cacheProfile(null);
        }
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  }, [fetchUserProfile, cacheUser, cacheProfile]);

  const redirectToDashboard = useCallback(() => {
    const type = profile?.userType || 'seeker';
    const path = getDefaultRedirect(type);
    router.push(path);
  }, [profile, router]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          toast.error(error.message);
          return { error };
        }

        if (data.user) {
          toast.success('Welcome back!');

          setUser(data.user as ExtendedUser);
          userRef.current = data.user as ExtendedUser;
          cacheUser(data.user as ExtendedUser);

          let userProfile = await fetchUserProfile(data.user.id, true);

          if (!userProfile) {
            const rawType = data.user.user_metadata?.user_type;
            const canonical = normalizeUserType(rawType);
            userProfile = await createUserProfile(
              data.user.id,
              data.user.email!,
              canonical,
              data.user.user_metadata?.full_name,
              data.user.user_metadata?.phone
            );

            if (!userProfile) {
              userProfile = {
                userType: 'seeker',
                isVerified: false,
                fullName: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'User',
                phone: data.user.user_metadata?.phone || null,
              };

              try {
                await supabase
                  .from('profiles')
                  .upsert({
                    id: data.user.id,
                    email: data.user.email!,
                    full_name: userProfile.fullName,
                    phone: userProfile.phone,
                    user_type: 'seeker',
                    is_verified: false,
                    updated_at: new Date().toISOString(),
                  });
              } catch (dbError) {
                console.error('Failed to save default profile:', dbError);
              }
            }
          }

          setProfile(userProfile);
          profileRef.current = userProfile;
          cacheProfile(userProfile);

          const redirectPath = getDefaultRedirect(userProfile.userType);
          router.push(redirectPath);
        }

        return { error: null };
      } catch (error) {
        const authError = error as AuthError;
        toast.error(authError.message || 'Failed to sign in');
        return { error: authError };
      }
    },
    [fetchUserProfile, createUserProfile, cacheUser, cacheProfile, router]
  );

  const signUp = useCallback(
    async (email: string, password: string, userType: UserType, fullName?: string, phone?: string) => {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              user_type: userType, // store canonical value from day one
              full_name: fullName,
              phone: phone,
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) {
          toast.error(error.message);
          return { error };
        }

        if (data.user) {
          const profile = await createUserProfile(data.user.id, email, userType, fullName, phone);

          if (profile) {
            setProfile(profile);
            profileRef.current = profile;
            cacheProfile(profile);
          }

          setUser(data.user as ExtendedUser);
          userRef.current = data.user as ExtendedUser;
          cacheUser(data.user as ExtendedUser);

          if (!data.session) {
            toast.success('Account created! Please check your email to verify your account.');
            router.push('/auth/verify-email');
          } else {
            toast.success('Account created successfully!');
            const redirectPath = getDefaultRedirect(userType);
            router.push(redirectPath);
          }
        }

        return { error: null };
      } catch (error) {
        const authError = error as AuthError;
        toast.error(authError.message || 'Failed to sign up');
        return { error: authError };
      }
    },
    [createUserProfile, cacheUser, cacheProfile, router]
  );

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      userRef.current = null;
      setProfile(null);
      profileRef.current = null;
      cacheUser(null);
      cacheProfile(null);
      localStorage.removeItem(AUTH_CACHE_KEY);
      localStorage.removeItem(PROFILE_CACHE_KEY);
      toast.success('Signed out successfully');
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  }, [router, cacheUser, cacheProfile]);

  // === OPTIMIZED SESSION CHECK - Only on user interaction ===
  const checkSessionOnUserInteraction = useCallback(async () => {
    if (document.visibilityState === 'visible') {
      const now = Date.now();
      if (now - lastUserCheckRef.current < 5 * 60 * 1000) {
        return;
      }
      lastUserCheckRef.current = now;
      await refreshUser();
    }
  }, [refreshUser]);

  // === INITIALIZATION - ONLY RUNS ONCE ===

  useEffect(() => {
    if (initialLoadDoneRef.current) return;
    initialLoadDoneRef.current = true;
    isMountedRef.current = true;

    const initializeAuth = async () => {
      setIsLoading(true);

      try {
        // 1. Try to restore from cache FIRST - instant display
        const cachedUser = getCachedUser();
        const cachedProfile = getCachedProfile();

        if (cachedUser && cachedProfile) {
          setUser(cachedUser);
          userRef.current = cachedUser;
          setProfile({
            userType: cachedProfile.userType,
            isVerified: cachedProfile.isVerified,
            fullName: cachedProfile.fullName,
            phone: cachedProfile.phone,
          });
          profileRef.current = {
            userType: cachedProfile.userType,
            isVerified: cachedProfile.isVerified,
            fullName: cachedProfile.fullName,
            phone: cachedProfile.phone,
          };
          setIsLoading(false);
          setIsInitialized(true);
          isInitializedRef.current = true;
        }

        // 2. Verify session with Supabase (silently in background)
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user ?? null;

        if (currentUser) {
          const needUpdate = !cachedUser || cachedUser.id !== currentUser.id;

          if (needUpdate) {
            setUser(currentUser as ExtendedUser);
            userRef.current = currentUser as ExtendedUser;
            cacheUser(currentUser as ExtendedUser);

            const userProfile = await fetchUserProfile(currentUser.id, true);
            if (isMountedRef.current) {
              if (JSON.stringify(profileRef.current) !== JSON.stringify(userProfile)) {
                setProfile(userProfile);
                profileRef.current = userProfile;
                if (userProfile) {
                  cacheProfile(userProfile);
                }
              }
            }
          }
        } else if (cachedUser) {
          setUser(null);
          userRef.current = null;
          setProfile(null);
          profileRef.current = null;
          cacheUser(null);
          cacheProfile(null);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (!getCachedUser()) {
          setUser(null);
          userRef.current = null;
          setProfile(null);
          profileRef.current = null;
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
          setIsInitialized(true);
          isInitializedRef.current = true;
        }
      }
    };

    initializeAuth();

    document.addEventListener('visibilitychange', checkSessionOnUserInteraction);

    const handleUserActivity = () => {
      checkSessionOnUserInteraction();
    };

    document.addEventListener('click', handleUserActivity);
    document.addEventListener('scroll', handleUserActivity);
    document.addEventListener('keypress', handleUserActivity);

    window.addEventListener('online', checkSessionOnUserInteraction);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          const currentUser = session?.user ?? null;

          if (currentUser) {
            setUser(currentUser as ExtendedUser);
            userRef.current = currentUser as ExtendedUser;
            cacheUser(currentUser as ExtendedUser);

            const userProfile = await fetchUserProfile(currentUser.id, true);
            if (isMountedRef.current) {
              if (JSON.stringify(profileRef.current) !== JSON.stringify(userProfile)) {
                setProfile(userProfile);
                profileRef.current = userProfile;
                if (userProfile) {
                  cacheProfile(userProfile);
                }
              }
            }
          } else {
            setUser(null);
            userRef.current = null;
            setProfile(null);
            profileRef.current = null;
            cacheUser(null);
            cacheProfile(null);
          }
        }
      }
    );

    return () => {
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
      }
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', checkSessionOnUserInteraction);
      document.removeEventListener('click', handleUserActivity);
      document.removeEventListener('scroll', handleUserActivity);
      document.removeEventListener('keypress', handleUserActivity);
      window.removeEventListener('online', checkSessionOnUserInteraction);
      isMountedRef.current = false;
    };
  }, []); // Empty dependency array - ONLY RUNS ONCE

  // Memoize the value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      user,
      userType,
      isVerified,
      isLoading,
      isInitialized,
      profile,
      canPost,
      signIn,
      signUp,
      signOut,
      refreshUser,
      refreshUserType,
      redirectToDashboard,
    }),
    [
      user,
      userType,
      isVerified,
      isLoading,
      isInitialized,
      profile,
      canPost,
      signIn,
      signUp,
      signOut,
      refreshUser,
      refreshUserType,
      redirectToDashboard,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
