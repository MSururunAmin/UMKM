"use client";

import { useState } from "react";
import {
  Check,
  CheckCircle2,
  Circle,
  Compass,
  LocateFixed,
  MapPin,
  MapPinned,
} from "lucide-react";
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
  const [isLocating, setIsLocating] = useState(false);
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

  const locateDevice = () => {
    if (!navigator.geolocation) {
      setError("Peramban ini tidak mendukung deteksi lokasi. Silakan pilih titik pada peta.");
      return;
    }

    setIsLocating(true);
    setError("");
    setNotice("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPoint({ latitude: coords.latitude, longitude: coords.longitude });
        setLocation({});
        setIsLocating(false);
        setNotice("Lokasi perangkat ditemukan. Pastikan titiknya sesuai dengan lokasi toko.");
      },
      (locationError) => {
        setIsLocating(false);
        setError(
          locationError.code === locationError.PERMISSION_DENIED
            ? "Izin lokasi ditolak. Aktifkan izin lokasi atau pilih titik langsung pada peta."
            : locationError.code === locationError.TIMEOUT
              ? "Deteksi lokasi memerlukan waktu terlalu lama. Silakan coba lagi atau pilih titik pada peta."
              : "Lokasi perangkat tidak dapat ditemukan. Silakan pilih titik pada peta.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  const addressComplete = Boolean(address.trim());
  const pointComplete = Boolean(point);
  const regionComplete = Boolean(location.province && location.regency && location.village);
  const completedSteps = [addressComplete, pointComplete, regionComplete].filter(Boolean).length;

  return (
    <section aria-label="Lokasi toko" className="mt-6 overflow-hidden rounded-3xl border border-emerald-950/10 bg-white shadow-[0_20px_60px_-36px_rgba(18,61,43,0.42)]">
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 px-5 py-6 text-white sm:px-8 sm:py-8">
        <div aria-hidden="true" className="absolute -right-12 -top-20 size-64 rounded-full border-[36px] border-white/5" />
        <div className="relative flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-amber-200 ring-1 ring-white/15">
            <MapPinned size={23} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">Pengaturan toko</p>
            <h2 className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">
              {merchant.location_checked_at ? "Perbarui lokasi toko" : "Buat toko Anda mudah ditemukan"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50/85">
              {merchant.location_checked_at
                ? "Pastikan alamat dan titik peta tetap sesuai agar pelanggan dapat menemukan toko Anda."
                : "Lengkapi alamat, tandai titik toko, lalu verifikasi wilayah agar menu Anda tampil di katalog publik."}
            </p>
          </div>
        </div>
        <div className="relative mt-6 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-amber-300 transition-all" style={{ width: `${(completedSteps / 3) * 100}%` }} />
          </div>
          <span className="shrink-0 text-xs font-semibold text-emerald-100">{completedSteps}/3 langkah</span>
        </div>
      </div>

      <div className="p-4 sm:p-7">
        <nav aria-label="Langkah pengaturan lokasi toko" className="mb-6 grid grid-cols-3 gap-1 rounded-2xl bg-stone-50 p-1.5 sm:gap-2">
          <a href="#merchant-location-address-section" className="flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-bold text-stone-600 transition hover:bg-white hover:text-emerald-900 hover:shadow-sm sm:gap-2 sm:text-sm">
            {addressComplete ? <Check size={15} className="text-emerald-700" /> : <Circle size={15} />}
            <span>Alamat</span>
          </a>
          <a href="#merchant-location-map-section" className="flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-bold text-stone-600 transition hover:bg-white hover:text-emerald-900 hover:shadow-sm sm:gap-2 sm:text-sm">
            {pointComplete ? <Check size={15} className="text-emerald-700" /> : <Circle size={15} />}
            <span>Titik peta</span>
          </a>
          <a href="#merchant-location-verification" className="flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-bold text-stone-600 transition hover:bg-white hover:text-emerald-900 hover:shadow-sm sm:gap-2 sm:text-sm">
            {regionComplete ? <Check size={15} className="text-emerald-700" /> : <Circle size={15} />}
            <span>Verifikasi</span>
          </a>
        </nav>

        <div className="grid gap-6">
          <div id="merchant-location-address-section" className="scroll-mt-24">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-full bg-emerald-100 text-xs font-extrabold text-emerald-900">1</span>
              <label htmlFor="merchant-location-address" className="text-sm font-bold text-stone-800">Alamat lengkap toko</label>
            </div>
            <Input id="merchant-location-address" value={address} onChange={(event) => {
              setAddress(event.target.value);
              setAddressEdited(true);
              setPoint(null);
              setLocation({});
              setError("");
              setNotice("");
            }} maxLength={2000} placeholder="Contoh: Jl. Mawar No. 12, Tegal" className="h-12" />
            <AddressLocationSearch address={address} enabled={addressEdited} onLocationSelect={selectAddressResult} />
            <p className="mt-2 text-xs text-stone-500">Masukkan alamat secara lengkap, lalu pilih saran jika tersedia.</p>
          </div>

          <div id="merchant-location-map-section" className="scroll-mt-24">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-full bg-emerald-100 text-xs font-extrabold text-emerald-900">2</span>
                <p className="text-sm font-bold text-stone-800">Tandai titik lokasi toko</p>
              </div>
              <Button type="button" variant="outline" onClick={locateDevice} disabled={isLocating || isResolving || isSaving} className="h-9 rounded-xl px-3 text-xs sm:text-sm">
                <LocateFixed size={16} />
                {isLocating ? "Mencari lokasi..." : "Gunakan lokasi saya"}
              </Button>
            </div>
            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 p-1">
              <TegalMap selectedLocation={point} onLocationSelect={(selectedPoint) => {
                setPoint(selectedPoint);
                setLocation({});
                setError("");
                setNotice("");
              }} height="20rem" />
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600">
              <p>{point ? `Koordinat: ${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}` : "Klik peta untuk menentukan lokasi."}</p>
              <p className="flex items-center gap-1"><Compass size={13} /> Pastikan titik tepat di lokasi usaha</p>
            </div>
          </div>

          <div id="merchant-location-verification" className="scroll-mt-24 rounded-2xl border border-stone-200 bg-stone-50 p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-full bg-emerald-100 text-xs font-extrabold text-emerald-900">3</span>
              <div>
                <p className="text-sm font-bold text-stone-800">Verifikasi & simpan</p>
                <p className="text-xs text-stone-500">Cek wilayah sebelum menyimpan perubahan.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="outline" onClick={() => void resolvePoint()} disabled={!point || isResolving || isSaving || isLocating} className="rounded-xl">
                <MapPin size={16} />
                {isResolving ? "Memeriksa wilayah..." : "Periksa wilayah"}
              </Button>
              <Button type="button" onClick={() => void saveLocation()} disabled={!point || !location.regency || isResolving || isSaving || isLocating} className="rounded-xl shadow-md shadow-emerald-900/15">
                <CheckCircle2 size={16} />
                {isSaving ? "Menyimpan..." : "Simpan lokasi toko"}
              </Button>
            </div>
          </div>

          {location.regency && (
            <p role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-900">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-700" />
              <span><span className="font-bold">Wilayah terverifikasi</span><br />{[location.village, location.district, location.regency, location.province].filter(Boolean).join(", ")}</span>
            </p>
          )}
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p>}
        </div>
      </div>
    </section>
  );
}
