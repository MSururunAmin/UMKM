"use client";

import { useState } from "react";
import { CheckCircle2, MapPin } from "lucide-react";
import { TegalMap, type MapPoint } from "@/components/tegal-map";
import { AddressLocationSearch, type AddressSearchResult } from "@/components/address-location-search";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-error";
import type { Merchant } from "@/types/api";

type MerchantLocationFormProps = {
  merchant: Merchant;
  onSaved: (merchant: Merchant) => void;
};

type ResolvedLocation = Pick<Merchant, "province" | "regency" | "district" | "village">;

export function MerchantLocationForm({ merchant, onSaved }: MerchantLocationFormProps) {
  const [address, setAddress] = useState(merchant.address);
  const [point, setPoint] = useState<MapPoint | null>(
    merchant.latitude != null && merchant.longitude != null
      ? { latitude: merchant.latitude, longitude: merchant.longitude }
      : null,
  );
  const [location, setLocation] = useState<ResolvedLocation>(
    merchant.location_checked_at
      ? {
          province: merchant.province,
          regency: merchant.regency,
          district: merchant.district,
          village: merchant.village,
        }
      : {},
  );
  const [isResolving, setIsResolving] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [addressEdited, setAddressEdited] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const resolvePoint = async () => {
    if (!point) {
      setError("Pilih titik lokasi toko pada peta terlebih dahulu.");
      return;
    }

    setIsResolving(true);
    setError("");
    setNotice("");
    setLocation({});
    try {
      const response = await api.post<{ data: ResolvedLocation }>("/seller/location/resolve", point);
      setLocation(response.data.data);
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, "Lokasi toko gagal diperbarui. Silakan coba lagi."));
    } finally {
      setIsResolving(false);
    }
  };

  const saveLocation = async () => {
    if (!point || !location.province || !location.regency || !location.village) {
      setError("Pilih titik pada peta lalu cek wilayahnya sebelum menyimpan.");
      return;
    }
    if (!address.trim()) {
      setError("Alamat lengkap toko wajib diisi.");
      return;
    }

    setIsSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await api.put<{ data: Merchant }>("/merchant/my-store", {
        address,
        ...location,
        latitude: point.latitude,
        longitude: point.longitude,
      });
      onSaved(response.data.data);
      setNotice("Lokasi toko berhasil diperiksa dan diperbarui. Menu yang memenuhi syarat akan tampil di katalog.");
    } catch (requestError: unknown) {
      setError(getApiErrorMessage(requestError, "Lokasi toko gagal diperbarui. Silakan coba lagi."));
    } finally {
      setIsSaving(false);
    }
  };

  const selectAddressResult = (result: AddressSearchResult) => {
    setPoint({ latitude: result.latitude, longitude: result.longitude });
    setLocation({
      province: result.province,
      regency: result.regency,
      district: result.district,
      village: result.village,
    });
    setError("");
    setNotice("");
  };

  return (
    <section aria-label="Lokasi toko" className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <MapPin size={19} className="mt-0.5 shrink-0 text-amber-800" />
        <div>
          <h2 className="font-bold text-amber-950">
            {merchant.location_checked_at ? "Perbarui lokasi toko" : "Lengkapi lokasi agar menu dapat ditemukan"}
          </h2>
          <p className="mt-1 text-sm leading-6 text-amber-900">
            {merchant.location_checked_at
              ? "Pilih titik toko yang sebenarnya jika lokasi usaha berubah."
              : "Toko Anda sudah disetujui, tetapi belum memiliki lokasi Tegal yang diperiksa. Menu belum ditampilkan di katalog publik sampai lokasi dilengkapi."}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4">
        <div>
          <label htmlFor="merchant-location-address" className="mb-1.5 block text-sm font-semibold text-stone-800">Alamat lengkap toko</label>
          <Input id="merchant-location-address" value={address} onChange={(event) => {
            setAddress(event.target.value);
            setAddressEdited(true);
            setPoint(null);
            setLocation({});
            setError("");
            setNotice("");
          }} maxLength={2000} />
          <AddressLocationSearch address={address} enabled={addressEdited} onLocationSelect={selectAddressResult} />
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-stone-800">Pilih titik lokasi toko yang sebenarnya</p>
          <TegalMap selectedLocation={point} onLocationSelect={(selectedPoint) => {
            setPoint(selectedPoint);
            setLocation({});
            setError("");
            setNotice("");
          }} height="20rem" />
          <p className="mt-2 text-xs text-stone-600">
            {point
              ? `Koordinat: ${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`
              : "Klik peta untuk menentukan lokasi."}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" onClick={() => void resolvePoint()} disabled={!point || isResolving || isSaving}>
            {isResolving ? "Memeriksa wilayah..." : "Periksa wilayah"}
          </Button>
          <Button type="button" onClick={() => void saveLocation()} disabled={!point || !location.regency || isResolving || isSaving}>
            {isSaving ? "Menyimpan..." : "Simpan lokasi toko"}
          </Button>
        </div>

        {location.regency && (
          <p role="status" className="flex items-center gap-2 text-sm font-medium text-emerald-800">
            <CheckCircle2 size={17} />{[location.village, location.district, location.regency, location.province].filter(Boolean).join(", ")}
          </p>
        )}
        {error && <p role="alert" className="rounded-lg bg-red-100 p-3 text-sm text-red-800">{error}</p>}
        {notice && <p role="status" className="rounded-lg bg-emerald-100 p-3 text-sm text-emerald-900">{notice}</p>}
      </div>
    </section>
  );
}
