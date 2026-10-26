type SellerDestination = {
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
};

export function getGoogleMapsDirectionsUrl(destination: SellerDestination): string | null {
  const hasCoordinates = Number.isFinite(destination.latitude)
    && Number.isFinite(destination.longitude)
    && destination.latitude !== null
    && destination.latitude !== undefined
    && destination.longitude !== null
    && destination.longitude !== undefined;
  const target = hasCoordinates
    ? `${destination.latitude},${destination.longitude}`
    : destination.address?.trim();

  if (!target) return null;

  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(target)}`;
}
