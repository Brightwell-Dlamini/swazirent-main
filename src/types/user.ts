// src/types/user.ts
// Ekhaya personas (canonical):
//   seeker   — renter / buyer looking for property
//   landlord — property owner who posts themselves
//   broker   — facilitator hired to find tenants/buyers
//   agent    — licensed / established estate agent
//   admin    — platform admin
// Legacy 'renter' still accepted and normalised to seeker.

export type UserType =
  | 'seeker'
  | 'landlord'
  | 'broker'
  | 'agent'
  | 'admin'
  | 'renter'; // legacy only — normalised to seeker on read

export type CanonicalUserType = 'seeker' | 'landlord' | 'broker' | 'agent' | 'admin';

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
 * Normalises stored role values.
 * - renter → seeker (legacy rename only)
 * - landlord stays landlord (first-class poster role)
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
    case 'agent':
    case 'broker':
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
    case 'landlord':
      return 'Landlord';
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
    case 'landlord':
      return '🏠';
    case 'agent':
      return '🏢';
    case 'broker':
      return '🤝';
    case 'seeker':
      return '🔍';
    default:
      return '👤';
  }
};

/** Roles allowed to post listings (phone verification still required to publish) */
export const canPostListings = (userType: UserType | null): boolean => {
  const t = normalizeUserType(userType);
  return t === 'landlord' || t === 'agent' || t === 'broker' || t === 'admin';
};

/** Poster roles that may need verification */
export const isPosterRole = (userType: UserType | null): boolean => {
  const t = normalizeUserType(userType);
  return t === 'landlord' || t === 'agent' || t === 'broker';
};

/** Seeker (includes legacy renter) */
export const isSeekerRole = (userType: UserType | null): boolean => {
  return normalizeUserType(userType) === 'seeker';
};

/** All filterable roles for admin UI */
export const ADMIN_USER_TYPE_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'All users' },
  { value: 'seeker', label: 'Seekers' },
  { value: 'landlord', label: 'Landlords' },
  { value: 'broker', label: 'Brokers' },
  { value: 'agent', label: 'Agents' },
  { value: 'admin', label: 'Admins' },
  { value: 'renter', label: 'Renters (legacy)' },
];
