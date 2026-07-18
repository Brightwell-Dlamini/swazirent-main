// src/components/auth/SocialLoginButtons.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { FaGoogle } from 'react-icons/fa';
import { useSearchParams } from 'next/navigation';

interface SocialLoginButtonsProps {
  isLoading?: boolean;
  onError?: (error: string) => void;
  onSuccess?: () => void;
}

export default function SocialLoginButtons({
  isLoading = false,
  onError,
  onSuccess,
}: SocialLoginButtonsProps) {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  const handleGoogleLogin = async () => {
    setLoadingProvider('google');
    setError(null);

    try {
      const redirectUrl = `${window.location.origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        if (error.message.includes('provider is not enabled')) {
          setError('Google login is not enabled. Please contact support.');
        } else if (error.message.includes('invalid client')) {
          setError('Google configuration is invalid. Please try again later.');
        } else {
          setError(error.message);
        }
        onError?.(error.message);
        setLoadingProvider(null);
        return;
      }

      onSuccess?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sign in with Google';
      setError(message);
      onError?.(message);
      setLoadingProvider(null);
    }
  };

  const isGoogleLoading = loadingProvider === 'google' || isLoading;

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive" className="animate-in slide-in-from-top-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button
        type="button"
        variant="outline"
        className="w-full relative h-11"
        onClick={handleGoogleLogin}
        disabled={isGoogleLoading}
      >
        {isGoogleLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FaGoogle className="mr-2 h-4 w-4" />
        )}
        Continue with Google
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with email
          </span>
        </div>
      </div>
    </div>
  );
}
