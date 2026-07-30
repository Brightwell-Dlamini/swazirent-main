// src/hooks/usePhoneVerification.ts
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { BETA_SKIP_VERIFICATION } from '@/lib/featureFlags';

/**
 * Account-level phone verification.
 * Verified once on the profile; listings reuse the same number.
 * During beta (BETA_SKIP_VERIFICATION), treated as always verified.
 */
export function usePhoneVerification() {
  const { user } = useAuth();
  const [phoneVerifiedAt, setPhoneVerifiedAt] = useState<string | null>(
    BETA_SKIP_VERIFICATION ? new Date().toISOString() : null
  );
  const [phone, setPhone] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!BETA_SKIP_VERIFICATION);

  const refresh = useCallback(async () => {
    if (!user) {
      setPhoneVerifiedAt(BETA_SKIP_VERIFICATION ? new Date().toISOString() : null);
      setPhone(null);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const { data } = await supabase
        .from('profiles')
        .select('phone, phone_verified_at')
        .eq('id', user.id)
        .maybeSingle();
      setPhone(data?.phone || null);
      if (BETA_SKIP_VERIFICATION) {
        setPhoneVerifiedAt(data?.phone_verified_at || new Date().toISOString());
      } else {
        setPhoneVerifiedAt(data?.phone_verified_at || null);
      }
    } catch {
      setPhone(null);
      setPhoneVerifiedAt(BETA_SKIP_VERIFICATION ? new Date().toISOString() : null);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    isPhoneVerified: BETA_SKIP_VERIFICATION || !!phoneVerifiedAt,
    phoneVerifiedAt,
    /** Profile phone — use as default contact on listings */
    phone,
    isLoading: BETA_SKIP_VERIFICATION ? false : isLoading,
    refresh,
  };
}
