// src/components/listings/ContactPhoneFields.tsx
'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Smartphone } from 'lucide-react';

interface ContactPhoneFieldsProps {
  contactPhone: string;
  contactWhatsapp: string;
  onPhoneChange: (v: string) => void;
  onWhatsappChange: (v: string) => void;
  isPhoneVerified: boolean;
  onRequestVerify: () => void;
}

/** Listing contact — prefers verified account number */
export function ContactPhoneFields({
  contactPhone,
  contactWhatsapp,
  onPhoneChange,
  onWhatsappChange,
  isPhoneVerified,
  onRequestVerify,
}: ContactPhoneFieldsProps) {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label>Phone *</Label>
          {isPhoneVerified && (
            <Badge className="bg-emerald-600 text-white border-0 text-[10px]">
              <CheckCircle className="h-3 w-3 mr-1" />Account verified
            </Badge>
          )}
        </div>
        <Input
          value={contactPhone}
          onChange={(e) => onPhoneChange(e.target.value.replace(/[^\d+]/g, ''))}
          placeholder="+268 76XX XXXX"
          inputMode="tel"
        />
        {isPhoneVerified && (
          <p className="text-xs text-muted-foreground mt-1">
            Filled from your verified account number. Change on Profile if needed.
          </p>
        )}
      </div>
      <div>
        <Label>WhatsApp</Label>
        <Input
          value={contactWhatsapp}
          onChange={(e) => onWhatsappChange(e.target.value.replace(/[^\d+]/g, ''))}
          placeholder="Same as phone if empty"
          inputMode="tel"
          className="mt-1.5"
        />
      </div>
      {!isPhoneVerified && (
        <Alert className="border-amber-500/30 bg-amber-500/10">
          <AlertDescription className="flex justify-between gap-2 flex-wrap items-center">
            <span className="flex items-center gap-2 text-sm">
              <Smartphone className="h-4 w-4 shrink-0" />
              Verify once on your account to publish
            </span>
            <Button type="button" size="sm" variant="outline" onClick={onRequestVerify}>
              Verify
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
