// src/app/auth/upgrade/UpgradeForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { canPostListings } from '@/types/user';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Building2, CheckCircle2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function UpgradeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, userType, refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Pre-fill email from query params
  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    } else if (user?.email) {
      setEmail(user.email);
    }
  }, [searchParams, user]);

  // Already a poster (broker / agent / admin) → dashboard
  useEffect(() => {
    if (canPostListings(userType)) {
      router.push('/dashboard/landlord');
      toast.info('You can already post listings!');
    }
  }, [userType, router]);

  const handleUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (user) {
      try {
        await supabase.auth.signOut();

        // New account as broker (default poster role from DOC mapping)
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              user_type: 'broker',
              full_name: user.user_metadata?.full_name || '',
              phone: user.user_metadata?.phone || '',
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (signUpError) {
          setError(signUpError.message);
          setIsLoading(false);
          return;
        }

        setSuccess(true);
        toast.success('Broker account created! Please check your email to verify.');
        await refreshUser();

        setTimeout(() => {
          router.push('/auth/verify-email');
        }, 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to upgrade account');
        setIsLoading(false);
      }
    } else {
      router.push(`/auth/signup?type=broker&email=${encodeURIComponent(email)}`);
    }
  };

  if (success) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold">Upgrade Request Submitted!</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Please check your email to verify your broker account.
                </p>
                <Button onClick={() => router.push('/auth/login')} className="mt-4">
                  Go to Login
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (canPostListings(userType)) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Building2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              <CardTitle>List properties on Ekhaya</CardTitle>
            </div>
            <CardDescription>
              Upgrade to a Broker account to post listings
            </CardDescription>
          </CardHeader>
          <CardContent>
            {user ? (
              <>
                <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <strong>Note:</strong> You're currently signed in as a seeker.
                    To post listings, create a separate broker account with a new password.
                    Your seeker account will remain active.
                  </p>
                </div>

                <form onSubmit={handleUpgrade} className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled
                      className="bg-gray-100 dark:bg-gray-800"
                    />
                    <p className="text-xs text-gray-500">Using your seeker email address</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">New Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                    <p className="text-xs text-gray-500">
                      Must be at least 6 characters (different from your seeker password)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>

                  {password && confirmPassword && password !== confirmPassword && (
                    <Alert variant="destructive">
                      <AlertDescription>Passwords do not match</AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600"
                    disabled={
                      isLoading ||
                      !password ||
                      !confirmPassword ||
                      password !== confirmPassword
                    }
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Broker Account...
                      </>
                    ) : (
                      <>
                        <Building2 className="mr-2 h-4 w-4" />
                        Upgrade to Broker
                      </>
                    )}
                  </Button>
                </form>
              </>
            ) : (
              <div className="text-center space-y-4">
                <p className="text-gray-600 dark:text-gray-400">
                  You need an account to list properties.
                </p>
                <Button
                  onClick={() => router.push('/auth/signup?type=broker')}
                  className="w-full"
                >
                  Create Broker Account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => router.push('/auth/login')}
                  className="w-full"
                >
                  Already have an account? Sign in
                </Button>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-xs text-gray-500">
              By upgrading, you agree to our{' '}
              <Link href="/terms" className="text-primary hover:underline">
                Terms of Service
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
