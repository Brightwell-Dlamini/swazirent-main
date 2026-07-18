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

// Component that uses useSearchParams
function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('Processing...');
  const [userType, setUserType] = useState<'renter' | 'landlord' | null>(null);
  const [showResendButton, setShowResendButton] = useState(false);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setStatus('error');
          setMessage(sessionError.message || 'Failed to authenticate. Please try again.');
          setShowResendButton(true);
          return;
        }

        // Check if we have a session
        if (session) {
          // User is authenticated
          const user = session.user;
          
          // Check if user has a profile
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('user_type, is_verified, full_name')
            .eq('id', user.id)
            .maybeSingle();

          let userTypeValue = user.user_metadata?.user_type || 'renter';

          // If no profile exists, create one
          if (!profile && !profileError) {
            const fullName = user.user_metadata?.full_name || 
                            user.user_metadata?.name || 
                            user.email?.split('@')[0] || 
                            'User';

            const { error: createError } = await supabase
              .from('profiles')
              .insert({
                id: user.id,
                email: user.email,
                full_name: fullName,
                user_type: userTypeValue,
                is_verified: user.email_confirmed_at ? true : false,
                phone: user.user_metadata?.phone || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });

            if (createError) {
              console.error('Failed to create profile:', createError);
            }
          } else if (profile) {
            userTypeValue = profile.user_type || userTypeValue;
          }

          setUserType(userTypeValue);

          // Check if email is verified
          if (user.email_confirmed_at) {
            // Email is verified
            setStatus('success');
            
            // Check if this is a social login or email verification
            const isSocialLogin = searchParams.get('provider') !== null;
            
            if (isSocialLogin) {
              setMessage(`Successfully signed in with ${searchParams.get('provider')}! Redirecting...`);
            } else {
              setMessage('Email verified successfully! Redirecting...');
            }
            
            // Refresh user data in context
            await refreshUser();
            
            // Redirect based on user type after a delay
            setTimeout(() => {
              if (userTypeValue === 'landlord') {
                router.push('/dashboard/landlord');
              } else if (userTypeValue === 'admin') {
                router.push('/dashboard/admin');
              } else {
                router.push('/dashboard/renter');
              }
            }, 2000);
          } else {
            // Email not verified
            setStatus('error');
            setMessage('Please verify your email address before continuing. Check your inbox for the verification link.');
            setShowResendButton(true);
          }
        } else {
          // Check if this is a password reset callback
          const type = searchParams.get('type');
          
          if (type === 'recovery') {
            // This is a password reset flow
            setStatus('success');
            setMessage('Password reset link verified! Redirecting to update password...');
            setTimeout(() => {
              router.push('/auth/update-password');
            }, 1500);
            return;
          }

          // Check for error in URL
          const errorCode = searchParams.get('error_code');
          const errorDescription = searchParams.get('error_description');
          
          if (errorCode) {
            setStatus('error');
            setMessage(errorDescription || 'Authentication failed. Please try again.');
            setShowResendButton(true);
            return;
          }

          // No session - user hasn't confirmed email yet
          setStatus('error');
          setMessage('Unable to verify your email. Please check your email for the confirmation link.');
          setShowResendButton(true);
        }
      } catch (error) {
        console.error('Callback error:', error);
        setStatus('error');
        setMessage('An unexpected error occurred. Please try again.');
        setShowResendButton(true);
      }
    };

    handleCallback();
  }, [router, searchParams, refreshUser]);

  const handleResendVerification = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: session.user.email!,
        });
        
        if (error) {
          console.error('Resend error:', error);
          alert('Failed to resend verification email. Please try again.');
          return;
        }
        
        alert('Verification email resent! Please check your inbox.');
      }
    } catch (error) {
      console.error('Resend error:', error);
      alert('Failed to resend verification email. Please try again.');
    }
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              {status === 'loading' ? 'Processing' : 
               status === 'success' ? 'Success!' : 'Verification Failed'}
            </CardTitle>
            <CardDescription className="text-center">
              {status === 'loading' ? 'Please wait while we verify your account...' : 
               status === 'success' ? 'Your account has been verified' : 'We encountered an issue'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Icon */}
            <div className="flex justify-center">
              {status === 'loading' && (
                <div className="relative">
                  <Loader2 className="h-16 w-16 animate-spin text-primary" />
                  <Mail className="h-6 w-6 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-primary/70" />
                </div>
              )}
              {status === 'success' && (
                <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center animate-in fade-in zoom-in duration-500">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
              )}
              {status === 'error' && (
                <div className="h-20 w-20 rounded-full bg-red-100 flex items-center justify-center animate-in fade-in zoom-in duration-500">
                  <XCircle className="h-12 w-12 text-red-600" />
                </div>
              )}
            </div>

            {/* Message */}
            <div className="text-center">
              <p className="text-gray-700 text-lg font-medium">{message}</p>
              {userType && status === 'success' && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
                  {userType === 'landlord' ? (
                    <Building className="h-4 w-4" />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                  <span>Account type: {userType.charAt(0).toUpperCase() + userType.slice(1)}</span>
                </div>
              )}
            </div>

            {/* Loading indicator for redirect */}
            {status === 'success' && (
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Redirecting to your dashboard...</span>
                </div>
              </div>
            )}

            {/* Error actions */}
            {status === 'error' && (
              <div className="space-y-4">
                {showResendButton && (
                  <Alert>
                    <AlertDescription>
                      Didn't receive the email? Check your spam folder or request a new one.
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="flex flex-col gap-3">
                  {showResendButton && (
                    <Button
                      onClick={handleResendVerification}
                      variant="outline"
                      className="w-full"
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      Resend Verification Email
                    </Button>
                  )}
                  <Button
                    onClick={() => router.push('/auth/login')}
                    variant={showResendButton ? 'default' : 'default'}
                    className="w-full"
                  >
                    Go to Login
                  </Button>
                  {!showResendButton && (
                    <Button
                      onClick={() => router.push('/')}
                      variant="outline"
                      className="w-full"
                    >
                      Return Home
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                <p className="text-gray-600">Loading...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
