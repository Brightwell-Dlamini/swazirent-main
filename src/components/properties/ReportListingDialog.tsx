// src/components/properties/ReportListingDialog.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Flag } from 'lucide-react';

export type ReportReason =
  | 'already_taken'
  | 'scam'
  | 'incorrect_info'
  | 'other';

const REASON_LABELS: Record<ReportReason, string> = {
  already_taken: 'Already Taken / No longer available',
  scam: 'Suspected scam or fraud',
  incorrect_info: 'Incorrect or misleading information',
  other: 'Other',
};

interface ReportListingDialogProps {
  propertyId: string;
  propertyTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful report (e.g. to refresh UI) */
  onReported?: (reason: ReportReason) => void;
}

export function ReportListingDialog({
  propertyId,
  propertyTitle,
  open,
  onOpenChange,
  onReported,
}: ReportListingDialogProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast.info('Please sign in to report a listing');
      onOpenChange(false);
      router.push('/auth/login');
      return;
    }

    if (!reason) {
      toast.error('Please select a reason');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Insert report
      const { error: reportError } = await supabase.from('reports').insert({
        property_id: propertyId,
        reporter_id: user.id,
        reason,
        details: details.trim() || null,
        status: 'open',
      });

      if (reportError) {
        // Table may not exist yet if migration not applied
        if (reportError.message?.includes('reports') || reportError.code === '42P01') {
          toast.error('Reporting is not available yet. Please try again later.');
          console.error('Reports table missing — apply schema migration');
        } else {
          throw reportError;
        }
        return;
      }

      // 2. If "already taken", mark listing as taken (best-effort)
      if (reason === 'already_taken') {
        await supabase
          .from('properties')
          .update({ status: 'taken', updated_at: new Date().toISOString() })
          .eq('id', propertyId);
      }

      // 3. Best-effort increment report_count
      try {
        const { data: prop } = await supabase
          .from('properties')
          .select('report_count')
          .eq('id', propertyId)
          .single();

        if (prop && typeof prop.report_count === 'number') {
          await supabase
            .from('properties')
            .update({ report_count: prop.report_count + 1 })
            .eq('id', propertyId);
        }
      } catch {
        // column may not exist yet — ignore
      }

      toast.success(
        reason === 'already_taken'
          ? 'Thanks — listing marked as taken and reported.'
          : 'Report submitted. Our team will review it.'
      );

      onReported?.(reason);
      onOpenChange(false);
      setReason('');
      setDetails('');
    } catch (err) {
      console.error('Report error:', err);
      toast.error('Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-amber-600" />
            Report listing
          </DialogTitle>
          <DialogDescription>
            Report issues with <span className="font-medium">{propertyTitle}</span>.
            This helps keep Ekhaya safe for everyone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="report-reason">Reason *</Label>
            <Select
              value={reason}
              onValueChange={(v) => setReason(v as ReportReason)}
            >
              <SelectTrigger id="report-reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(REASON_LABELS) as ReportReason[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {REASON_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="report-details">Details (optional)</Label>
            <Textarea
              id="report-details"
              placeholder="Any extra context that helps us review this..."
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
          </div>

          {reason === 'already_taken' && (
            <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2 rounded">
              Selecting “Already Taken” will mark this listing as taken so other
              seekers are not misled.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !reason}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit report'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
