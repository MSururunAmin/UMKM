"use client";

import type { FormEvent } from "react";
import { Clock3 } from "lucide-react";
import { AddressLocationSearch, type AddressSearchResult } from "@/components/address-location-search";
import { TegalMap, type MapPoint } from "@/components/tegal-map";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type ApplicationForm = {
  store_name: string;
  description: string;
  address: string;
  province: string;
  regency: string;
  district: string;
  village: string;
  latitude: string;
  longitude: string;
  phone: string;
};

type ApplicationEditorProps = {
  form: ApplicationForm;
  storeName: string | null;
  accountName: string;
  submitting: boolean;
  resolvingLocation: boolean;
  addressEdited: boolean;
  error: string;
  fieldErrors: Record<string, string>;
  selectedLocation: MapPoint | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  updateField: (field: keyof ApplicationForm, value: string) => void;
  selectAddressResult: (result: AddressSearchResult) => void;
  selectMapPoint: (point: MapPoint) => void;
  resolveMapPoint: () => void;
};

export function ApplicationEditor({
  form,
  storeName,
  accountName,
  submitting,
  resolvingLocation,
  addressEdited,
  error,
  fieldErrors,
  selectedLocation,
  onSubmit,
  updateField,
  selectAddressResult,
  selectMapPoint,
  resolveMapPoint,
}: ApplicationEditorProps) {
  return (
    <>
      <p className="text-sm font-bold uppercase tracking-[0.15em] text-brand-secondary">Formulir pendaftaran</p>
      <h2 className="mt-2 text-2xl font-black tracking-tight text-stone-900">{storeName ? "Perbarui pengajuan toko" : "Daftarkan toko"}</h2>
      <p className="mt-2 text-sm leading-6 text-brand-muted">Masuk sebagai <strong className="text-stone-800">{accountName}</strong>. Nomor kontak toko akan menjadi nomor kontak akun pelanggan ini juga.</p>
      {storeName && <p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><Clock3 size={17} className="mt-0.5 shrink-0" />Pengajuan masih menunggu pemeriksaan. Perubahan lokasi akan diperiksa kembali oleh administrator.</p>}
      {error && <p role="alert" className="mt-5 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        <label className="grid gap-1.5 text-sm font-semibold text-stone-700">
          Nama toko <span className="text-red-700">*</span>
          <Input required maxLength={255} autoComplete="organization" value={form.store_name} onChange={(event) => updateField("store_name", event.target.value)} aria-invalid={Boolean(fieldErrors.store_name)} />
          {fieldErrors.store_name && <span className="text-xs font-medium text-red-700">{fieldErrors.store_name}</span>}
        </label>
        <label className="grid gap-1.5 text-sm font-semibold text-stone-700">
          Deskripsi toko <span className="font-normal text-brand-muted">(opsional)</span>
          <textarea maxLength={5000} rows={4} value={form.description} onChange={(event) => updateField("description", event.target.value)} aria-invalid={Boolean(fieldErrors.description)} placeholder="Ceritakan menu dan keistimewaan tokomu..." className="w-full resize-y rounded-control border border-brand-border bg-white px-3 py-2.5 text-sm font-normal outline-none placeholder:text-stone-400 focus:border-brand-secondary focus:ring-2 focus:ring-brand-light" />
          {fieldErrors.description && <span className="text-xs font-medium text-red-700">{fieldErrors.description}</span>}
        </label>
        <label className="grid gap-1.5 text-sm font-semibold text-stone-700">
          Alamat toko <span className="text-red-700">*</span>
          <textarea required maxLength={2000} rows={3} autoComplete="street-address" value={form.address} onChange={(event) => updateField("address", event.target.value)} aria-invalid={Boolean(fieldErrors.address)} placeholder="Alamat lengkap lokasi usaha" className="w-full resize-y rounded-control border border-brand-border bg-white px-3 py-2.5 text-sm font-normal outline-none placeholder:text-stone-400 focus:border-brand-secondary focus:ring-2 focus:ring-brand-light" />
          <AddressLocationSearch address={form.address} enabled={addressEdited} onLocationSelect={selectAddressResult} />
          {fieldErrors.address && <span className="text-xs font-medium text-red-700">{fieldErrors.address}</span>}
        </label>
        <section aria-labelledby="store-location-heading" className="space-y-4 rounded-2xl border border-brand-border bg-brand-cream/80 p-4 sm:p-5">
          <div>
            <h3 id="store-location-heading" className="font-bold text-stone-900">Lokasi usaha di Tegal</h3>
            <p className="mt-1 text-xs leading-5 text-brand-muted">Ketik alamat untuk mengarahkan pin secara otomatis, atau pilih titik pada peta. Wilayah administratif dan koordinat tetap diperiksa oleh server.</p>
          </div>
          <TegalMap selectedLocation={selectedLocation} onLocationSelect={selectMapPoint} height="19rem" />
          <Button type="button" variant="outline" onClick={resolveMapPoint} disabled={!selectedLocation || resolvingLocation} className="w-full sm:w-auto">
            {resolvingLocation ? "Memeriksa titik..." : "Isi wilayah dari titik peta"}
          </Button>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold text-stone-700">
              Provinsi <span className="text-red-700">*</span>
              <select required value={form.province} onChange={(event) => updateField("province", event.target.value)} className="h-11 rounded-control border border-brand-border bg-white px-3 text-sm font-normal outline-none focus:border-brand-secondary focus:ring-2 focus:ring-brand-light">
                <option value="Jawa Tengah">Jawa Tengah</option>
              </select>
              {fieldErrors.province && <span className="text-xs font-medium text-red-700">{fieldErrors.province}</span>}
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-stone-700">
              Kabupaten/Kota <span className="text-red-700">*</span>
              <select required value={form.regency} onChange={(event) => updateField("regency", event.target.value)} className="h-11 rounded-control border border-brand-border bg-white px-3 text-sm font-normal outline-none focus:border-brand-secondary focus:ring-2 focus:ring-brand-light">
                <option value="" disabled>Pilih dari titik peta</option>
                <option value="Kota Tegal">Kota Tegal</option>
                <option value="Kabupaten Tegal">Kabupaten Tegal</option>
              </select>
              {fieldErrors.regency && <span className="text-xs font-medium text-red-700">{fieldErrors.regency}</span>}
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-stone-700">
              Kecamatan <span className="font-normal text-brand-muted">(jika tersedia di peta)</span>
              <Input maxLength={150} value={form.district} onChange={(event) => updateField("district", event.target.value)} aria-invalid={Boolean(fieldErrors.district)} placeholder="Diisi dari titik peta bila tersedia" />
              {fieldErrors.district && <span className="text-xs font-medium text-red-700">{fieldErrors.district}</span>}
              {!form.district && <span className="text-xs font-normal text-brand-muted">Sebagian titik OpenStreetMap tidak mencantumkan kecamatan. Wilayah tetap diperiksa dari koordinat.</span>}
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-stone-700">
              Kelurahan/Desa <span className="text-red-700">*</span>
              <Input required maxLength={150} value={form.village} onChange={(event) => updateField("village", event.target.value)} aria-invalid={Boolean(fieldErrors.village)} placeholder="Diisi dari titik peta" />
              {fieldErrors.village && <span className="text-xs font-medium text-red-700">{fieldErrors.village}</span>}
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-stone-700">
              Latitude <span className="text-red-700">*</span>
              <Input required type="number" step="any" min="-90" max="90" readOnly value={form.latitude} aria-invalid={Boolean(fieldErrors.latitude)} />
              {fieldErrors.latitude && <span className="text-xs font-medium text-red-700">{fieldErrors.latitude}</span>}
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-stone-700">
              Longitude <span className="text-red-700">*</span>
              <Input required type="number" step="any" min="-180" max="180" readOnly value={form.longitude} aria-invalid={Boolean(fieldErrors.longitude)} />
              {fieldErrors.longitude && <span className="text-xs font-medium text-red-700">{fieldErrors.longitude}</span>}
            </label>
          </div>
          <p className="text-xs leading-5 text-brand-muted">OpenStreetMap menyediakan pemeriksaan lokasi berbasis data komunitas. Administrator tetap meninjau informasi dan titik toko sebelum persetujuan.</p>
        </section>
        <label className="grid gap-1.5 text-sm font-semibold text-stone-700">
          Nomor kontak
          <Input type="tel" autoComplete="tel" maxLength={30} value={form.phone} onChange={(event) => updateField("phone", event.target.value)} aria-invalid={Boolean(fieldErrors.phone)} placeholder="Contoh: 0812..." />
          {fieldErrors.phone && <span className="text-xs font-medium text-red-700">{fieldErrors.phone}</span>}
        </label>
        <p className="text-xs leading-5 text-brand-muted">Foto toko belum didukung pada formulir pendaftaran ini.</p>
        <Button type="submit" size="lg" className="w-full" disabled={submitting || resolvingLocation}>{submitting ? "Mengirim pengajuan..." : storeName ? "Simpan perubahan untuk ditinjau" : "Kirim untuk ditinjau"}</Button>
      </form>
    </>
  );
}
