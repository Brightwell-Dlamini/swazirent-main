// src/components/properties/TenureBadge.tsx
'use client';

import { TenureType, TENURE_CONFIG } from '@/types/property';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, FileClock, AlertTriangle, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const ICON_MAP = {
  ShieldCheck,
  FileClock,
  AlertTriangle,
  HelpCircle,
} as const;

interface TenureBadgeProps {
  tenure?: TenureType | null;
  className?: string;
  size?: 'sm' | 'md';
}

export function TenureBadge({ tenure, className, size = 'sm' }: TenureBadgeProps) {
  const key: TenureType = tenure && tenure in TENURE_CONFIG ? tenure : 'unsure';
  const config = TENURE_CONFIG[key];
  const Icon = ICON_MAP[config.icon as keyof typeof ICON_MAP] || HelpCircle;

  return (
    <Badge
      className={cn(
        'border-0 font-medium gap-1',
        size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1',
        className
      )}
      style={{
        backgroundColor: config.bg,
        color: config.text,
      }}
    >
      <Icon className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'} />
      {config.label}
    </Badge>
  );
}
