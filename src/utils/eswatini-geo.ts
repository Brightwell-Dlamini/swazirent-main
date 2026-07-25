// Approximate centroids for Eswatini towns (used when property has no lat/lng)
export const CITY_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  Mbabane: { lat: -26.3054, lng: 31.1367 },
  Manzini: { lat: -26.4988, lng: 31.3800 },
  Matsapha: { lat: -26.5280, lng: 31.3070 },
  Ezulwini: { lat: -26.4100, lng: 31.1750 },
  Lobamba: { lat: -26.4667, lng: 31.2000 },
  Nhlangano: { lat: -27.1122, lng: 31.1983 },
  'Piggs Peak': { lat: -25.9658, lng: 31.2464 },
  Siteki: { lat: -26.4500, lng: 31.9500 },
  'Big Bend': { lat: -26.8167, lng: 31.9333 },
  Kwaluseni: { lat: -26.4833, lng: 31.3333 },
  Hlatikulu: { lat: -26.9667, lng: 31.3167 },
  Mhlume: { lat: -26.0333, lng: 31.8500 },
  Simunye: { lat: -26.2000, lng: 31.9167 },
};

/** Country center + default zoom */
export const ESWATINI_CENTER = { lat: -26.5, lng: 31.5 };
export const ESWATINI_DEFAULT_ZOOM = 8;

export function resolveCoordinates(
  latitude?: number | null,
  longitude?: number | null,
  city?: string | null
): { lat: number; lng: number; approximate: boolean } {
  if (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    !Number.isNaN(latitude) &&
    !Number.isNaN(longitude)
  ) {
    return { lat: latitude, lng: longitude, approximate: false };
  }
  if (city) {
    const key = Object.keys(CITY_CENTROIDS).find(
      (k) => k.toLowerCase() === city.toLowerCase()
    );
    if (key) {
      const c = CITY_CENTROIDS[key];
      // Slight jitter so stacked pins separate
      const jitter = (Math.random() - 0.5) * 0.02;
      return { lat: c.lat + jitter, lng: c.lng + jitter, approximate: true };
    }
  }
  return { ...ESWATINI_CENTER, approximate: true };
}
