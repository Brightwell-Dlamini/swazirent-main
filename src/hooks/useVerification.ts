// src/hooks/useVerification.ts

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { canPostListings } from '@/types/user';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface VerificationDocuments {
  idDocument: File;
  proofOfAddress?: File;
  businessLicense?: File;
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
    if (user && canPostListings(userType) && !authLoading) {
      refreshVerification();
    }
  }, [user, userType, authLoading, refreshVerification]);

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
    submitVerification,
    submitVerificationRequest,
  };
}
