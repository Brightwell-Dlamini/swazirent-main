// src/app/auth/signup/SignUpForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { UserType } from '@/types/user';
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
import { Loader2, User, Building, Briefcase, Home, CheckCircle } from 'lucide-react';
import { z } from 'zod';
import SocialLoginButtons from '@/components/auth/SocialLoginButtons';

const ROLES = ['seeker', 'landlord', 'broker', 'agent'] as const;

const signUpSchema = z
  .object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Please confirm your password'),
    fullName: z.string().min(2, 'Full name is required'),
    phone: z
      .string()
      .min(8, 'Phone number is required')
      .regex(/^(\+268)?[0-9\s\-]+$/, 'Please enter a valid Eswatini phone number'),
    userType: z.enum(ROLES),
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
  if (cleaned.startsWith('268') && cleaned.length === 12) {
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }
  if (cleaned.startsWith('0') && cleaned.length === 9) {
    return `+268 ${cleaned.slice(1, 4)} ${cleaned.slice(4)}`;
  }
  if (cleaned.length === 8) {
    return `+268 ${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
  }
  return value;
};

type FormRole = (typeof ROLES)[number];

type FormDataType = {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  phone: string;
  userType: FormRole;
  agreeToTerms: boolean;
};

const ROLE_META: Record<FormRole, { label: string; icon: typeof User; blurb: string }> = {
  seeker: {
    label: 'Renter/Buyer',
    icon: User,
    blurb: 'Looking for a place to rent or buy.',
  },
  landlord: {
    label: 'Landlord',
    icon: Home,
    blurb: 'Property owner listing your own place.',
  },
  broker: {
    label: 'Broker',
    icon: Building,
    blurb: 'Facilitator finding tenants or buyers.',
  },
  agent: {
    label: 'Agent',
    icon: Briefcase,
    blurb: 'Licensed or established estate agent.',
  },
};

export default function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signUp, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [successState, setSuccessState] = useState<{ type: 'verification'; message: string } | null>(
    null
  );
  const [isMounted, setIsMounted] = useState(false);

  const initialTypeParam = searchParams.get('type');
  const initialUserType: FormRole =
    initialTypeParam === 'landlord'
      ? 'landlord'
      : initialTypeParam === 'broker'
        ? 'broker'
        : initialTypeParam === 'agent'
          ? 'agent'
          : 'seeker';

  const [formData, setFormData] = useState<FormDataType>({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
    userType: initialUserType,
    agreeToTerms: false,
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, phone: formatEswatiniPhone(e.target.value) });
  };

  const validateForm = (): boolean => {
    try {
      signUpSchema.parse(formData);
      setValidationErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        err.issues.forEach((issue) => {
          const path = issue.path[0];
          if (path) errors[path.toString()] = issue.message;
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
    if (!validateForm()) {
      setIsLoading(false);
      return;
    }
    try {
      const { error: signUpError } = await signUp(
        formData.email,
        formData.password,
        formData.userType as UserType,
        formData.fullName,
        formData.phone
      );
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      setSuccessState({
        type: 'verification',
        message: 'Please check your email to verify your account.',
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred during signup');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isMounted) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card>
            <CardContent className="pt-6 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
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
            <CardContent className="pt-6 text-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-blue-500/15 flex items-center justify-center mx-auto">
                <CheckCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold">Verify your email</h3>
              <p className="text-muted-foreground">{successState.message}</p>
              <Button variant="outline" onClick={() => router.push('/auth/login')}>
                Go to Login
              </Button>
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
            <CardTitle className="text-2xl font-bold text-center">Create an account</CardTitle>
            <CardDescription className="text-center">
              Join Ekhaya to find or list properties in Eswatini
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* 1. Role first — so Google inherits the choice */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">I am a…</Label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map((role) => {
                    const meta = ROLE_META[role];
                    const Icon = meta.icon;
                    const active = formData.userType === role;
                    return (
                      <Button
                        key={role}
                        type="button"
                        variant={active ? 'default' : 'outline'}
                        className={`h-20 flex flex-col items-center justify-center gap-1 text-xs ${
                          active ? 'bg-primary text-primary-foreground' : ''
                        }`}
                        onClick={() => setFormData({ ...formData, userType: role })}
                      >
                        <Icon className="h-5 w-5" />
                        <span>{meta.label}</span>
                      </Button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">{ROLE_META[formData.userType].blurb}</p>
              </div>

              {/* 2. Google — uses the selected role above */}
              <SocialLoginButtons
                isLoading={isLoading || authLoading}
                onError={setError}
                userType={formData.userType}
                showEmailDivider
                dividerLabel="Or continue with Google"
              />

              {/* 3. Email form */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or with email</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input
                    id="fullName"
                    placeholder="Thabo Dlamini"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className={validationErrors.fullName ? 'border-red-500' : ''}
                    required
                  />
                  {validationErrors.fullName && (
                    <p className="text-sm text-red-500">{validationErrors.fullName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={validationErrors.email ? 'border-red-500' : ''}
                    required
                  />
                  {validationErrors.email && (
                    <p className="text-sm text-red-500">{validationErrors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone number</Label>
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
                    <p className="text-sm text-red-500">{validationErrors.phone}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={validationErrors.password ? 'border-red-500' : ''}
                    required
                  />
                  {validationErrors.password && (
                    <p className="text-sm text-red-500">{validationErrors.password}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className={validationErrors.confirmPassword ? 'border-red-500' : ''}
                    required
                  />
                  {validationErrors.confirmPassword && (
                    <p className="text-sm text-red-500">{validationErrors.confirmPassword}</p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="terms"
                    checked={formData.agreeToTerms}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, agreeToTerms: checked as boolean })
                    }
                  />
                  <Label htmlFor="terms" className="text-sm">
                    I agree to the{' '}
                    <Link href="/terms" className="text-primary hover:underline">
                      Terms
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy" className="text-primary hover:underline">
                      Privacy Policy
                    </Link>
                  </Label>
                </div>
                {validationErrors.agreeToTerms && (
                  <p className="text-sm text-red-500">{validationErrors.agreeToTerms}</p>
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
          <CardFooter className="justify-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-primary hover:underline ml-1">
              Log in
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
