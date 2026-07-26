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
import { Loader2, Smartphone } from 'lucide-react';

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

  useEffect(() => {
    if (open) {
      setPhone(defaultPhone || '');
      setStep('phone');
      setCode('');
      setDevCode(null);
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
      if (data.devCode) setDevCode(data.devCode);
      toast.success(data.message || 'Code sent');
      setStep('code');
    } catch {
      toast.error('Network error');
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
      toast.error('Network error');
    } finally {
      setLoading(false);
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
            One verification for your account. Listings will use this number.
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
            <p className="text-xs text-muted-foreground">We’ll text a 6-digit code.</p>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="otp-code">Code</Label>
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
              {devCode && (
                <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 p-2 rounded-md">
                  Dev code: <strong>{devCode}</strong>
                </p>
              )}
            </div>
            <Button type="button" variant="link" className="px-0 h-auto text-sm" onClick={() => setStep('phone')}>
              Change number
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
