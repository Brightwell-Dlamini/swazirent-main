// src/hooks/useVerification.ts
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export function useVerification() {
  const { user, userType, isVerified, refreshUserType } = useAuth();
  const [isChecking, setIsChecking] = useState(false);
  const [status, setStatus] = useState<VerificationStatus>('unverified');
  const [lastChecked, setLastChecked] = useState<number | null>(null);
  const [verificationDocuments, setVerificationDocuments] = useState<{
    idDocument?: string;
    proofOfAddress?: string;
    businessLicense?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const checkInProgressRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Determine status based on user state
  useEffect(() => {
    if (userType === 'landlord') {
      if (isVerified) {
        setStatus('verified');
      } else {
        // Check if there's a pending verification request
        checkPendingVerification();
      }
    } else {
      setStatus('unverified');
    }
  }, [userType, isVerified]);

  const checkPendingVerification = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('verification_requests')
        .select('status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking verification status:', error);
        return;
      }

      if (data) {
        setStatus(data.status as VerificationStatus);
        setLastChecked(Date.now());
      } else if (!isVerified) {
        setStatus('unverified');
      }
    } catch (error) {
      console.error('Error checking pending verification:', error);
    }
  }, [user, isVerified]);

  // Submit verification documents
  const submitVerification = useCallback(async (documents: {
    idDocument: File;
    proofOfAddress?: File;
    businessLicense?: File;
  }) => {
    if (!user) {
      toast.error('Please sign in to verify your account');
      return false;
    }

    setIsSubmitting(true);

    try {
      // Upload documents to storage
      const uploadPromises: Promise<string>[] = [];
      const docUrls: Record<string, string> = {};

      for (const [key, file] of Object.entries(documents)) {
        if (!file) continue;
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${key}-${Date.now()}.${fileExt}`;
        
        const { data, error } = await supabase.storage
          .from('verification-documents')
          .upload(fileName, file);

        if (error) throw new Error(`Failed to upload ${key}: ${error.message}`);

        const { data: { publicUrl } } = supabase.storage
          .from('verification-documents')
          .getPublicUrl(fileName);

        docUrls[key] = publicUrl;
      }

      // Create verification request
      const { error: requestError } = await supabase
        .from('verification_requests')
        .insert({
          user_id: user.id,
          status: 'pending',
          documents: docUrls,
          submitted_at: new Date().toISOString(),
        });

      if (requestError) throw new Error(`Failed to submit verification: ${requestError.message}`);

      setStatus('pending');
      toast.success('Verification documents submitted! We\'ll review them shortly.');
      return true;

    } catch (error) {
      console.error('Verification submission error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit verification');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [user]);

  // Check verification status manually
  const checkVerification = useCallback(async () => {
    if (checkInProgressRef.current) return;
    if (!user || userType !== 'landlord') return;

    checkInProgressRef.current = true;
    setIsChecking(true);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_verified')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching verification status:', error);
        return;
      }

      if (mountedRef.current && data?.is_verified !== undefined) {
        if (data.is_verified !== isVerified) {
          await refreshUserType();
          setStatus(data.is_verified ? 'verified' : 'pending');
          if (data.is_verified) {
            toast.success('🎉 Your account has been verified! You can now list properties.');
          }
        }
        setLastChecked(Date.now());
        localStorage.setItem('verification_last_check', Date.now().toString());
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

  const getVerificationSteps = useCallback(() => {
    return [
      {
        id: '1',
        label: 'Submit ID Document',
        description: 'Upload a government-issued ID (passport, driver\'s license)',
        completed: status === 'pending' || status === 'verified',
        required: true,
      },
      {
        id: '2',
        label: 'Proof of Address',
        description: 'Utility bill or bank statement from the last 3 months',
        completed: status === 'pending' || status === 'verified',
        required: false,
      },
      {
        id: '3',
        label: 'Business License (Optional)',
        description: 'If you\'re a property management company',
        completed: status === 'pending' || status === 'verified',
        required: false,
      },
    ];
  }, [status]);

  return {
    status,
    isChecking,
    isSubmitting,
    lastChecked,
    isLandlordVerified: status === 'verified',
    isLandlordPending: status === 'pending',
    isLandlordRejected: status === 'rejected',
    verificationSteps: getVerificationSteps(),
    checkVerification,
    submitVerification,
    refreshVerification: checkVerification,
  };
}
