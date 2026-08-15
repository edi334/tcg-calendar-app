export function formatDistanceKm(km: number | null): string | null {
  if (km == null) return null;
  return km >= 10 ? `${Math.round(km)} km away` : `${km.toFixed(1)} km away`;
}
