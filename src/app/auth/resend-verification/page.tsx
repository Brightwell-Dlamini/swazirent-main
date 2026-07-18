// app/auth/resend-verification/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, CheckCircle, ArrowLeft, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const resendSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export default function ResendVerification() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resendCount, setResendCount] = useState(0);
  const [cooldownTime, setCooldownTime] = useState(0);

  // Pre-fill email from query param if provided
  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  // Cooldown timer to prevent spam
  useEffect(() => {
    if (cooldownTime > 0) {
      const timer = setTimeout(() => {
        setCooldownTime(cooldownTime - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownTime]);

  const validateEmail = (emailToValidate: string): boolean => {
    try {
      resendSchema.parse({ email: emailToValidate });
      setValidationError(null);
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        setValidationError(err.errors[0].message);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email
    if (!validateEmail(email)) {
      return;
    }

    // Check cooldown
    if (cooldownTime > 0) {
      toast.error(`Please wait ${cooldownTime} seconds before requesting again`);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        // Handle specific error cases
        if (error.message.includes('already confirmed')) {
          setError('This email is already verified. Please log in.');
          toast.info('Email already verified');
        } else if (error.message.includes('rate limit')) {
          setError('Too many requests. Please wait a moment before trying again.');
          toast.error('Rate limit exceeded');
        } else {
          setError(error.message);
          toast.error(error.message);
        }
      } else {
        setSuccess(true);
        setResendCount(resendCount + 1);
        setCooldownTime(60); // 60 second cooldown
        toast.success('Verification email sent! Please check your inbox.');
      }
    } catch (error) {
      setError('An unexpected error occurred');
      toast.error('Failed to send verification email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = () => {
    setSuccess(false);
    setError(null);
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="p-0 h-auto"
                onClick={() => router.push('/auth/login')}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            </div>
            <CardTitle className="text-2xl font-bold text-center mt-2">
              Resend Verification Email
            </CardTitle>
            <CardDescription className="text-center">
              {success 
                ? 'Check your email for the verification link' 
                : 'Enter your email to receive a new verification link'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="space-y-6">
                <div className="flex flex-col items-center space-y-4">
                  <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center animate-in fade-in zoom-in duration-500">
                    <Mail className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="font-semibold text-lg">Verification Email Sent!</h3>
                    <p className="text-gray-600">
                      We've sent a new verification link to <strong>{email}</strong>
                    </p>
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                      <Clock className="h-4 w-4" />
                      <span>Link expires in 24 hours</span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    💡 <strong>Tip:</strong> Check your spam folder if you don't see the email in your inbox.
                  </p>
                </div>

                {resendCount > 0 && (
                  <div className="text-center text-sm text-gray-500">
                    <p>Resent {resendCount} time{resendCount > 1 ? 's' : ''}</p>
                    {cooldownTime > 0 && (
                      <p className="text-xs text-gray-400">
                        Please wait {cooldownTime} seconds before requesting again
                      </p>
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleResend}
                    disabled={cooldownTime > 0}
                  >
                    {cooldownTime > 0 ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Wait {cooldownTime}s
                      </>
                    ) : (
                      'Send Again'
                    )}
                  </Button>
                  <Button
                    variant="default"
                    className="w-full"
                    onClick={() => router.push('/auth/login')}
                  >
                    Return to Login
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant={error.includes('already verified') ? 'default' : 'destructive'}>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                {validationError && (
                  <Alert variant="destructive">
                    <AlertDescription>{validationError}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (validationError) validateEmail(e.target.value);
                    }}
                    className={validationError ? 'border-red-500' : ''}
                    required
                    disabled={isLoading}
                  />
                  <p className="text-xs text-gray-500">
                    Enter the email address you used to sign up
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Verification Email
                    </>
                  )}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-sm"
                  onClick={() => router.push('/auth/login')}
                >
                  Already verified? Sign in
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
