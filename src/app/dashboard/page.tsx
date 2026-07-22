// src/app/dashboard/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function DashboardRedirect() {
  const { user, userType, isLoading, isInitialized } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isInitialized || isLoading) return;

    if (!user) {
      router.push('/auth/login');
      return;
    }

    switch (userType) {
      case 'admin':
        router.push('/dashboard/admin');
        break;
      case 'landlord':
        router.push('/dashboard/landlord');
        break;
      case 'renter':
      default:
        router.push('/dashboard/renter');
        break;
    }
  }, [user, userType, isLoading, isInitialized, router]);

  return (
    <div className="flex justify-center items-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
