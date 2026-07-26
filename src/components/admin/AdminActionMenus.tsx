// src/components/admin/AdminActionMenus.tsx
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreVertical, UserCog, UserCheck, UserX, Ban, UserMinus, CheckCircle, XCircle,
  Crown, Trash2, Globe, Pause, Play, EyeOff, Home,
} from 'lucide-react';
import { getUserTypeLabel, isPosterRole, UserType } from '@/types/user';

export type AdminUserRow = {
  id: string;
  full_name: string | null;
  email: string;
  user_type: string;
  is_verified: boolean;
  is_banned: boolean;
};

export type AdminPropertyRow = {
  id: string;
  title: string;
  status: string;
  is_featured: boolean;
};

export function UserActionsMenu({
  user: u,
  onVerify,
  onReject,
  onRole,
  onBan,
  onUnban,
  onDelete,
}: {
  user: AdminUserRow;
  onVerify: () => void;
  onReject: () => void;
  onRole: () => void;
  onBan: () => void;
  onUnban: () => void;
  onDelete: () => void;
}) {
  if (u.user_type === 'admin') {
    return (
      <Button variant="ghost" size="icon" disabled title="Admin accounts are protected">
        <MoreVertical className="h-4 w-4 opacity-40" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="User actions">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{u.full_name || u.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onRole}>
          <UserCog className="mr-2 h-4 w-4" /> Change role
        </DropdownMenuItem>
        {isPosterRole(u.user_type) && !u.is_verified && (
          <DropdownMenuItem className="text-emerald-600" onClick={onVerify}>
            <UserCheck className="mr-2 h-4 w-4" /> Verify poster
          </DropdownMenuItem>
        )}
        {isPosterRole(u.user_type) && u.is_verified && (
          <DropdownMenuItem className="text-amber-700 dark:text-amber-400" onClick={onReject}>
            <UserX className="mr-2 h-4 w-4" /> Revoke verification
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {u.is_banned ? (
          <DropdownMenuItem className="text-emerald-600" onClick={onUnban}>
            <UserCheck className="mr-2 h-4 w-4" /> Unban
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem className="text-red-600" onClick={onBan}>
            <Ban className="mr-2 h-4 w-4" /> Ban user
          </DropdownMenuItem>
        )}
        <DropdownMenuItem className="text-red-600 font-semibold" onClick={onDelete}>
          <UserMinus className="mr-2 h-4 w-4" /> Delete account
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PropertyActionsMenu({
  property: p,
  onApprove,
  onReject,
  onFeature,
  onDelete,
  onSetStatus,
}: {
  property: AdminPropertyRow;
  onApprove: () => void;
  onReject: () => void;
  onFeature: () => void;
  onDelete: () => void;
  onSetStatus: (status: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Property actions">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate max-w-[14rem]">{p.title}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/properties/${p.id}`} target="_blank">
            <Globe className="mr-2 h-4 w-4" /> Public view
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/landlord/properties/${p.id}`}>
            <Home className="mr-2 h-4 w-4" /> Manage as owner view
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {p.status === 'pending' && (
          <>
            <DropdownMenuItem className="text-emerald-600" onClick={onApprove}>
              <CheckCircle className="mr-2 h-4 w-4" /> Approve
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600" onClick={onReject}>
              <XCircle className="mr-2 h-4 w-4" /> Reject
            </DropdownMenuItem>
          </>
        )}
        {p.status !== 'active' && p.status !== 'pending' && (
          <DropdownMenuItem className="text-emerald-600" onClick={() => onSetStatus('active')}>
            <Play className="mr-2 h-4 w-4" /> Set active
          </DropdownMenuItem>
        )}
        {p.status === 'active' && (
          <>
            <DropdownMenuItem onClick={() => onSetStatus('paused')}>
              <Pause className="mr-2 h-4 w-4" /> Pause
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSetStatus('taken')}>
              <EyeOff className="mr-2 h-4 w-4" /> Mark taken
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSetStatus('hidden')}>
              <EyeOff className="mr-2 h-4 w-4" /> Hide
            </DropdownMenuItem>
          </>
        )}
        {(p.status === 'paused' || p.status === 'hidden' || p.status === 'taken' || p.status === 'rented') && (
          <DropdownMenuItem className="text-emerald-600" onClick={() => onSetStatus('active')}>
            <Play className="mr-2 h-4 w-4" /> Make available
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={onFeature}>
          <Crown className="mr-2 h-4 w-4" />
          {p.is_featured ? 'Unfeature' : 'Feature'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-red-600" onClick={onDelete}>
          <Trash2 className="mr-2 h-4 w-4" /> Delete listing
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { getUserTypeLabel };
export type { UserType };
