// src/lib/adminModeration.ts
import { supabase } from '@/lib/supabase';

/**
 * Pull a user's inventory off the public site.
 * - Ban: hide active/pending/paused listings + strip featured
 * - Revoke verification: same for public-facing inventory
 * Does not touch taken/rented/rejected (historical) except unfeature.
 */
export async function hideUserListings(landlordId: string): Promise<{
  hiddenCount: number;
  unfeaturedCount: number;
  error?: string;
}> {
  const now = new Date().toISOString();

  const { data: hidden, error: hideError } = await supabase
    .from('properties')
    .update({
      status: 'hidden',
      is_featured: false,
      updated_at: now,
    })
    .eq('landlord_id', landlordId)
    .in('status', ['active', 'pending', 'paused'])
    .select('id');

  if (hideError) {
    return { hiddenCount: 0, unfeaturedCount: 0, error: hideError.message };
  }

  // Strip feature flag on any remaining featured rows (e.g. taken still featured)
  const { data: unfeatured, error: featError } = await supabase
    .from('properties')
    .update({ is_featured: false, updated_at: now })
    .eq('landlord_id', landlordId)
    .eq('is_featured', true)
    .select('id');

  if (featError) {
    return {
      hiddenCount: hidden?.length || 0,
      unfeaturedCount: 0,
      error: featError.message,
    };
  }

  return {
    hiddenCount: hidden?.length || 0,
    unfeaturedCount: unfeatured?.length || 0,
  };
}
