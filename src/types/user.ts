// src/types/user.ts
export type UserType = 'renter' | 'landlord' | 'admin';

export const isValidUserType = (type: string | null | undefined): type is UserType => {
  return type === 'renter' || type === 'landlord' || type === 'admin';
};

export const getDefaultRedirect = (userType: UserType | null): string => {
  switch (userType) {
    case 'admin':
      return '/dashboard/admin';
    case 'landlord':
      return '/dashboard/landlord';
    case 'renter':
      return '/dashboard/renter';
    default:
      return '/dashboard/renter'; // Safe default
  }
};

export const getDefaultUserType = (): UserType => 'renter';

export const getUserTypeLabel = (userType: UserType | null): string => {
  switch (userType) {
    case 'admin':
      return 'Administrator';
    case 'landlord':
      return 'Landlord';
    case 'renter':
      return 'Renter';
    default:
      return 'User';
  }
};

export const getUserTypeIcon = (userType: UserType | null): string => {
  switch (userType) {
    case 'admin':
      return '👑';
    case 'landlord':
      return '🏠';
    case 'renter':
      return '🔍';
    default:
      return '👤';
  }
};
