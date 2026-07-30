'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getAuthCallbackUrl } from '@/lib/siteUrl';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { FaGoogle } from 'react-icons/fa';

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

  const handleGoogleLogin = async () => {
    // Always compute at click time from the browser origin — never a baked-in localhost
    const redirectUrl = getAuthCallbackUrl();

    if (!redirectUrl || redirectUrl.includes('localhost')) {
      // If someone is testing on localhost that's fine; on production this must not happen
      if (
        typeof window !== 'undefined' &&
        !window.location.hostname.includes('localhost') &&
        !window.location.hostname.includes('127.0.0.1')
      ) {
        setError(
          'Redirect URL misconfigured. Set NEXT_PUBLIC_SITE_URL to your live domain and check Supabase Auth redirect URLs.'
        );
        return;
      }
    }

    setLoadingProvider('google');
    setError(null);

    try {
      console.log('🔑 Google OAuth redirectTo:', redirectUrl);

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (oauthError) {
        console.error('Supabase OAuth error:', oauthError);

        if (oauthError.message.includes('provider is not enabled')) {
          setError('Google login is not enabled. Please contact support.');
        } else if (oauthError.message.includes('redirect_uri_mismatch')) {
          setError(
            'Redirect URL mismatch. Add this exact URL in Supabase Auth → URL Configuration and Google Cloud Console: ' +
              redirectUrl
          );
        } else {
          setError(oauthError.message);
        }
        onError?.(oauthError.message);
        setLoadingProvider(null);
        return;
      }

      onSuccess?.();
      // Browser navigates to Google; no further UI work
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign in with Google';
      console.error('Google sign-in error:', err);
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
          <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
        </div>
      </div>
    </div>
  );
}
