"use client";

import dynamic from "next/dynamic";
import type { StoreLocation } from "@/types/api";

export type MapPoint = { latitude: number; longitude: number };

type TegalMapProps = {
  stores?: StoreLocation[];
  selectedLocation?: MapPoint | null;
  onLocationSelect?: (point: MapPoint) => void;
  height?: string;
};

const TegalMapCanvas = dynamic(() => import("@/components/tegal-map-canvas"), {
  ssr: false,
  loading: () => <div role="status" className="flex h-full min-h-72 items-center justify-center bg-brand-light text-sm text-brand-muted">Memuat peta...</div>,
});

export function TegalMap(props: TegalMapProps) {
  return <TegalMapCanvas {...props} />;
}
