// src/lib/avatar.ts

/** Initials from full name (preferred) or email fallback */
export function getNameInitials(
  fullName?: string | null,
  email?: string | null
): string {
  const name = (fullName || '').trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email) {
    const local = email.split('@')[0] || '';
    return local.slice(0, 2).toUpperCase() || 'U';
  }
  return 'U';
}
