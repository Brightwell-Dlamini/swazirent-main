// src/components/ui/SuccessCheck.tsx
'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Calm, confetti-free success mark — Apple-level restraint */
export function SuccessCheck({
  className,
  size = 'md',
  label,
}: {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}) {
  const box =
    size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-14 w-14' : 'h-11 w-11';
  const icon = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-7 w-7' : 'h-5 w-5';

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div
        className={cn(
          box,
          'rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
          'flex items-center justify-center',
          'animate-in zoom-in-50 fade-in duration-300'
        )}
      >
        <Check className={cn(icon, 'stroke-[2.5]')} aria-hidden />
      </div>
      {label && (
        <p className="text-sm font-medium text-foreground text-center">{label}</p>
      )}
    </div>
  );
}
