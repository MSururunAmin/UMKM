"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { LeafletContext, createLeafletContext, type LeafletContextInterface } from "@react-leaflet/core";
import { Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import * as L from "leaflet";
import type { MapPoint } from "@/components/tegal-map";
import type { StoreLocation } from "@/types/api";

const tegalCenter: [number, number] = [-6.8797, 109.1256];
const markerIcon = L.divIcon({
  className: "",
  html: '<span class="rasa-map-marker"><span></span></span>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

type TegalMapCanvasProps = {
  stores?: StoreLocation[];
  selectedLocation?: MapPoint | null;
  onLocationSelect?: (point: MapPoint) => void;
  height?: string;
};

type StrictModeSafeMapContainerProps = {
  center: [number, number];
  zoom: number;
  className: string;
  children: ReactNode;
};

function StrictModeSafeMapContainer({ center, zoom, className, children }: StrictModeSafeMapContainerProps) {
  const [context, setContext] = useState<LeafletContextInterface | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const removalTimerRef = useRef<number | null>(null);
  const [latitude, longitude] = center;

  const setContainer = useCallback((container: HTMLDivElement | null) => {
    if (!container) return;

    if (removalTimerRef.current !== null) {
      window.clearTimeout(removalTimerRef.current);
      removalTimerRef.current = null;
    }

    if (mapRef.current) return;

    const map = L.map(container, { scrollWheelZoom: true });
    map.setView([latitude, longitude], zoom);
    mapRef.current = map;
    setContext(createLeafletContext(map));
  }, [latitude, longitude, zoom]);

  useEffect(() => {
    if (removalTimerRef.current !== null) {
      window.clearTimeout(removalTimerRef.current);
      removalTimerRef.current = null;
    }

    return () => {
      const map = mapRef.current;
      if (!map) return;

      removalTimerRef.current = window.setTimeout(() => {
        if (mapRef.current === map) {
          map.remove();
          mapRef.current = null;
        }
        removalTimerRef.current = null;
      }, 0);
    };
  }, []);

  return (
    <div ref={setContainer} className={className}>
      {context && <LeafletContext.Provider value={context}>{children}</LeafletContext.Provider>}
    </div>
  );
}

function MapClickHandler({ onLocationSelect }: { onLocationSelect?: TegalMapCanvasProps["onLocationSelect"] }) {
  useMapEvents({
    click(event) {
      onLocationSelect?.({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    },
  });
  return null;
}

function MapViewport({ location }: { location: MapPoint | null }) {
  const map = useMap();
  const latitude = location?.latitude;
  const longitude = location?.longitude;

  useEffect(() => {
    if (latitude !== undefined && longitude !== undefined) {
      map.setView([latitude, longitude], Math.max(map.getZoom(), 18));
    }
  }, [latitude, longitude, map]);

  return null;
}

export default function TegalMapCanvas({
  stores = [],
  selectedLocation = null,
  onLocationSelect,
  height = "24rem",
}: TegalMapCanvasProps) {
  const [tileError, setTileError] = useState(false);
  const tileUrl = process.env.NEXT_PUBLIC_MAP_TILE_URL
    ?? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const attribution = process.env.NEXT_PUBLIC_MAP_ATTRIBUTION
    ?? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  return (
    <div className="relative isolate z-0 w-full overflow-hidden rounded-2xl border border-brand-border bg-brand-light" style={{ height }}>
      <StrictModeSafeMapContainer
        center={selectedLocation ? [selectedLocation.latitude, selectedLocation.longitude] : tegalCenter}
        zoom={12}
        className="h-full w-full"
      >
        <MapViewport location={selectedLocation} />
        <TileLayer url={tileUrl} attribution={attribution} eventHandlers={{ tileerror: () => setTileError(true) }} />
        <MapClickHandler onLocationSelect={onLocationSelect} />
        {stores.filter(hasCoordinates).map((store) => (
          <Marker
            key={store.id}
            position={[store.latitude, store.longitude]}
            icon={markerIcon}
          >
            <Popup>
              <div className="max-w-56 text-sm">
                <p className="font-bold text-stone-900">{store.store_name}</p>
                <p className="mt-1 text-stone-600">{store.address}</p>
                <Link className="mt-2 inline-block font-semibold text-emerald-800" href={`/stores/${store.slug}`}>
                  Lihat toko
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
        {selectedLocation && (
          <Marker position={[selectedLocation.latitude, selectedLocation.longitude]} icon={markerIcon}>
            <Popup>Titik lokasi toko yang dipilih</Popup>
          </Marker>
        )}
      </StrictModeSafeMapContainer>
      {tileError && <p role="alert" className="absolute left-2 top-2 z-[1000] rounded-lg bg-white/95 px-3 py-2 text-xs text-red-700 shadow">Sebagian ubin peta tidak dapat dimuat. Coba muat ulang halaman.</p>}
    </div>
  );
}

function hasCoordinates(store: StoreLocation): store is StoreLocation & { latitude: number; longitude: number } {
  return typeof store.latitude === "number"
    && Number.isFinite(store.latitude)
    && typeof store.longitude === "number"
    && Number.isFinite(store.longitude);
}
