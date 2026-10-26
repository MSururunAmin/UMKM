import { MapPin } from "lucide-react";
import { getGoogleMapsDirectionsUrl } from "@/lib/location";

type SellerDirectionsProps = {
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
};

export function SellerDirections({ latitude, longitude, address }: SellerDirectionsProps) {
  const url = getGoogleMapsDirectionsUrl({ latitude, longitude, address });
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-forest px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-secondary"
    >
      <MapPin size={16} /> Petunjuk arah
    </a>
  );
}
