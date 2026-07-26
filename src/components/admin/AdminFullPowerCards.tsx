// src/components/admin/AdminFullPowerCards.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle, XCircle } from 'lucide-react';
import { getUserTypeLabel, isPosterRole } from '@/types/user';
import { UserActionsMenu, PropertyActionsMenu } from '@/components/admin/AdminActionMenus';

export type MobileUser = {
  id: string;
  full_name: string | null;
  email: string;
  user_type: string;
  is_verified: boolean;
  is_banned: boolean;
  verification_level?: string | null;
  created_at: string;
  property_count?: number;
};

export type MobileProperty = {
  id: string;
  title: string;
  price: number;
  location_city: string;
  location_suburb: string | null;
  status: string;
  is_featured: boolean;
  views: number;
  landlord?: { full_name: string | null; email?: string } | null;
};

function formatDate(date: string | null) {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getVerificationBadge(u: MobileUser) {
  if (u.is_verified) {
    return (
      <Badge className="bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30">
        Verified
      </Badge>
    );
  }
  if (u.verification_level === 'pending') {
    return (
      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">
        Pending
      </Badge>
    );
  }
  if (u.verification_level === 'rejected') {
    return (
      <Badge className="bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30">
        Rejected
      </Badge>
    );
  }
  return <Badge variant="outline">Unverified</Badge>;
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    active: 'bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30',
    pending: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
    rejected: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
    reported: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
    rented: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
    taken: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
    paused: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
    hidden: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
  };
  return colors[status] || 'bg-muted text-muted-foreground';
}

export function AdminUserMobileCard({
  user: u,
  selected,
  onToggleSelect,
  onVerify,
  onReject,
  onRole,
  onBan,
  onUnban,
  onDelete,
}: {
  user: MobileUser;
  selected: boolean;
  onToggleSelect: () => void;
  onVerify: () => void;
  onReject: () => void;
  onRole: () => void;
  onBan: () => void;
  onUnban: () => void;
  onDelete: () => void;
}) {
  const canVerify = isPosterRole(u.user_type) && !u.is_verified;
  return (
    <Card className={canVerify ? 'border-purple-500/40 bg-purple-500/5' : 'bg-card'}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={selected}
            onCheckedChange={onToggleSelect}
            disabled={u.user_type === 'admin'}
            className="mt-1"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium truncate">{u.full_name || 'Unnamed'}</p>
                <p className="text-sm text-muted-foreground truncate">{u.email}</p>
              </div>
              <UserActionsMenu
                user={u}
                onVerify={onVerify}
                onReject={onReject}
                onRole={onRole}
                onBan={onBan}
                onUnban={onUnban}
                onDelete={onDelete}
              />
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <Badge variant="outline">{getUserTypeLabel(u.user_type)}</Badge>
              {getVerificationBadge(u)}
              {u.is_banned && <Badge variant="destructive">Banned</Badge>}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Joined {formatDate(u.created_at)}
              {isPosterRole(u.user_type) ? ` · ${u.property_count || 0} listings` : ''}
            </p>
          </div>
        </div>
        {canVerify && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={onVerify}>
              <CheckCircle className="h-3 w-3 mr-1" /> Verify
            </Button>
            <Button size="sm" variant="destructive" onClick={onReject}>
              <XCircle className="h-3 w-3 mr-1" /> Reject
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AdminPropertyMobileCard({
  property: p,
  onApprove,
  onReject,
  onFeature,
  onDelete,
  onSetStatus,
}: {
  property: MobileProperty;
  onApprove: () => void;
  onReject: () => void;
  onFeature: () => void;
  onDelete: () => void;
  onSetStatus: (status: string) => void;
}) {
  return (
    <Card className={p.status === 'pending' ? 'border-amber-500/40 bg-amber-500/5' : 'bg-card'}>
      <CardContent className="p-4 space-y-2">
        <div className="flex justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">{p.title}</p>
            <p className="text-sm text-muted-foreground">
              {p.location_suburb}, {p.location_city}
            </p>
            <p className="text-sm text-muted-foreground">by {p.landlord?.full_name || 'Unknown'}</p>
          </div>
          <div className="flex items-start gap-1 shrink-0">
            <Badge className={getStatusColor(p.status)}>{p.status}</Badge>
            <PropertyActionsMenu
              property={p}
              onApprove={onApprove}
              onReject={onReject}
              onFeature={onFeature}
              onDelete={onDelete}
              onSetStatus={onSetStatus}
            />
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">E{p.price?.toLocaleString()}</span>
          <span className="text-muted-foreground">
            {p.views || 0} views{p.is_featured ? ' · Featured' : ''}
          </span>
        </div>
        {p.status === 'pending' && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={onApprove}>
              Approve
            </Button>
            <Button size="sm" variant="destructive" onClick={onReject}>
              Reject
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
