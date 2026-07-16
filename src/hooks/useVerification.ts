// src/hooks/useVerification.ts
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export function useVerification() {
  const { user, userType, isVerified, refreshUserType } = useAuth();
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<number | null>(null);
  const checkInProgressRef = useRef(false);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Check if user is a landlord and verified
  const isLandlordVerified = userType === 'landlord' && isVerified;
  const isLandlordPending = userType === 'landlord' && !isVerified;

  // Function to manually check verification status
  const checkVerification = useCallback(async () => {
    // Prevent concurrent checks
    if (checkInProgressRef.current) {
      console.log('Verification check already in progress, skipping...');
      return;
    }

    // Only landlords need verification checks
    if (!user || userType !== 'landlord') {
      return;
    }

    checkInProgressRef.current = true;
    setIsChecking(true);

    try {
      console.log('Checking verification status for user:', user.id);

      const { data, error } = await supabase
        .from('profiles')
        .select('is_verified')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching verification status:', error);
        return;
      }

      // Only refresh if status changed and component is still mounted
      if (mountedRef.current && data?.is_verified !== undefined && data.is_verified !== isVerified) {
        console.log('Verification status changed:', isVerified, '->', data.is_verified);
        await refreshUserType();
      }

      // Update last checked timestamp only on successful check
      if (mountedRef.current) {
        const now = Date.now();
        setLastChecked(now);
        localStorage.setItem('verification_last_check', now.toString());
      }

    } catch (error) {
      console.error('Error checking verification:', error);
    } finally {
      if (mountedRef.current) {
        setIsChecking(false);
      }
      checkInProgressRef.current = false;
    }
  }, [user, userType, isVerified, refreshUserType]);

  // Force a fresh check (useful after verification approval or manual refresh)
  const refreshVerification = useCallback(async () => {
    // Clear the last checked timestamp to force a fresh check
    localStorage.removeItem('verification_last_check');
    setLastChecked(null);
    await checkVerification();
  }, [checkVerification]);

  // Auto-check on login or when user changes
  useEffect(() => {
    // Reset check state when user or userType changes
    if (user && userType === 'landlord') {
      const lastCheck = localStorage.getItem('verification_last_check');
      const now = Date.now();
      const fiveMinutesAgo = now - 5 * 60 * 1000;

      // Check every 5 minutes at most, or if never checked
      const shouldCheck = !lastCheck || parseInt(lastCheck) < fiveMinutesAgo;

      if (shouldCheck) {
        console.log('Auto-checking verification status...');
        checkVerification();
      } else {
        // Update state with stored timestamp
        setLastChecked(parseInt(lastCheck));
      }
    } else {
      // Reset last checked if user is not a landlord
      setLastChecked(null);
    }

    // Cleanup function to prevent memory leaks
    return () => {
      // Cancel any ongoing checks if needed
    };
  }, [user, userType, checkVerification]);

  // Optional: Set up a periodic check when the user is a landlord
  useEffect(() => {
    if (!user || userType !== 'landlord') {
      return;
    }

    // Set up an interval to check every 5 minutes when the tab is active
    const intervalId = setInterval(() => {
      // Only check if tab is visible to save resources
      if (document.visibilityState === 'visible') {
        const lastCheck = localStorage.getItem('verification_last_check');
        const now = Date.now();
        const fiveMinutesAgo = now - 5 * 60 * 1000;

        if (!lastCheck || parseInt(lastCheck) < fiveMinutesAgo) {
          console.log('Periodic verification check...');
          checkVerification();
        }
      }
    }, 60 * 1000); // Check every minute to see if 5 minutes have passed

    // Also listen for visibility changes to check when user returns to tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const lastCheck = localStorage.getItem('verification_last_check');
        const now = Date.now();
        const fiveMinutesAgo = now - 5 * 60 * 1000;

        if (!lastCheck || parseInt(lastCheck) < fiveMinutesAgo) {
          console.log('Visibility change triggered verification check...');
          checkVerification();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, userType, checkVerification]);

  // Manual refresh function that can be called from components
  const forceRefresh = useCallback(async () => {
    // Clear localStorage and force a check
    localStorage.removeItem('verification_last_check');
    setLastChecked(null);
    await checkVerification();
  }, [checkVerification]);

  return {
    isLandlordVerified,
    isLandlordPending,
    isChecking,
    lastChecked,
    checkVerification,
    refreshVerification,
    forceRefresh,
  };
}
