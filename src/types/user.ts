// src/types/user.ts
// Ekhaya hybrid model — roles aligned with DOC-001 / DOC-005
// Mapping: former 'renter' → 'seeker', former 'landlord' split into 'broker' | 'agent'

export type UserType = 'seeker' | 'agent' | 'broker' | 'admin';

/** Legacy values that may still exist in the database during migration */
export type LegacyUserType = 'renter' | 'landlord' | UserType;

export const isValidUserType = (type: string | null | undefined): type is UserType => {
  return type === 'seeker' || type === 'agent' || type === 'broker' || type === 'admin';
};

/**
 * Normalises any stored role (including legacy values) to the canonical UserType.
 * - renter  → seeker
 * - landlord → broker  (default split; agents will be explicitly set later)
 */
export const normalizeUserType = (type: string | null | undefined): UserType => {
  if (!type) return 'seeker';
  if (type === 'renter') return 'seeker';
  if (type === 'landlord') return 'broker';
  if (isValidUserType(type)) return type;
  return 'seeker';
};

export const getDefaultRedirect = (userType: UserType | null): string => {
  switch (userType) {
    case 'admin':
      return '/dashboard/admin';
    case 'agent':
      return '/dashboard/agent';          // future agent dashboard route
    case 'broker':
      return '/dashboard/landlord';       // reuse existing landlord dashboard for brokers
    case 'seeker':
      return '/dashboard/renter';         // reuse existing renter dashboard
    default:
      return '/dashboard/renter';
  }
};

export const getDefaultUserType = (): UserType => 'seeker';

export const getUserTypeLabel = (userType: UserType | null): string => {
  switch (userType) {
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
  switch (userType) {
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
  return userType === 'agent' || userType === 'broker' || userType === 'admin';
};
