// src/types/user.ts
// Ekhaya personas:
//   seeker   — renter / buyer looking for property (UI label: "Renter/Buyer")
//   landlord — property owner who posts themselves
//   broker   — facilitator hired to find tenants/buyers
//   agent    — licensed / established estate agent
//   admin    — platform admin
// Legacy 'renter' normalises to seeker on read only.

export type UserType =
  | 'seeker'
  | 'landlord'
  | 'broker'
  | 'agent'
  | 'admin'
  | 'renter'; // legacy only

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

/** renter → seeker only; landlord stays landlord */
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

/** UI-facing label — seeker shows as Renter/Buyer */
export const getUserTypeLabel = (userType: UserType | null | string): string => {
  const t = normalizeUserType(userType as UserType);
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
      return 'Renter/Buyer';
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

export const canPostListings = (userType: UserType | null): boolean => {
  const t = normalizeUserType(userType);
  return t === 'landlord' || t === 'agent' || t === 'broker' || t === 'admin';
};

export const isPosterRole = (userType: UserType | null | string): boolean => {
  const t = normalizeUserType(userType as UserType);
  return t === 'landlord' || t === 'agent' || t === 'broker';
};

export const isSeekerRole = (userType: UserType | null): boolean => {
  return normalizeUserType(userType) === 'seeker';
};

export const ADMIN_USER_TYPE_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'All users' },
  { value: 'seeker', label: 'Renters/Buyers' },
  { value: 'landlord', label: 'Landlords' },
  { value: 'broker', label: 'Brokers' },
  { value: 'agent', label: 'Agents' },
  { value: 'admin', label: 'Admins' },
  { value: 'renter', label: 'Renters (legacy)' },
];

export const ASSIGNABLE_ROLES: { value: UserType; label: string }[] = [
  { value: 'seeker', label: 'Renter/Buyer' },
  { value: 'landlord', label: 'Landlord' },
  { value: 'broker', label: 'Broker' },
  { value: 'agent', label: 'Agent' },
  { value: 'admin', label: 'Admin' },
];

export const POSTER_USER_TYPES = ['landlord', 'broker', 'agent'] as const;

/** localStorage key used to pass role through Google OAuth */
export const PENDING_USER_TYPE_KEY = 'ekhaya_pending_user_type';
