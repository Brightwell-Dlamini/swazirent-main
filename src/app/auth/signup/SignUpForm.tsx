// src/app/auth/signup/SignUpForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, User, Building, CheckCircle } from 'lucide-react';
import { z } from 'zod';
import SocialLoginButtons from '@/components/auth/SocialLoginButtons';

// Validation schema
const signUpSchema = z
  .object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Please confirm your password'),
    fullName: z.string().min(2, 'Full name is required'),
    phone: z
      .string()
      .min(10, 'Phone number must be at least 10 digits')
      .regex(
        /^(\+268)?[0-9\s\-]+$/,
        'Please enter a valid Eswatini phone number',
      ),
    userType: z.enum(['renter', 'landlord']),
    agreeToTerms: z.boolean().refine((val) => val === true, {
      message: 'You must agree to the terms and conditions',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

const formatEswatiniPhone = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');

  if (cleaned.startsWith('268')) {
    if (cleaned.length === 12) {
      return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
    }
    return `+${cleaned}`;
  } else if (cleaned.startsWith('0')) {
    if (cleaned.length === 9) {
      return `+268 ${cleaned.slice(1, 4)} ${cleaned.slice(4)}`;
    }
    return cleaned;
  } else if (cleaned.length === 8) {
    return `+268 ${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
  }

  return value;
};

type FormDataType = {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  phone: string;
  userType: 'renter' | 'landlord';
  agreeToTerms: boolean;
};

export default function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signUp, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [successState, setSuccessState] = useState<{
    type: 'success' | 'verification';
    message: string;
  } | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const [formData, setFormData] = useState<FormDataType>({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
    userType: (searchParams.get('type') as 'renter' | 'landlord') || 'renter',
    agreeToTerms: false,
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatEswatiniPhone(e.target.value);
    setFormData({ ...formData, phone: formatted });
  };

  const validateForm = (): boolean => {
    try {
      signUpSchema.parse(formData);
      setValidationErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.issues.forEach((issue: z.ZodIssue) => {
          const path = issue.path[0];
          if (path) {
            errors[path.toString()] = issue.message;
          } else {
            errors.general = issue.message;
          }
        });
        setValidationErrors(errors);
      }
      return false;
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessState(null);
    setValidationErrors({});

    if (!validateForm()) {
      setIsLoading(false);
      return;
    }

    try {
      const { error: signUpError } = await signUp(
        formData.email,
        formData.password,
        formData.userType,
        formData.fullName,
        formData.phone
      );

      if (signUpError) {
        setError(signUpError.message);
        setIsLoading(false);
        return;
      }

      setSuccessState({
        type: 'verification',
        message: 'Please check your email to verify your account.',
      });
      
    } catch (error: unknown) {
      console.error('Signup error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred during signup');
    } finally {
      setIsLoading(false);
    }
  }

  const handleSocialLoginError = (errorMessage: string) => {
    setError(errorMessage);
  };

  if (!isMounted) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-gray-600">Loading...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (successState) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  {successState.type === 'verification' ? (
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-blue-600" />
                    </div>
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                  )}
                </div>
                <h3 className="text-lg font-semibold">
                  {successState.type === 'verification'
                    ? 'Verify Your Email'
                    : 'Success!'}
                </h3>
                <p className="text-gray-600">{successState.message}</p>
                {successState.type === 'verification' && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => router.push('/auth/login')}
                  >
                    Go to Login
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              Create an Account
            </CardTitle>
            <CardDescription className="text-center">
              Join Ekhaya to find or list properties
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <SocialLoginButtons 
                isLoading={isLoading || authLoading}
                onError={handleSocialLoginError}
              />

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <Button
                    type="button"
                    variant={formData.userType === 'renter' ? 'default' : 'outline'}
                    className={`h-20 flex flex-col items-center justify-center space-y-1 ${
                      formData.userType === 'renter' ? 'bg-primary text-white' : ''
                    }`}
                    onClick={() => setFormData({ ...formData, userType: 'renter' })}
                  >
                    <User className="h-6 w-6" />
                    <span>I&apos;m a Renter</span>
                  </Button>
                  <Button
                    type="button"
                    variant={formData.userType === 'landlord' ? 'default' : 'outline'}
                    className={`h-20 flex flex-col items-center justify-center space-y-1 ${
                      formData.userType === 'landlord' ? 'bg-primary text-white' : ''
                    }`}
                    onClick={() => setFormData({ ...formData, userType: 'landlord' })}
                  >
                    <Building className="h-6 w-6" />
                    <span>I&apos;m a Landlord</span>
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    placeholder="Thabo Dlamini"
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                    className={validationErrors.fullName ? 'border-red-500' : ''}
                    required
                  />
                  {validationErrors.fullName && (
                    <p className="text-sm text-red-500">
                      {validationErrors.fullName}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className={validationErrors.email ? 'border-red-500' : ''}
                    required
                  />
                  {validationErrors.email && (
                    <p className="text-sm text-red-500">
                      {validationErrors.email}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+268 76XX XXXX"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    className={validationErrors.phone ? 'border-red-500' : ''}
                    required
                  />
                  {validationErrors.phone && (
                    <p className="text-sm text-red-500">
                      {validationErrors.phone}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    Format: +268 76XX XXXX or 76XX XXXX
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className={validationErrors.password ? 'border-red-500' : ''}
                    required
                  />
                  {validationErrors.password && (
                    <p className="text-sm text-red-500">
                      {validationErrors.password}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    Must be at least 6 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confirmPassword: e.target.value,
                      })
                    }
                    className={
                      validationErrors.confirmPassword ? 'border-red-500' : ''
                    }
                    required
                  />
                  {validationErrors.confirmPassword && (
                    <p className="text-sm text-red-500">
                      {validationErrors.confirmPassword}
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="terms"
                    checked={formData.agreeToTerms}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        agreeToTerms: checked as boolean,
                      })
                    }
                  />
                  <Label htmlFor="terms" className="text-sm">
                    I agree to the{' '}
                    <Link href="/terms" className="text-primary hover:underline">
                      Terms and Conditions
                    </Link>{' '}
                    and{' '}
                    <Link
                      href="/privacy"
                      className="text-primary hover:underline"
                    >
                      Privacy Policy
                    </Link>
                  </Label>
                </div>
                {validationErrors.agreeToTerms && (
                  <p className="text-sm text-red-500">
                    {validationErrors.agreeToTerms}
                  </p>
                )}

                <Button type="submit" className="w-full" disabled={isLoading || authLoading}>
                  {isLoading || authLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    'Sign Up'
                  )}
                </Button>
              </form>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-sm text-center text-gray-500">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-primary hover:underline">
                Log in
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
