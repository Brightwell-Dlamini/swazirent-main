// src/hooks/useVerification.ts

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface VerificationState {
  isVerified: boolean;
  verificationLevel: string;
  isLandlordVerified: boolean;
  isLandlordPending: boolean;
  isLandlordRejected: boolean;
  status: 'unverified' | 'pending' | 'verified' | 'rejected';
}

export function useVerification() {
  const { user, userType, isLoading: authLoading } = useAuth();
  const [isVerified, setIsVerified] = useState(false);
  const [verificationLevel, setVerificationLevel] = useState('unverified');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refreshVerification = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('is_verified, verification_level')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching verification:', error);
        // Fallback to defaults
        setIsVerified(false);
        setVerificationLevel('unverified');
        return;
      }

      setIsVerified(data?.is_verified || false);
      setVerificationLevel(data?.verification_level || 'unverified');
    } catch (error) {
      console.error('Error fetching verification status:', error);
      setIsVerified(false);
      setVerificationLevel('unverified');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Submit verification request
  const submitVerificationRequest = useCallback(async () => {
    if (!user) {
      toast.error('You must be logged in');
      return false;
    }

    if (userType !== 'landlord') {
      toast.error('Only landlords can request verification');
      return false;
    }

    setIsSubmitting(true);
    try {
      // Check current status
      const { data: current, error: checkError } = await supabase
        .from('profiles')
        .select('is_verified, verification_level')
        .eq('id', user.id)
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      // If already verified
      if (current?.is_verified === true) {
        toast.info('Your account is already verified!');
        return true;
      }

      // If already pending
      if (current?.verification_level === 'pending') {
        toast.info('Your verification request is already pending review.');
        return true;
      }

      // Update to pending
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          verification_level: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await refreshVerification();
      toast.success('Verification request submitted! An admin will review your account.');
      return true;
    } catch (error) {
      console.error('Error submitting verification:', error);
      toast.error('Failed to submit verification request. Please try again.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [user, userType, refreshVerification]);

  // Refresh on mount if user is landlord
  useEffect(() => {
    if (user && userType === 'landlord' && !authLoading) {
      refreshVerification();
    }
  }, [user, userType, authLoading, refreshVerification]);

  // Compute derived states
  const isLandlordVerified = isVerified;
  const isLandlordPending = verificationLevel === 'pending';
  const isLandlordRejected = verificationLevel === 'rejected';
  
  let status: 'unverified' | 'pending' | 'verified' | 'rejected' = 'unverified';
  if (isVerified) status = 'verified';
  else if (verificationLevel === 'pending') status = 'pending';
  else if (verificationLevel === 'rejected') status = 'rejected';

  return {
    isVerified,
    verificationLevel,
    isLandlordVerified,
    isLandlordPending,
    isLandlordRejected,
    status,
    isLoading,
    isSubmitting,
    refreshVerification,
    submitVerification: submitVerificationRequest,
    submitVerificationRequest,
  };
}
