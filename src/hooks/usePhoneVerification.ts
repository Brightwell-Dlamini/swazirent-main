// src/hooks/usePhoneVerification.ts
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

/**
 * Account-level phone verification.
 * Verified once on the profile; listings reuse the same number.
 */
export function usePhoneVerification() {
  const { user } = useAuth();
  const [phoneVerifiedAt, setPhoneVerifiedAt] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setPhoneVerifiedAt(null);
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
      setPhoneVerifiedAt(data?.phone_verified_at || null);
      setPhone(data?.phone || null);
    } catch {
      setPhoneVerifiedAt(null);
      setPhone(null);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    isPhoneVerified: !!phoneVerifiedAt,
    phoneVerifiedAt,
    /** Profile phone — use as default contact on listings */
    phone,
    isLoading,
    refresh,
  };
}
