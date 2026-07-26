// src/types/user.ts
// Ekhaya personas (DOC-aligned + product decision):
//   seeker   — renter / buyer
//   landlord — property owner who lists themselves
//   broker   — facilitator hired to find tenants
//   agent    — professional estate agent
//   admin    — platform operator
// Legacy: 'renter' reads as seeker. 'landlord' is canonical (not mapped away).

export type UserType =
  | 'seeker'
  | 'landlord'
  | 'broker'
  | 'agent'
  | 'admin'
  | 'renter'; // legacy only — normalize to seeker

export type PosterRole = 'landlord' | 'broker' | 'agent' | 'admin';

export type LegacyUserType = UserType;

export const POSTER_ROLES: UserType[] = ['landlord', 'broker', 'agent', 'admin'];

export const isValidUserType = (type: string | null | undefined): type is UserType => {
  return (
    type === 'seeker' ||
    type === 'landlord' ||
    type === 'broker' ||
    type === 'agent' ||
    type === 'admin' ||
    type === 'renter'
  );
};

/**
 * Normalise stored roles.
 * - renter → seeker (legacy only)
 * - landlord stays landlord (first-class)
 */
export const normalizeUserType = (type: string | null | undefined): UserType => {
  if (!type) return 'seeker';
  if (type === 'renter') return 'seeker';
  if (isValidUserType(type)) return type;
  return 'seeker';
};

export const getDefaultRedirect = (userType: UserType | null): string => {
  const t = normalizeUserType(userType);
  switch (t) {
    case 'admin':
      return '/dashboard/admin';
    case 'landlord':
    case 'broker':
    case 'agent':
      return '/dashboard/landlord';
    case 'seeker':
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
    case 'landlord':
      return 'Landlord';
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
      return '🤝';
    case 'landlord':
      return '🏠';
    case 'seeker':
      return '🔍';
    default:
      return '👤';
  }
};

/** Roles allowed to post listings (phone verification still required to publish) */
export const canPostListings = (userType: UserType | null): boolean => {
  const t = normalizeUserType(userType);
  return t === 'landlord' || t === 'broker' || t === 'agent' || t === 'admin';
};

/** Seeker (includes legacy renter) */
export const isSeekerRole = (userType: UserType | null): boolean => {
  return normalizeUserType(userType) === 'seeker';
};

/** Poster roles that need admin verification */
export const isPosterRole = (userType: UserType | null): boolean => {
  const t = normalizeUserType(userType);
  return t === 'landlord' || t === 'broker' || t === 'agent';
};
