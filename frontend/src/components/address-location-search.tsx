"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";
import type { Merchant } from "@/types/api";
import type { MapPoint } from "@/components/tegal-map";

export type AddressSearchResult = MapPoint & Pick<Merchant, "province" | "regency" | "district" | "village"> & {
  display_name: string;
};

type AddressLocationSearchProps = {
  address: string;
  enabled: boolean;
  onLocationSelect: (result: AddressSearchResult) => void;
};

export function AddressLocationSearch({ address, enabled, onLocationSelect }: AddressLocationSearchProps) {
  const [results, setResults] = useState<AddressSearchResult[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const onLocationSelectRef = useRef(onLocationSelect);
  const requestIdRef = useRef(0);

  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect;
  }, [onLocationSelect]);

  const searchAddress = useCallback(async (signal?: AbortSignal) => {
    const query = address.trim();
    if (query.length < 8) {
      setResults([]);
      setStatus("");
      setError("Tulis alamat minimal 8 karakter agar dapat dicari.");
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsSearching(true);
    setError("");
    setStatus("");
    try {
      const response = await api.post<{ data: AddressSearchResult[] }>(
        "/seller/location/search",
        { address: query },
        { signal },
      );
      if (requestId !== requestIdRef.current) return;
      if (response.data.data.length === 1) {
        onLocationSelectRef.current(response.data.data[0]);
        setResults([]);
        setStatus("Pin peta otomatis dipindahkan ke alamat yang ditemukan. Pastikan titiknya sesuai lokasi toko.");
      } else {
        setResults(response.data.data);
        setStatus("Pilih hasil alamat yang paling sesuai agar pin peta berpindah ke sana.");
      }
    } catch (requestError: unknown) {
      if (axios.isCancel(requestError) || requestId !== requestIdRef.current) return;
      setResults([]);
      setError(getApiErrorMessage(requestError, "Alamat belum bisa dicari. Silakan coba lagi."));
    } finally {
      if (requestId === requestIdRef.current) setIsSearching(false);
    }
  }, [address]);

  useEffect(() => {
    if (!enabled || address.trim().length < 8) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => void searchAddress(controller.signal), 1200);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [address, enabled, searchAddress]);

  return (
    <div className="mt-2 space-y-2">
      <Button type="button" variant="outline" onClick={() => void searchAddress()} disabled={isSearching || address.trim().length < 8}>
        <Search size={16} />{isSearching ? "Mencari alamat..." : "Cari lokasi dari alamat"}
      </Button>
      {status && <p role="status" className="text-xs text-brand-muted">{status}</p>}
      {error && <p role="status" className="text-xs text-amber-800">{error}</p>}
      {results.length > 0 && (
        <ul aria-label="Hasil pencarian alamat" className="grid gap-2">
          {results.map((result, index) => (
            <li key={`${result.latitude},${result.longitude}`}>
              <button
                type="button"
                onClick={() => {
                  onLocationSelectRef.current(result);
                  setResults([]);
                  setStatus("Pin peta dipindahkan ke alamat pilihan. Periksa kembali titiknya sebelum menyimpan.");
                }}
                className="flex w-full items-start gap-2 rounded-xl border border-brand-border bg-white p-3 text-left text-sm transition hover:border-brand-secondary hover:bg-emerald-50"
              >
                <MapPin size={16} className="mt-0.5 shrink-0 text-brand-forest" />
                <span><strong className="block text-stone-900">Hasil {index + 1}: {result.village}, {result.district}, {result.regency}</strong><span className="mt-1 block text-xs text-brand-muted">{result.display_name}</span></span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
