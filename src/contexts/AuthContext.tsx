// src/contexts/AuthContext.tsx
'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { User, AuthError } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export type UserType = 'renter' | 'landlord' | 'admin';

export const isValidUserType = (type: string | null | undefined): type is UserType => {
  return type === 'renter' || type === 'landlord' || type === 'admin';
};

export const getDefaultRedirect = (userType: UserType | null): string => {
  switch (userType) {
    case 'admin':
      return '/dashboard/admin';
    case 'landlord':
      return '/dashboard/landlord';
    case 'renter':
      return '/dashboard/renter';
    default:
      return '/dashboard/renter'; // Safe default
  }
};

interface UserProfile {
  userType: UserType;
  isVerified: boolean;
  fullName?: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  userType: UserType | null;
  isVerified: boolean;
  isLoading: boolean;
  profile: UserProfile | null;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const initializingRef = useRef(false);
  const profileFetchInProgressRef = useRef<Map<string, Promise<UserProfile | null>>>(new Map());

  const userType = profile?.userType || null;
  const isVerified = profile?.isVerified || false;

  /**
   * Create or update a user profile with UPSERT to handle race conditions
   */
  const createUserProfile = useCallback(
    async (
      userId: string,
      email: string,
      userType: UserType = 'renter',
      fullName?: string,
      phone?: string
    ): Promise<UserProfile | null> => {
      try {
        // Use UPSERT with ON CONFLICT to handle race conditions
        const { data, error } = await supabase
          .from('profiles')
          .upsert(
            {
              id: userId,
              email,
              full_name: fullName || null,
              phone: phone || null,
              user_type: userType,
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
            userType: data.user_type,
            isVerified: data.is_verified || false,
            fullName: data.full_name,
            phone: data.phone,
          };
        }

        // Fallback: If upsert didn't return data, try fetching
        const { data: fetchData, error: fetchError } = await supabase
          .from('profiles')
          .select('user_type, is_verified, full_name, phone')
          .eq('id', userId)
          .maybeSingle();

        if (fetchError) {
          console.error('Error fetching profile after upsert:', fetchError.message);
          return null;
        }

        return fetchData
          ? {
              userType: fetchData.user_type,
              isVerified: fetchData.is_verified || false,
              fullName: fetchData.full_name,
              phone: fetchData.phone,
            }
          : null;
      } catch (error) {
        console.error('Error in createUserProfile:', error);
        return null;
      }
    },
    []
  );

