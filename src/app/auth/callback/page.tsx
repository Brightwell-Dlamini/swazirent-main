// app/auth/callback/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('Verifying your email...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session from the URL hash fragment
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          setStatus('error');
          setMessage(error.message || 'Failed to verify email. Please try again.');
          return;
        }

        if (data.session) {
          // User is now authenticated
          setStatus('success');
          setMessage('Email verified successfully! Redirecting...');
          
          // Redirect after a short delay
          setTimeout(() => {
            // Check user type and redirect accordingly
            const userType = data.session.user?.user_metadata?.user_type;
            if (userType === 'landlord') {
              router.push('/dashboard/landlord/pending-verification');
            } else {
              router.push('/dashboard/renter');
            }
          }, 2000);
        } else {
          // No session - maybe the user hasn't confirmed their email yet
          setStatus('error');
          setMessage('Unable to verify your email. Please check your email for the confirmation link.');
        }
      } catch (error) {
        console.error('Callback error:', error);
        setStatus('error');
        setMessage('An unexpected error occurred. Please try again.');
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              Email Verification
            </CardTitle>
            <CardDescription className="text-center">
              {status === 'loading' ? 'Please wait...' : 'Verification Status'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              {status === 'loading' && (
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
              )}
              {status === 'success' && (
                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
              )}
              {status === 'error' && (
                <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                  <XCircle className="h-10 w-10 text-red-600" />
                </div>
              )}
            </div>

            <div className="text-center">
              <p className="text-gray-700">{message}</p>
            </div>

            {status === 'success' && (
              <div className="text-sm text-gray-500 text-center">
                You will be redirected shortly...
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertDescription>
                    {message}
                  </AlertDescription>
                </Alert>
                <div className="flex flex-col gap-3">
                  <Button
                    onClick={() => router.push('/auth/login')}
                    variant="default"
                    className="w-full"
                  >
                    Go to Login
                  </Button>
                  <Button
                    onClick={() => router.push('/auth/resend-verification')}
                    variant="outline"
                    className="w-full"
                  >
                    Resend Verification Email
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
