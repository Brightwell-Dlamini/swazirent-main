// src/app/auth/callback/page.tsx
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2, CheckCircle, XCircle, Mail, User, Building } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { getDefaultRedirect, normalizeUserType } from '@/types/user';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('Processing...');
  const [userTypeLabel, setUserTypeLabel] = useState<string | null>(null);
  const [showResendButton, setShowResendButton] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const handleCallback = async () => {
      try {
        // PKCE / OAuth: code in query string
        const code = searchParams.get('code');
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error('exchangeCodeForSession:', exchangeError);
            if (!cancelled) {
              setStatus('error');
              setMessage(exchangeError.message || 'Failed to complete sign-in.');
              setShowResendButton(false);
            }
            return;
          }
        }

        // Also surface provider errors from the URL
        const errorCode = searchParams.get('error_code') || searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        if (errorCode && !code) {
          if (!cancelled) {
            setStatus('error');
            setMessage(errorDescription || 'Authentication failed. Please try again.');
          }
          return;
        }

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('Session error:', sessionError);
          if (!cancelled) {
            setStatus('error');
            setMessage(sessionError.message || 'Failed to authenticate. Please try again.');
            setShowResendButton(true);
          }
          return;
        }

        if (session?.user) {
          const user = session.user;

          const { data: profile } = await supabase
            .from('profiles')
            .select('user_type, is_verified, full_name')
            .eq('id', user.id)
            .maybeSingle();

          let role = normalizeUserType(
            profile?.user_type || user.user_metadata?.user_type || 'seeker'
          );

          if (!profile) {
            const fullName =
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              user.email?.split('@')[0] ||
              'User';

            const { error: createError } = await supabase.from('profiles').upsert(
              {
                id: user.id,
                email: user.email,
                full_name: fullName,
                user_type: role,
                is_verified: false,
                phone: user.user_metadata?.phone || null,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'id' }
            );

            if (createError) console.error('Failed to create profile:', createError);
          }

          if (!cancelled) {
            setUserTypeLabel(role);
            setStatus('success');
            setMessage('Signed in successfully. Redirecting…');
          }

          await refreshUser();

          // Google users are typically email-confirmed by the provider
          setTimeout(() => {
            if (!cancelled) router.replace(getDefaultRedirect(role));
          }, 1200);
          return;
        }

        // Password recovery
        const type = searchParams.get('type');
        if (type === 'recovery') {
          if (!cancelled) {
            setStatus('success');
            setMessage('Password reset link verified. Redirecting…');
          }
          setTimeout(() => {
            if (!cancelled) router.replace('/auth/update-password');
          }, 1200);
          return;
        }

        if (!cancelled) {
          setStatus('error');
          setMessage(
            'No session found. If you signed in with Google, check Supabase Site URL and Redirect URLs are set to your live domain — not localhost.'
          );
          setShowResendButton(true);
        }
      } catch (err) {
        console.error('Callback error:', err);
        if (!cancelled) {
          setStatus('error');
          setMessage('An unexpected error occurred. Please try again.');
          setShowResendButton(true);
        }
      }
    };

    handleCallback();
    return () => {
      cancelled = true;
    };
  }, [router, searchParams, refreshUser]);

  const handleResendVerification = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user?.email) {
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: session.user.email,
        });
        if (error) {
          alert('Failed to resend verification email. Please try again.');
          return;
        }
        alert('Verification email resent! Please check your inbox.');
      }
    } catch {
      alert('Failed to resend verification email. Please try again.');
    }
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              {status === 'loading'
                ? 'Signing you in'
                : status === 'success'
                  ? 'Success!'
                  : 'Sign-in failed'}
            </CardTitle>
            <CardDescription className="text-center">
              {status === 'loading'
                ? 'Please wait…'
                : status === 'success'
                  ? 'You are signed in'
                  : 'We could not complete sign-in'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              {status === 'loading' && <Loader2 className="h-16 w-16 animate-spin text-primary" />}
              {status === 'success' && (
                <div className="h-20 w-20 rounded-full bg-emerald-500/15 flex items-center justify-center">
                  <CheckCircle className="h-12 w-12 text-emerald-600" />
                </div>
              )}
              {status === 'error' && (
                <div className="h-20 w-20 rounded-full bg-red-500/15 flex items-center justify-center">
                  <XCircle className="h-12 w-12 text-red-600" />
                </div>
              )}
            </div>

            <div className="text-center">
              <p className="text-foreground text-base font-medium">{message}</p>
              {userTypeLabel && status === 'success' && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  {userTypeLabel === 'landlord' ||
                  userTypeLabel === 'broker' ||
                  userTypeLabel === 'agent' ? (
                    <Building className="h-4 w-4" />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                  <span className="capitalize">{userTypeLabel}</span>
                </div>
              )}
            </div>

            {status === 'success' && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Redirecting to your dashboard…</span>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-4">
                {showResendButton && (
                  <Alert>
                    <AlertDescription>
                      If this was email signup, check spam or resend the verification link.
                    </AlertDescription>
                  </Alert>
                )}
                <div className="flex flex-col gap-3">
                  {showResendButton && (
                    <Button onClick={handleResendVerification} variant="outline" className="w-full">
                      <Mail className="mr-2 h-4 w-4" />
                      Resend verification email
                    </Button>
                  )}
                  <Button onClick={() => router.push('/auth/login')} className="w-full">
                    Go to Login
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-16 flex justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