  /**
   * Fetch user profile with deduplication to prevent race conditions
   */
  const fetchUserProfile = useCallback(
    async (userId: string): Promise<UserProfile | null> => {
      if (!userId) return null;

      // Check if there's already a fetch in progress for this userId
      const existingPromise = profileFetchInProgressRef.current.get(userId);
      if (existingPromise) {
        return existingPromise;
      }

      const promise = (async () => {
        try {
          // Get the authenticated user to verify identity
          const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

          if (authError || !authUser) {
            console.error('Error getting auth user:', authError?.message);
            return null;
          }

          // Ensure the userId matches the authenticated user
          if (authUser.id !== userId) {
            console.error('User ID mismatch:', userId, 'vs', authUser.id);
            return null;
          }

          // Fetch profile from database
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
            return {
              userType: data.user_type,
              isVerified: data.is_verified || false,
              fullName: data.full_name,
              phone: data.phone,
            };
          }

          // Profile doesn't exist - create one with data from auth user
          const userType = authUser.user_metadata?.user_type || 'renter';
          const fullName = authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || '';
          const phone = authUser.user_metadata?.phone || null;

          return await createUserProfile(userId, authUser.email!, userType, fullName, phone);
        } catch (error) {
          console.error('Error in fetchUserProfile:', error);
          return null;
        } finally {
          // Clean up the promise from the map
          profileFetchInProgressRef.current.delete(userId);
        }
      })();

      // Store the promise in the map
      profileFetchInProgressRef.current.set(userId, promise);
      return promise;
    },
    [createUserProfile]
  );

  /**
   * Refresh the current user's session and profile
   */
  const refreshUser = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        setIsLoading(true);
        const userProfile = await fetchUserProfile(currentUser.id);
        setProfile(userProfile);
        setIsLoading(false);
      } else {
        setProfile(null);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
      setIsLoading(false);
    }
  }, [fetchUserProfile]);

  /**
   * Refresh only the user type/profile data
   */
  const refreshUserType = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const userProfile = await fetchUserProfile(user.id);
      setProfile(userProfile);
      setIsLoading(false);
    } catch (error) {
      console.error('Error refreshing user type:', error);
      setIsLoading(false);
    }
  }, [user, fetchUserProfile]);

  /**
   * Redirect to the appropriate dashboard based on user type
   */
  const redirectToDashboard = useCallback(() => {
    const type = profile?.userType || 'renter';
    const path = getDefaultRedirect(type);
    
    console.log(`Redirecting to: ${path} (userType: ${type})`);
    router.push(path);
    router.refresh();
  }, [profile, router]);

  /**
   * Sign in with email and password
   */
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

          // Fetch profile with retry logic for race conditions
          let userProfile = await fetchUserProfile(data.user.id);

          // If profile is null, try to create it with retry
          if (!userProfile) {
            console.warn('Profile not found, attempting to create...');
            userProfile = await createUserProfile(
              data.user.id,
              data.user.email!,
              data.user.user_metadata?.user_type || 'renter',
              data.user.user_metadata?.full_name,
              data.user.user_metadata?.phone
            );

            // If still null after creation, try one more fetch
            if (!userProfile) {
              userProfile = await fetchUserProfile(data.user.id);
            }
          }

          // If we still don't have a profile, create a default one
          if (!userProfile) {
            console.error('Failed to fetch or create profile, using default');
            userProfile = {
              userType: 'renter',
              isVerified: false,
              fullName: data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'User',
              phone: data.user.user_metadata?.phone || null,
            };
            
            // Attempt to save the default profile to the database
            try {
              await supabase
                .from('profiles')
                .upsert({
                  id: data.user.id,
                  email: data.user.email!,
                  full_name: userProfile.fullName,
                  phone: userProfile.phone,
                  user_type: 'renter',
                  is_verified: false,
                  updated_at: new Date().toISOString(),
                });
            } catch (dbError) {
              console.error('Failed to save default profile:', dbError);
            }
          }

          setProfile(userProfile);

          // Ensure we have a valid userType before redirecting
          const userType = userProfile.userType || 'renter';
          
          // Determine redirect path based on user type with fallback
          const redirectPath = getDefaultRedirect(userType);
          
          // If userType was invalid, update the profile
          if (!isValidUserType(userType)) {
            console.warn(`Invalid user type: ${userType}, defaulting to renter`);
            // Update the profile with default type
            await supabase
              .from('profiles')
              .update({ user_type: 'renter' })
              .eq('id', data.user.id);
          }

          router.push(redirectPath);
          router.refresh();
        }

        return { error: null };
      } catch (error) {
        const authError = error as AuthError;
        toast.error(authError.message || 'Failed to sign in');
        return { error: authError };
      }
    },
    [fetchUserProfile, createUserProfile, router]
  );

  /**
   * Sign up with email and password
   */
  const signUp = useCallback(
    async (email: string, password: string, userType: UserType, fullName?: string, phone?: string) => {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              user_type: userType,
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
          // Create profile immediately after signup
          const profile = await createUserProfile(data.user.id, email, userType, fullName, phone);

          if (profile) {
            setProfile(profile);
          }

          // Check if email confirmation is required
          if (!data.session) {
            toast.success('Account created! Please check your email to verify your account.');
            router.push('/auth/verify-email');
          } else {
            toast.success('Account created successfully!');

            // Determine redirect path based on user type
            const redirectPath = getDefaultRedirect(userType);
            router.push(redirectPath);
          }
          router.refresh();
        }

        return { error: null };
      } catch (error) {
        const authError = error as AuthError;
        toast.error(authError.message || 'Failed to sign up');
        return { error: authError };
      }
    },
    [createUserProfile, router]
  );

  /**
   * Sign out the current user
   */
  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      toast.success('Signed out successfully');
      router.push('/');
      router.refresh();
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  }, [router]);

  /**
   * Initialize auth state - only runs once
   */
  useEffect(() => {
    if (initializingRef.current) return;
    initializingRef.current = true;

    const initializeAuth = async () => {
      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          const userProfile = await fetchUserProfile(currentUser.id);
          setProfile(userProfile);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          setIsLoading(true);
          const userProfile = await fetchUserProfile(currentUser.id);
          setProfile(userProfile);
          setIsLoading(false);
        } else {
          setProfile(null);
          setIsLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
      initializingRef.current = false;
    };
  }, [fetchUserProfile]);

  const value = {
    user,
    userType,
    isVerified,
    isLoading,
    profile,
    signIn,
    signUp,
    signOut,
    refreshUser,
    refreshUserType,
    redirectToDashboard,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
