// src/types/user.ts
// Ekhaya hybrid model — roles aligned with DOC-001 / DOC-005
// Mapping: former 'renter' → 'seeker', former 'landlord' split into 'broker' | 'agent'
// Legacy values remain on the union so existing pages still type-check until fully migrated.

export type UserType =
  | 'seeker'
  | 'agent'
  | 'broker'
  | 'admin'
  | 'landlord' // legacy — treat as broker/poster
  | 'renter'; // legacy — treat as seeker

export type LegacyUserType = UserType;

export const isValidUserType = (type: string | null | undefined): type is UserType => {
  return (
    type === 'seeker' ||
    type === 'agent' ||
    type === 'broker' ||
    type === 'admin' ||
    type === 'landlord' ||
    type === 'renter'
  );
};

/**
 * Normalises any stored role (including legacy values) to the preferred canonical set.
 * - renter  → seeker
 * - landlord → broker
 * Prefer calling this when writing to the DB or deciding redirects.
 */
export const normalizeUserType = (type: string | null | undefined): UserType => {
  if (!type) return 'seeker';
  if (type === 'renter') return 'seeker';
  if (type === 'landlord') return 'broker';
  if (isValidUserType(type)) return type;
  return 'seeker';
};

export const getDefaultRedirect = (userType: UserType | null): string => {
  const t = normalizeUserType(userType);
  switch (t) {
    case 'admin':
      return '/dashboard/admin';
    case 'agent':
      return '/dashboard/landlord'; // reuse landlord dashboard until agent route exists
    case 'broker':
      return '/dashboard/landlord';
    case 'seeker':
      return '/dashboard/renter';
    default:
      return '/dashboard/renter';
  }
};

export const getDefaultUserType = (): UserType => 'seeker';

export const getUserTypeLabel = (userType: UserType | null): string => {
  const t = normalizeUserType(userType);
  switch (t) {
    case 'admin':
      return 'Administrator';
    case 'agent':
      return 'Agent';
    case 'broker':
      return 'Broker';
    case 'seeker':
      return 'Seeker';
    default:
      return 'User';
  }
};

export const getUserTypeIcon = (userType: UserType | null): string => {
  const t = normalizeUserType(userType);
  switch (t) {
    case 'admin':
      return '👑';
    case 'agent':
      return '🏢';
    case 'broker':
      return '🏠';
    case 'seeker':
      return '🔍';
    default:
      return '👤';
  }
};

/** Roles that are allowed to post listings (must also pass phone verification) */
export const canPostListings = (userType: UserType | null): boolean => {
  const t = normalizeUserType(userType);
  return t === 'agent' || t === 'broker' || t === 'admin';
};
