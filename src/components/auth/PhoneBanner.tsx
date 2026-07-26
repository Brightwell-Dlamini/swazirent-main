// src/components/auth/PhoneBanner.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { usePhoneVerification } from '@/hooks/usePhoneVerification';
import { canPostListings } from '@/types/user';
import { Button } from '@/components/ui/button';
import { PhoneVerifyDialog } from '@/components/auth/PhoneVerifyDialog';
import { Smartphone, X } from 'lucide-react';

/** Soft prompt for posters who haven't verified phone yet */
export function PhoneBanner() {
  const { user, userType } = useAuth();
  const { isPhoneVerified, phone, isLoading, refresh } = usePhoneVerification();
  const [dismissed, setDismissed] = useState(false);
  const [open, setOpen] = useState(false);

  if (!user || isLoading || isPhoneVerified || dismissed) return null;
  if (!canPostListings(userType)) return null;

  return (
    <>
      <div className="bg-amber-500/10 border-b border-amber-500/20">
        <div className="container mx-auto px-4 py-2.5 flex items-center gap-3 text-sm">
          <Smartphone className="h-4 w-4 text-amber-700 dark:text-amber-400 shrink-0" />
          <p className="flex-1 text-amber-900 dark:text-amber-100">
            Verify your phone once to publish listings.
          </p>
          <Button size="sm" variant="secondary" className="shrink-0 h-8" onClick={() => setOpen(true)}>
            Verify
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <PhoneVerifyDialog
        open={open}
        onOpenChange={setOpen}
        defaultPhone={phone || ''}
        onVerified={() => refresh()}
      />
    </>
  );
}
