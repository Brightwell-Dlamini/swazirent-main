// src/app/dashboard/admin/verify/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getUserTypeLabel, isPosterRole } from '@/types/user';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  CheckCircle,
  XCircle,
  Loader2,
  Users,
  Clock,
  AlertCircle,
  Shield,
  UserCheck,
  UserX,
  RefreshCw,
  ChevronLeft,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PosterProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  user_type: string;
  is_verified: boolean;
  verification_level: string | null;
  created_at: string;
  property_count: number;
}

const POSTER_TYPES = ['landlord', 'broker', 'agent'];

export default function AdminVerificationPage() {
  const { user, userType, isLoading } = useAuth();
  const router = useRouter();
  const [posters, setPosters] = useState<PosterProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('unverified');

  useEffect(() => {
    if (!isLoading && userType !== 'admin') {
      router.push('/dashboard');
      toast.error('Access denied. Admin only.');
    }
  }, [userType, isLoading, router]);

  const fetchPosters = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(
          `id, email, full_name, phone, user_type, is_verified, verification_level, created_at,
           properties:properties(count)`
        )
        .in('user_type', POSTER_TYPES)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPosters(
        (data || []).map((item: any) => ({
          ...item,
          property_count: item.properties?.[0]?.count || 0,
        }))
      );
    } catch (error) {
      console.error('Error fetching posters:', error);
      toast.error('Failed to load accounts for verification');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleVerify = async (userId: string, action: 'verify' | 'reject') => {
    setProcessing(userId);
    try {
      const now = new Date().toISOString();
      const updateData =
        action === 'verify'
          ? {
              is_verified: true,
              verification_level: 'verified',
              verified_by: user?.id,
              verified_at: now,
              updated_at: now,
            }
          : {
              is_verified: false,
              verification_level: 'rejected',
              verified_by: user?.id,
              verified_at: now,
              updated_at: now,
            };

      const { error } = await supabase.from('profiles').update(updateData).eq('id', userId);
      if (error) throw error;

      toast.success(`Account ${action === 'verify' ? 'verified' : 'rejected'} successfully`);
      await fetchPosters();
    } catch (error) {
      console.error('Error updating verification:', error);
      toast.error('Failed to update verification status');
    } finally {
      setProcessing(null);
    }
  };

  useEffect(() => {
    if (userType === 'admin') fetchPosters();
  }, [userType, fetchPosters]);

  if (isLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center min-h-[400px] items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const stats = {
    total: posters.length,
    verified: posters.filter((l) => l.is_verified).length,
    unverified: posters.filter((l) => !l.is_verified && l.verification_level !== 'rejected').length,
    rejected: posters.filter((l) => l.verification_level === 'rejected').length,
  };

  const filtered = posters.filter((l) => {
    if (activeTab === 'verified') return l.is_verified;
    if (activeTab === 'unverified') return !l.is_verified && l.verification_level !== 'rejected';
    if (activeTab === 'rejected') return l.verification_level === 'rejected';
    return true;
  });

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
        <div>
          <Button variant="ghost" size="sm" className="mb-2 -ml-2" asChild>
            <LinkBack />
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Shield className="h-7 w-7 text-primary" />
            Poster verification
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Verify landlords, brokers, and agents
          </p>
        </div>
        <Button onClick={fetchPosters} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total posters" value={stats.total} />
        <StatCard label="Verified" value={stats.verified} tone="green" />
        <StatCard label="Pending" value={stats.unverified} tone="amber" />
        <StatCard label="Rejected" value={stats.rejected} tone="red" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="w-full h-auto flex flex-wrap gap-1">
          <TabsTrigger value="all" className="flex-1 min-w-[4rem]">All ({stats.total})</TabsTrigger>
          <TabsTrigger value="unverified" className="flex-1 min-w-[4rem]">Pending ({stats.unverified})</TabsTrigger>
          <TabsTrigger value="verified" className="flex-1 min-w-[4rem]">Verified ({stats.verified})</TabsTrigger>
          <TabsTrigger value="rejected" className="flex-1 min-w-[4rem]">Rejected ({stats.rejected})</TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">No accounts found</h2>
            <p className="text-muted-foreground">Nothing in this category.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((poster) => {
            const isVerified = poster.is_verified;
            const level = poster.verification_level;
            let statusClass =
              'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
            let statusLabel = 'Pending';
            if (isVerified) {
              statusClass =
                'bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30';
              statusLabel = 'Verified';
            } else if (level === 'rejected') {
              statusClass = 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30';
              statusLabel = 'Rejected';
            }

            return (
              <Card
                key={poster.id}
                className={
                  !isVerified && level !== 'rejected'
                    ? 'border-amber-500/40 bg-amber-500/5'
                    : 'bg-card'
                }
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate">{poster.full_name || 'Unknown'}</h3>
                        <Badge variant="outline">{getUserTypeLabel(poster.user_type as any)}</Badge>
                        <Badge className={statusClass}>{statusLabel}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{poster.email}</p>
                      {poster.phone && (
                        <p className="text-sm text-muted-foreground">{poster.phone}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Joined {new Date(poster.created_at).toLocaleDateString()} ·{' '}
                        {poster.property_count} listing(s)
                      </p>
                    </div>
                    <div className="flex sm:flex-col gap-2 shrink-0">
                      {(!isVerified || level === 'rejected') && (
                        <Button
                          size="sm"
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleVerify(poster.id, 'verify')}
                          disabled={processing === poster.id}
                        >
                          {processing === poster.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="mr-1 h-4 w-4" /> Verify
                            </>
                          )}
                        </Button>
                      )}
                      {isVerified && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 dark:text-red-400"
                          onClick={() => {
                            if (confirm(`Revoke verification for ${poster.full_name || 'this account'}?`)) {
                              handleVerify(poster.id, 'reject');
                            }
                          }}
                          disabled={processing === poster.id}
                        >
                          <XCircle className="mr-1 h-4 w-4" /> Revoke
                        </Button>
                      )}
                      {!isVerified && level !== 'rejected' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1"
                          onClick={() => {
                            if (confirm(`Reject ${poster.full_name || 'this account'}?`)) {
                              handleVerify(poster.id, 'reject');
                            }
                          }}
                          disabled={processing === poster.id}
                        >
                          <XCircle className="mr-1 h-4 w-4" /> Reject
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LinkBack() {
  return (
    <Link href="/dashboard/admin" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
      <ChevronLeft className="h-4 w-4 mr-0.5" /> Back to admin
    </Link>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'green' | 'amber' | 'red';
}) {
  const toneClass =
    tone === 'green'
      ? 'border-green-500/30 bg-green-500/10'
      : tone === 'amber'
        ? 'border-amber-500/30 bg-amber-500/10'
        : tone === 'red'
          ? 'border-red-500/30 bg-red-500/10'
          : 'bg-card';
  const valueClass =
    tone === 'green'
      ? 'text-green-600 dark:text-green-400'
      : tone === 'amber'
        ? 'text-amber-600 dark:text-amber-400'
        : tone === 'red'
          ? 'text-red-600 dark:text-red-400'
          : '';
  return (
    <Card className={toneClass}>
      <CardContent className="p-3 sm:p-4">
        <p className="text-xs sm:text-sm text-muted-foreground">{label}</p>
        <p className={`text-xl sm:text-2xl font-bold ${valueClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

// fix missing imports used above
import Link from 'next/link';
import { getUserTypeLabel } from '@/types/user';

function LinkBack() {
  return (
    <Link href="/dashboard/admin" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
      <ChevronLeft className="h-4 w-4 mr-0.5" /> Back to admin
    </Link>
  );
}

// re-declare fetch alias used earlier in broken draft - keep compile clean by real names only
