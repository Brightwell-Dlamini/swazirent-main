// src/components/auth/PhoneVerifyDialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Smartphone, Copy, Check } from 'lucide-react';

interface PhoneVerifyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified?: () => void;
  defaultPhone?: string;
}

export function PhoneVerifyDialog({
  open,
  onOpenChange,
  onVerified,
  defaultPhone = '',
}: PhoneVerifyDialogProps) {
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState(defaultPhone);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setPhone(defaultPhone || '');
      setStep('phone');
      setCode('');
      setDevCode(null);
      setCopied(false);
    }
  }, [open, defaultPhone]);

  const getToken = async (): Promise<string | null> => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  };

  const sendOtp = async () => {
    if (!phone.trim()) {
      toast.error('Enter your phone number');
      return;
    }
    setLoading(true);
    setDevCode(null);
    try {
      const token = await getToken();
      if (!token) {
        toast.error('Please sign in again');
        return;
      }
      const res = await fetch('/api/phone/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to send code');
        return;
      }
      if (data.devCode) {
        setDevCode(data.devCode);
        setCode(data.devCode); // pre-fill in dev so one less step
        toast.message('Dev mode code ready', { description: data.devCode });
      } else {
        toast.success(data.message || 'Code sent');
      }
      setStep('code');
    } catch {
      toast.error('Network error — try again');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!/^\d{6}$/.test(code.trim())) {
      toast.error('Enter the 6-digit code');
      return;
    }
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        toast.error('Please sign in again');
        return;
      }
      const res = await fetch('/api/phone/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Invalid code');
        return;
      }
      toast.success('Phone verified');
      onVerified?.();
      onOpenChange(false);
      setStep('phone');
      setCode('');
      setDevCode(null);
    } catch {
      toast.error('Network error — try again');
    } finally {
      setLoading(false);
    }
  };

  const copyDevCode = async () => {
    if (!devCode) return;
    try {
      await navigator.clipboard.writeText(devCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            Verify your phone
          </DialogTitle>
          <DialogDescription>
            One verification for your account. Listings reuse this number.
          </DialogDescription>
        </DialogHeader>

        {step === 'phone' ? (
          <div className="space-y-2 py-2">
            <Label htmlFor="otp-phone">Eswatini mobile</Label>
            <Input
              id="otp-phone"
              type="tel"
              placeholder="+268 76XX XXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
            />
            <p className="text-xs text-muted-foreground">
              We’ll text a 6-digit code (or show it here if SMS isn’t configured yet).
            </p>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            {devCode && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-2">
                <p className="text-xs font-medium text-amber-900 dark:text-amber-200">
                  Dev mode — no SMS. Your code is:
                </p>
                <div className="flex items-center gap-2">
                  <code className="text-2xl font-bold tracking-[0.3em] text-foreground flex-1 text-center">
                    {devCode}
                  </code>
                  <Button type="button" size="icon" variant="outline" className="h-9 w-9" onClick={copyDevCode}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  The database only stores a hash — this code is shown only when Twilio is not set.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="otp-code">6-digit code</Label>
              <Input
                id="otp-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                autoComplete="one-time-code"
                className="tracking-widest text-center text-lg"
              />
            </div>
            <Button type="button" variant="link" className="px-0 h-auto text-sm" onClick={() => setStep('phone')}>
              Change number / resend
            </Button>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          {step === 'phone' ? (
            <Button onClick={sendOtp} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Send code
            </Button>
          ) : (
            <Button onClick={verifyOtp} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Verify
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
