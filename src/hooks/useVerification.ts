// src/hooks/useVerification.ts

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { canPostListings } from '@/types/user';
import { supabase } from '@/lib/supabase';
import { BETA_SKIP_VERIFICATION } from '@/lib/featureFlags';
import { toast } from 'sonner';

interface VerificationDocuments {
  idDocument: File;
  proofOfAddress?: File;
  businessLicense?: File;
}

export function useVerification() {
  const { user, userType, isLoading: authLoading } = useAuth();
  const [isVerified, setIsVerified] = useState(BETA_SKIP_VERIFICATION);
  const [verificationLevel, setVerificationLevel] = useState(
    BETA_SKIP_VERIFICATION ? 'verified' : 'unverified'
  );
  const [isLoading, setIsLoading] = useState(!BETA_SKIP_VERIFICATION);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refreshVerification = useCallback(async () => {
    if (BETA_SKIP_VERIFICATION) {
      setIsVerified(true);
      setVerificationLevel('verified');
      setIsLoading(false);
      return;
    }

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

  const submitVerification = useCallback(
    async (documents?: VerificationDocuments) => {
      if (BETA_SKIP_VERIFICATION) {
        toast.info('Verification is paused during beta — you already have full access.');
        return true;
      }

      if (!user) {
        toast.error('You must be logged in');
        return false;
      }

      if (!canPostListings(userType)) {
        toast.error('Only brokers and agents can request verification');
        return false;
      }

      setIsSubmitting(true);
      try {
        const { data: current, error: checkError } = await supabase
          .from('profiles')
          .select('is_verified, verification_level')
          .eq('id', user.id)
          .maybeSingle();

        if (checkError) throw checkError;

        if (current?.is_verified === true) {
          toast.info('Your account is already verified!');
          return true;
        }

        if (current?.verification_level === 'pending') {
          toast.info('Your verification request is already pending review.');
          return true;
        }

        if (documents) {
          try {
            if (documents.idDocument) {
              const idPath = `verifications/${user.id}/id_${Date.now()}_${documents.idDocument.name}`;
              await supabase.storage.from('verification-documents').upload(idPath, documents.idDocument);
            }
            if (documents.proofOfAddress) {
              const addressPath = `verifications/${user.id}/address_${Date.now()}_${documents.proofOfAddress.name}`;
              await supabase.storage
                .from('verification-documents')
                .upload(addressPath, documents.proofOfAddress);
            }
            if (documents.businessLicense) {
              const licensePath = `verifications/${user.id}/license_${Date.now()}_${documents.businessLicense.name}`;
              await supabase.storage
                .from('verification-documents')
                .upload(licensePath, documents.businessLicense);
            }
          } catch (uploadError) {
            console.error('Document upload error:', uploadError);
            toast.warning('Some documents failed to upload. Please try again later.');
          }
        }

        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            verification_level: 'pending',
            updated_at: new Date().toISOString(),
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
    },
    [user, userType, refreshVerification]
  );

  const submitVerificationRequest = useCallback(async () => {
    return submitVerification();
  }, [submitVerification]);

  useEffect(() => {
    if (BETA_SKIP_VERIFICATION) {
      setIsVerified(true);
      setVerificationLevel('verified');
      setIsLoading(false);
      return;
    }
    if (user && canPostListings(userType) && !authLoading) {
      refreshVerification();
    }
  }, [user, userType, authLoading, refreshVerification]);

  const isLandlordVerified = BETA_SKIP_VERIFICATION || isVerified;
  const isLandlordPending = BETA_SKIP_VERIFICATION ? false : verificationLevel === 'pending';
  const isLandlordRejected = BETA_SKIP_VERIFICATION ? false : verificationLevel === 'rejected';

  let status: 'unverified' | 'pending' | 'verified' | 'rejected' = 'unverified';
  if (BETA_SKIP_VERIFICATION || isVerified) status = 'verified';
  else if (verificationLevel === 'pending') status = 'pending';
  else if (verificationLevel === 'rejected') status = 'rejected';

  return {
    isVerified: BETA_SKIP_VERIFICATION || isVerified,
    verificationLevel: BETA_SKIP_VERIFICATION ? 'verified' : verificationLevel,
    isLandlordVerified,
    isLandlordPending,
    isLandlordRejected,
    status,
    isLoading: BETA_SKIP_VERIFICATION ? false : isLoading,
    isSubmitting,
    refreshVerification,
    submitVerification,
    submitVerificationRequest,
  };
}
