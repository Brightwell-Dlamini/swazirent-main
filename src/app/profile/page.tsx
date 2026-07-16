// src/app/profile/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, User, Mail, Phone, MapPin, Shield, Key, Save, RefreshCw } from 'lucide-react';
import { z } from 'zod';

// Validation schemas
const profileSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const emailSchema = z.object({
  newEmail: z.string().email('Please enter a valid email address'),
  currentPassword: z.string().min(1, 'Current password is required to change email'),
});

export default function ProfilePage() {
  const { user, userType, profile, refreshUser } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Profile form
  const [profileData, setProfileData] = useState({
    fullName: '',
    phone: '',
  });

  // Password form
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Email form
  const [emailData, setEmailData] = useState({
    newEmail: '',
    currentPassword: '',
  });

  // Re-auth dialog
  const [showReAuthDialog, setShowReAuthDialog] = useState(false);
  const [reauthPassword, setReauthPassword] = useState('');
  const [reauthLoading, setReauthLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<'password' | 'email' | null>(null);

  // Load profile data
  useEffect(() => {
    if (profile) {
      setProfileData({
        fullName: profile.fullName || '',
        phone: profile.phone || '',
      });
    }
  }, [profile]);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
    }
  }, [user, router]);

  // Helper to get Zod error message
  const getZodErrorMessage = (error: z.ZodError): string => {
    if (error.issues && error.issues.length > 0) {
      return error.issues[0].message;
    }
    return 'Validation error';
  };

  // Handle profile update
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      // Validate
      const validated = profileSchema.parse(profileData);

      setProfileLoading(true);

      // Update profile in database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: validated.fullName,
          phone: validated.phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      // Update user metadata
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          full_name: validated.fullName,
          phone: validated.phone,
        },
      });

      if (metadataError) throw metadataError;

      await refreshUser();
      setSuccess('Profile updated successfully!');
      toast.success('Profile updated successfully!');

    } catch (error) {
      if (error instanceof z.ZodError) {
        setError(getZodErrorMessage(error));
      } else if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to update profile');
      }
      toast.error('Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  // Handle password update with re-authentication
  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      // Validate
      const validated = passwordSchema.parse(passwordData);

      // First, verify current password by attempting to sign in
      if (!user?.email) {
        setError('User email not found');
        return;
      }

      setLoading(true);

      // Verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: validated.currentPassword,
      });

      if (signInError) {
        setError('Current password is incorrect');
        toast.error('Current password is incorrect');
        setLoading(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: validated.newPassword,
      });

      if (updateError) {
        // Check if re-authentication is required
        if (updateError.message?.includes('reauth') || updateError.status === 403) {
          // Need to re-authenticate
          setPendingAction('password');
          setShowReAuthDialog(true);
          setLoading(false);
          return;
        }
        throw updateError;
      }

      setSuccess('Password updated successfully!');
      toast.success('Password updated successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        setError(getZodErrorMessage(error));
      } else if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to update password');
      }
      toast.error('Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  // Handle re-authentication
  const handleReAuth = async () => {
    if (!user?.email) {
      toast.error('User email not found');
      return;
    }

    setReauthLoading(true);
    try {
      // Verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: reauthPassword,
      });

      if (signInError) {
        toast.error('Incorrect password');
        setReauthLoading(false);
        return;
      }

      // Perform the pending action
      if (pendingAction === 'password') {
        const { error: updateError } = await supabase.auth.updateUser({
          password: passwordData.newPassword,
        });

        if (updateError) throw updateError;

        setSuccess('Password updated successfully!');
        toast.success('Password updated successfully!');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else if (pendingAction === 'email') {
        const { error: updateError } = await supabase.auth.updateUser({
          email: emailData.newEmail,
        });

        if (updateError) throw updateError;

        setSuccess('Email update initiated! Please check your new email for verification.');
        toast.success('Email update initiated! Check your new email for verification.');
        setEmailData({
          newEmail: '',
          currentPassword: '',
        });
      }

      setShowReAuthDialog(false);
      setReauthPassword('');
      setPendingAction(null);

    } catch (error) {
      console.error('Re-auth error:', error);
      toast.error('Failed to complete action');
    } finally {
      setReauthLoading(false);
    }
  };

  // Handle email update
  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      // Validate
      const validated = emailSchema.parse(emailData);

      // Verify current password
      if (!user?.email) {
        setError('User email not found');
        return;
      }

      setLoading(true);

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: validated.currentPassword,
      });

      if (signInError) {
        setError('Current password is incorrect');
        toast.error('Current password is incorrect');
        setLoading(false);
        return;
      }

      // Update email
      const { error: updateError } = await supabase.auth.updateUser({
        email: validated.newEmail,
      });

      if (updateError) {
        if (updateError.message?.includes('reauth') || updateError.status === 403) {
          setPendingAction('email');
          setShowReAuthDialog(true);
          setLoading(false);
          return;
        }
        throw updateError;
      }

      setSuccess('Email update initiated! Please check your new email for verification.');
      toast.success('Email update initiated! Check your new email for verification.');
      setEmailData({
        newEmail: '',
        currentPassword: '',
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        setError(getZodErrorMessage(error));
      } else if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to update email');
      }
      toast.error('Failed to update email');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Profile Settings</h1>
        <p className="text-gray-600">Manage your account information and security</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Sidebar */}
        <div className="md:col-span-1">
          <Card>
            <CardContent className="p-6 text-center">
              <Avatar className="h-24 w-24 mx-auto mb-4">
                <AvatarImage src={user.user_metadata?.avatar_url} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {user.email?.substring(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <h2 className="font-semibold text-lg">
                {profile?.fullName || user.email?.split('@')[0] || 'User'}
              </h2>
              <p className="text-sm text-gray-500 capitalize">{userType || 'User'}</p>
              <p className="text-sm text-gray-500 truncate">{user.email}</p>
              {profile?.isVerified && (
                <div className="mt-2 inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  <Shield className="h-3 w-3" />
                  Verified
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="md:col-span-2">
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Security
              </TabsTrigger>
              <TabsTrigger value="account" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Account
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <Card>
                <form onSubmit={handleProfileUpdate}>
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>
                      Update your personal information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    {success && (
                      <Alert className="bg-green-50 border-green-200">
                        <AlertDescription className="text-green-800">
                          {success}
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        placeholder="Your full name"
                        value={profileData.fullName}
                        onChange={(e) =>
                          setProfileData({ ...profileData, fullName: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+268 7600 0000"
                        value={profileData.phone}
                        onChange={(e) =>
                          setProfileData({ ...profileData, phone: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Email</Label>
                      <p className="text-gray-600">{user.email}</p>
                      <p className="text-sm text-gray-500">
                        To change your email, go to the Account tab
                      </p>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" disabled={profileLoading}>
                      {profileLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security">
              <Card>
                <form onSubmit={handlePasswordUpdate}>
                  <CardHeader>
                    <CardTitle>Change Password</CardTitle>
                    <CardDescription>
                      Update your password. You must enter your current password to verify your identity.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    {success && (
                      <Alert className="bg-green-50 border-green-200">
                        <AlertDescription className="text-green-800">
                          {success}
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        placeholder="Enter your current password"
                        value={passwordData.currentPassword}
                        onChange={(e) =>
                          setPasswordData({ ...passwordData, currentPassword: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        placeholder="Enter new password (min 6 characters)"
                        value={passwordData.newPassword}
                        onChange={(e) =>
                          setPasswordData({ ...passwordData, newPassword: e.target.value })
                        }
                        required
                        minLength={6}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Confirm your new password"
                        value={passwordData.confirmPassword}
                        onChange={(e) =>
                          setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                        }
                        required
                        minLength={6}
                      />
                    </div>

                    <Alert className="bg-blue-50 border-blue-200">
                      <AlertDescription className="text-blue-800 text-sm">
                        ⚠️ For security, you must verify your current password
                        before changing it. Your current password will be verified
                        before the update is applied.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Key className="mr-2 h-4 w-4" />
                          Update Password
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>

            {/* Account Tab */}
            <TabsContent value="account">
              <Card>
                <form onSubmit={handleEmailUpdate}>
                  <CardHeader>
                    <CardTitle>Email Address</CardTitle>
                    <CardDescription>
                      Change your email address. You'll need to verify your new email.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    {success && (
                      <Alert className="bg-green-50 border-green-200">
                        <AlertDescription className="text-green-800">
                          {success}
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="space-y-2">
                      <Label>Current Email</Label>
                      <p className="text-gray-600">{user.email}</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="newEmail">New Email</Label>
                      <Input
                        id="newEmail"
                        type="email"
                        placeholder="Enter your new email address"
                        value={emailData.newEmail}
                        onChange={(e) =>
                          setEmailData({ ...emailData, newEmail: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="emailPassword">Current Password</Label>
                      <Input
                        id="emailPassword"
                        type="password"
                        placeholder="Enter your current password to verify"
                        value={emailData.currentPassword}
                        onChange={(e) =>
                          setEmailData({ ...emailData, currentPassword: e.target.value })
                        }
                        required
                      />
                    </div>

                    <Alert className="bg-yellow-50 border-yellow-200">
                      <AlertDescription className="text-yellow-800 text-sm">
                        ⚠️ Changing your email will log you out. You'll need to
                        verify your new email address before you can log in again.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <Mail className="mr-2 h-4 w-4" />
                          Update Email
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Re-authentication Dialog */}
      <Dialog open={showReAuthDialog} onOpenChange={setShowReAuthDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Re-authentication Required</DialogTitle>
            <DialogDescription>
              For security, please enter your current password to confirm this action.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="reauth-password">Current Password</Label>
            <Input
              id="reauth-password"
              type="password"
              placeholder="Enter your current password"
              value={reauthPassword}
              onChange={(e) => setReauthPassword(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowReAuthDialog(false);
              setReauthPassword('');
              setPendingAction(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleReAuth} disabled={reauthLoading || !reauthPassword}>
              {reauthLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Confirm'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}