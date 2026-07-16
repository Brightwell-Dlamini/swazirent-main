// src/app/dashboard/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const { user, userType, isLoading, redirectToDashboard } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/auth/login');
        return;
      }

      // Redirect to specific dashboard based on user type
      if (userType) {
        redirectToDashboard();
      } else {
        // If no userType, default to renter
        console.warn('User has no userType, defaulting to renter');
        router.push('/dashboard/renter');
      }
    }
  }, [user, userType, isLoading, redirectToDashboard, router]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-center items-center min-h-100">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    </div>
  );
}
