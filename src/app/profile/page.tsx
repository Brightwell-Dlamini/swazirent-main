// src/app/profile/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { usePhoneVerification } from '@/hooks/usePhoneVerification';
import { supabase } from '@/lib/supabase';
import { getNameInitials } from '@/lib/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, User, Mail, Phone, Shield, Key, Save, CheckCircle, Camera } from 'lucide-react';
import { z } from 'zod';
import { PhoneVerifyDialog } from '@/components/auth/PhoneVerifyDialog';
import { getUserTypeLabel } from '@/types/user';

const profileSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().min(8, 'Please enter a valid phone number'),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
    confirmPassword: z.string().min(6, 'Please confirm your password'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

const emailSchema = z.object({
  newEmail: z.string().email('Please enter a valid email address'),
  currentPassword: z.string().min(1, 'Current password is required'),
});

export default function ProfilePage() {
  const { user, userType, profile, refreshUser } = useAuth();
  const { isPhoneVerified, phone: verifiedPhone, refresh: refreshPhone } = usePhoneVerification();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);

  const [profileData, setProfileData] = useState({ fullName: '', phone: '' });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [emailData, setEmailData] = useState({ newEmail: '', currentPassword: '' });

  const [showReAuthDialog, setShowReAuthDialog] = useState(false);
  const [reauthPassword, setReauthPassword] = useState('');
  const [reauthLoading, setReauthLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<'password' | 'email' | null>(null);

  useEffect(() => {
    if (profile) {
      setProfileData({
        fullName: profile.fullName || '',
        phone: profile.phone || verifiedPhone || '',
      });
    }
    const fromMeta = user?.user_metadata?.avatar_url as string | undefined;
    const fromProfile = (profile as { avatarUrl?: string } | null)?.avatarUrl;
    setAvatarUrl(fromMeta || fromProfile || undefined);
  }, [profile, verifiedPhone, user]);

  useEffect(() => {
    if (!user) router.push('/auth/login');
  }, [user, router]);

  const getZodErrorMessage = (err: z.ZodError) => err.issues[0]?.message || 'Validation error';

  const initials = getNameInitials(
    profileData.fullName || profile?.fullName,
    user?.email
  );

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB');
      return;
    }

    setAvatarUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(path);

      // Cache-bust so the UI updates immediately
      const urlWithBust = `${publicUrl}?t=${Date.now()}`;

      await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      await supabase.auth.updateUser({
        data: { avatar_url: publicUrl },
      });

      setAvatarUrl(urlWithBust);
      await refreshUser();
      toast.success('Profile photo updated');
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to upload photo');
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      const validated = profileSchema.parse(profileData);
      setProfileLoading(true);

      const phoneChanged =
        (profile?.phone || '').replace(/\s/g, '') !== validated.phone.replace(/\s/g, '');

      const updatePayload: Record<string, unknown> = {
        full_name: validated.fullName,
        phone: validated.phone,
        updated_at: new Date().toISOString(),
      };

      if (phoneChanged && isPhoneVerified) {
        updatePayload.phone_verified_at = null;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', user?.id);

      if (updateError) throw updateError;

      await supabase.auth.updateUser({
        data: { full_name: validated.fullName, phone: validated.phone },
      });

      await refreshUser();
      await refreshPhone();

      if (phoneChanged && isPhoneVerified) {
        setSuccess('Profile saved. Verify your new number below.');
        toast.info('Verify your new phone number');
        setPhoneDialogOpen(true);
      } else {
        setSuccess('Profile updated');
        toast.success('Profile updated');
      }
    } catch (err) {
      const msg =
        err instanceof z.ZodError
          ? getZodErrorMessage(err)
          : err instanceof Error
            ? err.message
            : 'Failed to update profile';
      setError(msg);
      toast.error(msg);
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      const validated = passwordSchema.parse(passwordData);
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
      const { error: updateError } = await supabase.auth.updateUser({
        password: validated.newPassword,
      });
      if (updateError) {
        if (updateError.message?.includes('reauth') || updateError.status === 403) {
          setPendingAction('password');
          setShowReAuthDialog(true);
          setLoading(false);
          return;
        }
        throw updateError;
      }
      setSuccess('Password updated');
      toast.success('Password updated');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      const msg =
        err instanceof z.ZodError
          ? getZodErrorMessage(err)
          : err instanceof Error
            ? err.message
            : 'Failed to update password';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReAuth = async () => {
    if (!user?.email) return;
    setReauthLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: reauthPassword,
      });
      if (signInError) {
        toast.error('Incorrect password');
        setReauthLoading(false);
        return;
      }
      if (pendingAction === 'password') {
        const { error: updateError } = await supabase.auth.updateUser({
          password: passwordData.newPassword,
        });
        if (updateError) throw updateError;
        setSuccess('Password updated');
        toast.success('Password updated');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else if (pendingAction === 'email') {
        const { error: updateError } = await supabase.auth.updateUser({
          email: emailData.newEmail,
        });
        if (updateError) throw updateError;
        setSuccess('Check your new email to confirm the change');
        toast.success('Check your new email');
        setEmailData({ newEmail: '', currentPassword: '' });
      }
      setShowReAuthDialog(false);
      setReauthPassword('');
      setPendingAction(null);
    } catch {
      toast.error('Failed to complete action');
    } finally {
      setReauthLoading(false);
    }
  };

  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      const validated = emailSchema.parse(emailData);
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
      setSuccess('Check your new email to confirm');
      toast.success('Check your new email');
      setEmailData({ newEmail: '', currentPassword: '' });
    } catch (err) {
      const msg =
        err instanceof z.ZodError
          ? getZodErrorMessage(err)
          : err instanceof Error
            ? err.message
            : 'Failed to update email';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">Photo, account, phone, and security</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 md:gap-8">
        <div className="md:col-span-1">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="relative inline-block mx-auto mb-3">
                <Avatar className="h-24 w-24 border-2 border-border">
                  <AvatarImage src={avatarUrl} alt="" />
                  <AvatarFallback className="text-xl bg-primary/10 text-primary font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md ring-2 ring-background hover:opacity-90 disabled:opacity-60"
                  aria-label="Change profile photo"
                >
                  {avatarUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <p className="text-xs text-muted-foreground mb-2">Tap the camera to change photo</p>
              <h2 className="font-semibold truncate">
                {profile?.fullName || user.email?.split('@')[0] || 'User'}
              </h2>
              <p className="text-sm text-muted-foreground">{getUserTypeLabel(userType)}</p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {profile?.isVerified && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <CheckCircle className="h-3 w-3 text-emerald-600" />
                    Verified
                  </Badge>
                )}
                {isPhoneVerified ? (
                  <Badge className="text-xs gap-1 bg-emerald-600 text-white border-0">
                    <CheckCircle className="h-3 w-3" />
                    Phone verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-amber-700 dark:text-amber-300">
                    Phone not verified
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile" className="gap-1.5 text-xs sm:text-sm">
                <User className="h-3.5 w-3.5" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-1.5 text-xs sm:text-sm">
                <Key className="h-3.5 w-3.5" />
                Security
              </TabsTrigger>
              <TabsTrigger value="account" className="gap-1.5 text-xs sm:text-sm">
                <Mail className="h-3.5 w-3.5" />
                Email
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-4">
              <Card className={isPhoneVerified ? 'border-emerald-500/30' : 'border-amber-500/30'}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Phone number
                  </CardTitle>
                  <CardDescription>
                    {isPhoneVerified
                      ? 'Verified once for your account. Listings use this number.'
                      : 'Verify once — then publish listings without repeating OTP.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Current: </span>
                    <span className="font-medium">{profileData.phone || 'Not set'}</span>
                  </div>
                  {isPhoneVerified ? (
                    <Badge className="bg-emerald-600 text-white border-0 w-fit">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  ) : (
                    <Button size="sm" onClick={() => setPhoneDialogOpen(true)} className="w-fit">
                      Verify phone
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card>
                <form onSubmit={handleProfileUpdate}>
                  <CardHeader>
                    <CardTitle className="text-base">Personal details</CardTitle>
                    <CardDescription>Name and contact number on your account</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    {success && (
                      <Alert className="border-emerald-500/30 bg-emerald-500/10">
                        <AlertDescription className="text-emerald-800 dark:text-emerald-300">
                          {success}
                        </AlertDescription>
                      </Alert>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full name</Label>
                      <Input
                        id="fullName"
                        value={profileData.fullName}
                        onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+268 7600 0000"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Changing your number requires a new verification.
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label>Email</Label>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" disabled={profileLoading}>
                      {profileLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Save
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>

            <TabsContent value="security">
              <Card>
                <form onSubmit={handlePasswordUpdate}>
                  <CardHeader>
                    <CardTitle className="text-base">Password</CardTitle>
                    <CardDescription>Confirm your current password to change it</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    {success && (
                      <Alert className="border-emerald-500/30 bg-emerald-500/10">
                        <AlertDescription className="text-emerald-800 dark:text-emerald-300">
                          {success}
                        </AlertDescription>
                      </Alert>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current password</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) =>
                          setPasswordData({ ...passwordData, currentPassword: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) =>
                          setPasswordData({ ...passwordData, newPassword: e.target.value })
                        }
                        required
                        minLength={6}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm new password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) =>
                          setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                        }
                        required
                        minLength={6}
                      />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" disabled={loading}>
                      {loading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Key className="mr-2 h-4 w-4" />
                      )}
                      Update password
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>

            <TabsContent value="account">
              <Card>
                <form onSubmit={handleEmailUpdate}>
                  <CardHeader>
                    <CardTitle className="text-base">Email</CardTitle>
                    <CardDescription>You’ll confirm the new address by email</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    {success && (
                      <Alert className="border-emerald-500/30 bg-emerald-500/10">
                        <AlertDescription className="text-emerald-800 dark:text-emerald-300">
                          {success}
                        </AlertDescription>
                      </Alert>
                    )}
                    <div className="space-y-1">
                      <Label>Current</Label>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newEmail">New email</Label>
                      <Input
                        id="newEmail"
                        type="email"
                        value={emailData.newEmail}
                        onChange={(e) => setEmailData({ ...emailData, newEmail: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emailPassword">Current password</Label>
                      <Input
                        id="emailPassword"
                        type="password"
                        value={emailData.currentPassword}
                        onChange={(e) =>
                          setEmailData({ ...emailData, currentPassword: e.target.value })
                        }
                        required
                      />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button type="submit" disabled={loading}>
                      {loading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Mail className="mr-2 h-4 w-4" />
                      )}
                      Update email
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <PhoneVerifyDialog
        open={phoneDialogOpen}
        onOpenChange={setPhoneDialogOpen}
        defaultPhone={profileData.phone}
        onVerified={async () => {
          await refreshPhone();
          await refreshUser();
          toast.success('Phone verified for your account');
        }}
      />

      <Dialog open={showReAuthDialog} onOpenChange={setShowReAuthDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm it’s you</DialogTitle>
            <DialogDescription>Enter your current password to continue.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="reauth-password">Password</Label>
            <Input
              id="reauth-password"
              type="password"
              value={reauthPassword}
              onChange={(e) => setReauthPassword(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowReAuthDialog(false);
                setReauthPassword('');
                setPendingAction(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleReAuth} disabled={reauthLoading || !reauthPassword}>
              {reauthLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
