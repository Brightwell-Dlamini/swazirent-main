// src/lib/profileRole.ts
// Shared rules for profile role writes so login never clobbers admin.

import { UserType, normalizeUserType } from '@/types/user';

const ELEVATED: UserType[] = ['admin', 'landlord', 'broker', 'agent'];

/**
 * Decide final user_type when writing profiles.
 * - forceRole (signup): always use requested role
 * - otherwise: keep elevated DB role (esp. admin set in SQL)
 */
export function resolveProfileRole(
  requested: string | null | undefined,
  existingDbType: string | null | undefined,
  forceRole = false
): UserType {
  const want = normalizeUserType(requested);
  const have = existingDbType ? normalizeUserType(existingDbType) : null;

  if (forceRole) return want;
  if (have && ELEVATED.includes(have)) return have;
  return want;
}

export function isElevatedRole(type: string | null | undefined): boolean {
  if (!type) return false;
  return ELEVATED.includes(normalizeUserType(type));
}
