// src/hooks/usePhoneVerification.ts
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export function usePhoneVerification() {
  const { user } = useAuth();
  const [phoneVerifiedAt, setPhoneVerifiedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setPhoneVerifiedAt(null);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const { data } = await supabase
        .from('profiles')
        .select('phone_verified_at')
        .eq('id', user.id)
        .maybeSingle();
      setPhoneVerifiedAt(data?.phone_verified_at || null);
    } catch {
      setPhoneVerifiedAt(null);
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
    isLoading,
    refresh,
  };
}
