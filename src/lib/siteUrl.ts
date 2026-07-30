// src/lib/siteUrl.ts

/**
 * Canonical origin for OAuth redirects.
 * Prefer the browser origin so production never sends users to localhost.
 * Optional override: NEXT_PUBLIC_SITE_URL or NEXT_PUBLIC_APP_URL (no trailing slash).
 */
export function getSiteOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    // Never trust a localhost origin when the page was somehow mixed;
    // still use what the user is actually on — that's the correct domain.
    return window.location.origin.replace(/\/$/, '');
  }

  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    '';

  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }

  // Vercel system env (server only; not always available as NEXT_PUBLIC_)
  const vercel = process.env.VERCEL_URL;
  if (vercel) {
    return `https://${vercel.replace(/\/$/, '')}`;
  }

  return '';
}

export function getAuthCallbackUrl(): string {
  const origin = getSiteOrigin();
  return origin ? `${origin}/auth/callback` : '/auth/callback';
}
